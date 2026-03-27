/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S2871/javascript

import type { Rule } from 'eslint';
import type ts from 'typescript';
import type estree from 'estree';
import { copyingSortLike, sortLike } from '../helpers/collection.js';
import { generateMeta } from '../helpers/generate-meta.js';
import {
  getTypeFromTreeNode,
  isArrayLikeType,
  isBigIntArray,
  isNumberArray,
  isStringArray,
} from '../helpers/type.js';
import {
  isRequiredParserServices,
  type RequiredParserServices,
} from '../helpers/parser-services.js';
import {
  functionLike,
  getVariableFromScope,
  isCallingMethod,
  isIdentifier,
} from '../helpers/ast.js';
import { getNodeParent } from '../helpers/ancestor.js';
import * as meta from './generated-meta.js';

const compareNumberFunctionPlaceholder = '(a, b) => (a - b)';
const compareBigIntFunctionPlaceholder = [
  '(a, b) => {',
  '  if (a < b) {',
  '    return -1;',
  '  } else if (a > b) {',
  '    return 1;',
  '  } else {',
  '    return 0;',
  '  }',
  '}',
];

/**
 * Checks for Object.keys(...) or Object.getOwnPropertyNames(...).
 * Detection: AST only.
 * Pseudo-code:
 *   Object.keys(obj)
 *   Object.getOwnPropertyNames(obj)
 */
function isObjectKeyExtractionCall(node: estree.Node): boolean {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'Object' &&
    node.callee.property.type === 'Identifier' &&
    ['keys', 'getOwnPropertyNames'].includes(node.callee.property.name)
  );
}

/**
 * Checks whether an identifier refers to the result of
 * Object.keys()/Object.getOwnPropertyNames().
 * Detection: AST only.
 * Pseudo-code:
 *   const keys = Object.keys(obj);
 *   keys.sort()
 */
function isObjectKeyExtractionVariable(
  identifier: estree.Identifier,
  sourceCode: Rule.RuleContext['sourceCode'],
): boolean {
  const variable = getVariableFromScope(sourceCode.getScope(identifier), identifier.name);
  if (variable?.defs.length !== 1) {
    return false;
  }
  const def = variable.defs[0];
  // 'Variable' = ESLint scope type for var/let/const declarations (not parameters, import bindings, etc.)
  if (def.type !== 'Variable' || !def.node.init) {
    return false;
  }
  if (!isObjectKeyExtractionCall(def.node.init)) {
    return false;
  }
  return !variable.references.some(ref => !ref.init && ref.isWrite());
}

/**
 * Finds the nearest enclosing for-in loop.
 * Detection: AST only.
 * Pseudo-code:
 *   for (const key in obj) { ... }
 */
function getEnclosingForIn(startNode: estree.Node): estree.ForInStatement | null {
  let current: estree.Node | undefined = getNodeParent(startNode);
  while (current) {
    if (current.type === 'ForInStatement') {
      return current;
    }
    if (functionLike.has(current.type)) {
      // e.g. function f() {}, () => {}, method — stop at scope boundary
      return null;
    }
    current = getNodeParent(current);
  }
  return null;
}

/**
 * Checks for keys.push(key) inside a for-in loop.
 * Detection: AST only.
 * Pseudo-code:
 *   for (const key in obj) {
 *     keys.push(key)
 *   }
 */
function isForInVariablePushCall(callParent: estree.CallExpression): boolean {
  const forIn = getEnclosingForIn(callParent);
  if (!forIn) {
    return false;
  }
  // for (var key in obj) → left is VariableDeclaration, extract the declared id
  // for (key in obj)     → left is the Identifier directly (pre-declared variable)
  const loopVar =
    forIn.left.type === 'VariableDeclaration' ? forIn.left.declarations[0].id : forIn.left;
  const pushArg = callParent.arguments[0];
  return (
    callParent.arguments.length === 1 &&
    pushArg?.type === 'Identifier' &&
    loopVar.type === 'Identifier' &&
    pushArg.name === loopVar.name
  );
}

/**
 * Classifies a reference while checking the for-in key-array pattern.
 * Detection: AST only.
 * Pseudo-code:
 *   keys.push(key)   -> forInPush
 *   keys = other     -> invalid
 *   keys.length      -> skip
 */
function classifyForInKeyRef(ref: {
  identifier: estree.Identifier;
  isWrite: () => boolean;
}): 'forInPush' | 'invalid' | 'skip' {
  const refId = ref.identifier;
  const memberParent = getNodeParent(refId);

  // If reference is not used as object of a member expression, check if it's a reassignment
  if (memberParent?.type !== 'MemberExpression' || memberParent.object !== refId) {
    if (ref.isWrite()) {
      return 'invalid'; // reassignment invalidates the pattern
    }
    return 'skip';
  }

  const prop = memberParent.property;
  const callParent = getNodeParent(memberParent);

  if (callParent?.type !== 'CallExpression') {
    // Reject index-assignment mutations: arr[i] = value
    if (callParent?.type === 'AssignmentExpression' && callParent.left === memberParent) {
      return 'invalid';
    }
    return 'skip'; // genuine property read (e.g. arr.length, arr[0]) — safe to ignore
  }
  if (prop.type !== 'Identifier' || prop.name !== 'push') {
    return 'invalid'; // non-push method call on the array — reject
  }

  // push() call - must be inside a for-in loop, pushing the loop variable
  if (!isForInVariablePushCall(callParent as estree.CallExpression)) {
    return 'invalid';
  }
  return 'forInPush';
}

/**
 * Checks whether an identifier refers to an array filled from for-in keys.
 * Detection: AST only.
 * Pseudo-code:
 *   const keys = [];
 *   for (const key in obj) {
 *     keys.push(key);
 *   }
 *   keys.sort()
 */
function isForInKeyCollection(
  identifier: estree.Identifier,
  sourceCode: Rule.RuleContext['sourceCode'],
): boolean {
  const variable = getVariableFromScope(sourceCode.getScope(identifier), identifier.name);
  if (variable?.defs.length !== 1) {
    return false;
  }

  const def = variable.defs[0];
  // 'Variable' = ESLint scope type for var/let/const declarations
  if (def.type !== 'Variable') {
    return false;
  }

  // Must be initialized as an empty array
  const decl = def.node;
  if (decl.init?.type !== 'ArrayExpression' || decl.init.elements.length !== 0) {
    return false;
  }

  // Check all references except init and the current sort() call
  const otherRefs = variable.references.filter(ref => !ref.init && ref.identifier !== identifier);

  let hasForInPush = false;
  for (const ref of otherRefs) {
    const result = classifyForInKeyRef(ref);
    if (result === 'invalid') {
      return false;
    }
    if (result === 'forInPush') {
      hasForInPush = true;
    }
  }

  return hasForInPush; // must have at least one for-in push to confirm the pattern
}

/**
 * Checks whether a value is an object-key collection.
 * Detection: AST only.
 * Pseudo-code:
 *   Object.keys(obj).sort()
 *   const keys = [];
 *   for (const key in obj) { keys.push(key); }
 *   keys.sort()
 *
 * Does not include Array.from(x.keys()), because that requires type
 * information to distinguish Map<string, ...>.keys() from other iterables.
 */
function isObjectKeyCollection(
  object: estree.Node,
  sourceCode: Rule.RuleContext['sourceCode'],
): boolean {
  return (
    isObjectKeyExtractionCall(object) ||
    (object.type === 'Identifier' &&
      (isForInKeyCollection(object, sourceCode) ||
        isObjectKeyExtractionVariable(object, sourceCode)))
  );
}

/**
 * Checks for Array.from(x.keys()).
 * Detection: AST only.
 * Pseudo-code:
 *   Array.from(collection.keys())
 */
function isArrayFromKeysCall(node: estree.Node): boolean {
  if (
    node.type !== 'CallExpression' ||
    !isCallingMethod(node as estree.CallExpression, 1, 'from')
  ) {
    return false;
  }
  const callExpr = node as estree.CallExpression;
  // isCallingMethod guarantees callee is a MemberExpression; verify receiver is specifically Array
  const callee = callExpr.callee as estree.MemberExpression;
  if (!isIdentifier(callee.object, 'Array')) {
    return false;
  }
  const arg = callExpr.arguments[0];
  // e.g. Array.from(map.keys()) — argument must be a .keys() call
  return (
    arg?.type === 'CallExpression' &&
    arg.callee.type === 'MemberExpression' &&
    arg.callee.property.type === 'Identifier' &&
    arg.callee.property.name === 'keys'
  );
}

/**
 * Checks for Array.from(map.keys()) when map is a built-in Map.
 * Detection: AST + type checker.
 * Pseudo-code:
 *   Array.from(map.keys())
 *
 * Does not suppress Set<string>.keys() or custom .keys() methods.
 */
function isArrayFromMapStringKeysCall(
  object: estree.Node,
  services: RequiredParserServices,
): boolean {
  if (!isArrayFromKeysCall(object)) {
    return false;
  }
  const callExpr = object as estree.CallExpression;
  const arg = callExpr.arguments[0] as estree.CallExpression;
  const innerReceiver = (arg.callee as estree.MemberExpression).object;
  const receiverType = getTypeFromTreeNode(innerReceiver, services);
  return receiverType.symbol?.name === 'Map';
}

/**
 * Checks for .sort() or .toSorted() with no arguments.
 * Detection: AST only.
 * Pseudo-code:
 *   arr.sort()
 *   arr.toSorted()
 */
function isSortLikeCall(node: estree.Node): boolean {
  return (
    node.type === 'CallExpression' &&
    node.arguments.length === 0 &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    ['sort', 'toSorted'].includes(node.callee.property.name)
  );
}

/**
 * Checks for a comparison like left.sort() === right.sort().
 * Detection: AST only.
 * Pseudo-code:
 *   left.sort() === right.sort()
 */
function isInOrderIndependentComparison(call: estree.CallExpression): boolean {
  const parent = getNodeParent(call);
  if (parent?.type !== 'BinaryExpression') {
    return false;
  }
  if (!['===', '!==', '==', '!='].includes(parent.operator)) {
    return false;
  }
  const other = parent.left === call ? parent.right : parent.left;
  return isSortLikeCall(other);
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    hasSuggestions: true,
    messages: {
      provideCompareFunction:
        'Provide a compare function to avoid sorting elements alphabetically.',
      provideCompareFunctionForArrayOfStrings:
        'Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.',
      suggestNumericOrder: 'Add a comparator function to sort in ascending order',
      suggestLanguageSensitiveOrder:
        'Add a comparator function to sort in a language-sensitive way',
    },
  }),
  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    const services = context.sourceCode.parserServices;
    const hasTypeChecker = isRequiredParserServices(services);

    return {
      'CallExpression[arguments.length=0][callee.type="MemberExpression"]': (
        call: estree.CallExpression,
      ) => {
        const { object, property: node } = call.callee as estree.MemberExpression;
        const text = sourceCode.getText(node);

        if (![...sortLike, ...copyingSortLike].includes(text)) {
          return;
        }

        // AST-based suppression: order-independent comparison (a.sort() === b.sort())
        // This is pattern-based, not type-based, so it applies regardless of type checker availability
        if (isInOrderIndependentComparison(call)) {
          return;
        }

        if (isObjectKeyCollection(object, sourceCode)) {
          return;
        }

        if (!hasTypeChecker) {
          context.report({ node, messageId: 'provideCompareFunction' });
          return;
        }

        // TypeScript type checker available: use type information for precise suppression
        const type = getTypeFromTreeNode(object, services);
        if (!isArrayLikeType(type, services)) {
          return;
        }

        const suggest = getSuggestions(call, type);

        // For string arrays, suppress only provably technical cases where default
        // alphabetical ordering is clearly intentional; report everything else
        // with a localeCompare suggestion.
        if (!isStringArray(type, services)) {
          context.report({ node, suggest, messageId: 'provideCompareFunction' });
          return;
        }

        if (isArrayFromMapStringKeysCall(object, services)) {
          return; // safe: provably technical strings
        }

        context.report({ node, suggest, messageId: 'provideCompareFunctionForArrayOfStrings' });
      },
    };

    function getSuggestions(call: estree.CallExpression, type: ts.Type) {
      const suggestions: Rule.SuggestionReportDescriptor[] = [];
      if (isNumberArray(type, services)) {
        suggestions.push({
          messageId: 'suggestNumericOrder',
          fix: fixer(call, compareNumberFunctionPlaceholder),
        });
      } else if (isBigIntArray(type, services)) {
        suggestions.push({
          messageId: 'suggestNumericOrder',
          fix: fixer(call, ...compareBigIntFunctionPlaceholder),
        });
      } else if (isStringArray(type, services)) {
        suggestions.push({
          messageId: 'suggestLanguageSensitiveOrder',
          fix: fixer(call, '(a, b) => a.localeCompare(b)'),
        });
      }
      return suggestions;
    }

    function fixer(call: estree.CallExpression, ...placeholder: string[]): Rule.ReportFixer {
      const closingParenthesis = sourceCode.getLastToken(call, token => token.value === ')')!;
      const indent = ' '.repeat(call.loc?.start.column!);
      const text = placeholder.join(`\n${indent}`);
      return fixer => fixer.insertTextBefore(closingParenthesis, text);
    }
  },
};
