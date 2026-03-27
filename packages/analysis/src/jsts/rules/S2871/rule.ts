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

function isObjectStaticKeyCall(node: estree.Node): boolean {
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
 * Checks if an identifier refers to a variable initialized directly from
 * Object.keys()/Object.getOwnPropertyNames() that was never subsequently
 * reassigned.
 * Pattern: const ka = Object.keys(a); ... ka.sort()
 */
function isObjectKeysVariable(
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
  if (!isObjectStaticKeyCall(def.node.init)) {
    return false;
  }
  return !variable.references.some(ref => !ref.init && ref.isWrite());
}

function isArrayFromIterableMethod(node: estree.Node): boolean {
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
 * Checks if the sorted array is provably a technical string collection where
 * default alphabetical ordering is intentional (Object keys, for-in key arrays).
 * Used in both the no-type-checker and type-checker paths.
 * Does NOT include Array.from(x.keys()) — that requires type info to distinguish
 * Map<string,...>.keys() from numeric array .keys() and other iterables.
 */
function isTechnicalStringSort(
  object: estree.Node,
  sourceCode: Rule.RuleContext['sourceCode'],
): boolean {
  return (
    isObjectStaticKeyCall(object) ||
    (object.type === 'Identifier' &&
      (isForInKeyArray(object, sourceCode) || isObjectKeysVariable(object, sourceCode)))
  );
}

/**
 * Checks if the node is Array.from(receiver.keys()) where receiver is a built-in Map.
 * Only valid when the type checker is available. Suppresses sort() on Map keys,
 * which are technical strings where default alphabetical ordering is intentional.
 * Does NOT suppress Set<string>.keys() or custom .keys() methods.
 */
function isArrayFromMapStringKeysCall(
  object: estree.Node,
  services: RequiredParserServices,
): boolean {
  if (!isArrayFromIterableMethod(object)) {
    return false;
  }
  const callExpr = object as estree.CallExpression;
  const arg = callExpr.arguments[0] as estree.CallExpression;
  const innerReceiver = (arg.callee as estree.MemberExpression).object;
  const receiverType = getTypeFromTreeNode(innerReceiver, services);
  return receiverType.symbol?.name === 'Map';
}

/**
 * Checks if the sort() call is part of an order-independent comparison
 * e.g., arr1.sort() === arr2.sort()
 */
function isInOrderIndependentComparison(parent: estree.Node | undefined): boolean {
  if (parent?.type !== 'BinaryExpression') {
    return false;
  }
  return ['===', '!==', '==', '!='].includes(parent.operator);
}

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
 * Verifies that a call expression is arr.push(loopVar) inside a for-in loop
 * where loopVar is the for-in iteration variable.
 */
function isForInKeyPush(callParent: estree.CallExpression): boolean {
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
 * Checks if an identifier refers to a variable that was initialized as an empty array
 * and is only populated by pushing items from for-in loop iterations.
 * Pattern: var arr = []; for (var key in obj) arr.push(key); arr.sort()
 * This is semantically equivalent to Object.keys() and safe for default sort.
 */
function isForInKeyArray(
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
    const refId = ref.identifier;
    const memberParent = getNodeParent(refId);

    // If reference is not used as object of a method call, check if it's a write (reassignment)
    if (memberParent?.type !== 'MemberExpression' || memberParent.object !== refId) {
      if (ref.isWrite()) {
        return false; // reassignment invalidates the pattern
      }
      continue;
    }

    // Reference is object of a member expression - check if it's a push() call
    const prop = memberParent.property;
    const callParent = getNodeParent(memberParent);

    if (callParent?.type !== 'CallExpression') {
      // Reject index-assignment mutations: arr[i] = value
      if (callParent?.type === 'AssignmentExpression' && callParent.left === memberParent) {
        return false;
      }
      continue; // genuine property read (e.g. arr.length, arr[0]) — safe to ignore
    }
    if (prop.type !== 'Identifier' || prop.name !== 'push') {
      return false; // non-push method call on the array - reject
    }

    // push() call - must be inside a for-in loop, pushing the loop variable
    if (!isForInKeyPush(callParent as estree.CallExpression)) {
      return false;
    }

    hasForInPush = true;
  }

  return hasForInPush; // must have at least one for-in push to confirm the pattern
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
        const parent = getNodeParent(call);
        if (isInOrderIndependentComparison(parent)) {
          return;
        }

        if (!hasTypeChecker) {
          // No type checker: fall back to AST-based suppression for known string-returning patterns
          if (isTechnicalStringSort(object, sourceCode)) {
            return;
          }
          context.report({ node, messageId: 'provideCompareFunction' });
          return;
        }

        // TypeScript type checker available: use type information for precise suppression
        const type = getTypeFromTreeNode(object, services);
        if (!isArrayLikeType(type, services)) {
          return;
        }

        // For string arrays, suppress only provably technical cases where default
        // alphabetical ordering is clearly intentional; report everything else
        // with a localeCompare suggestion.
        if (isStringArray(type, services)) {
          if (
            isTechnicalStringSort(object, sourceCode) ||
            isArrayFromMapStringKeysCall(object, services)
          ) {
            return; // safe: provably technical strings
          }
          context.report({
            node,
            suggest: getSuggestions(call, type),
            messageId: 'provideCompareFunctionForArrayOfStrings',
          });
          return;
        }

        const suggest = getSuggestions(call, type);
        context.report({ node, suggest, messageId: 'provideCompareFunction' });
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
