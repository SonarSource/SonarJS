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

import type { Rule, Scope } from 'eslint';
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
import { isRequiredParserServices } from '../helpers/parser-services.js';
import { isCallingMethod, isIdentifier } from '../helpers/ast.js';
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
  return (
    arg?.type === 'CallExpression' &&
    arg.callee.type === 'MemberExpression' &&
    arg.callee.property.type === 'Identifier' &&
    arg.callee.property.name === 'keys'
  );
}

/**
 * Checks if the array being sorted comes from Object.keys, Object.getOwnPropertyNames,
 * or Array.from(x.keys()) patterns
 */
function isArrayFromKeyOrEntryCall(node: estree.Node): boolean {
  return isObjectStaticKeyCall(node) || isArrayFromIterableMethod(node);
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

const functionBoundaryTypes = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

function findVariableInScope(
  identifier: estree.Identifier,
  sourceCode: Rule.RuleContext['sourceCode'],
): Scope.Variable | undefined {
  let variable: Scope.Variable | undefined;
  let currentScope: Scope.Scope | null = sourceCode.getScope(identifier);
  while (currentScope && !variable) {
    variable = currentScope.variables.find(v => v.name === identifier.name);
    currentScope = currentScope.upper;
  }
  return variable;
}

function isInsideForIn(startNode: estree.Node): boolean {
  let current: estree.Node | undefined = getNodeParent(startNode);
  while (current) {
    if (current.type === 'ForInStatement') {
      return true;
    }
    if (functionBoundaryTypes.has(current.type)) {
      return false;
    }
    current = getNodeParent(current);
  }
  return false;
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
  const variable = findVariableInScope(identifier, sourceCode);
  if (variable?.defs.length !== 1) {
    return false;
  }

  const def = variable.defs[0];
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

    if (
      prop.type !== 'Identifier' ||
      prop.name !== 'push' ||
      callParent?.type !== 'CallExpression'
    ) {
      return false; // non-push method call on the array - reject
    }

    // push() call - must be inside a for-in statement (not crossing function boundaries)
    if (!isInsideForIn(callParent)) {
      return false; // push outside for-in - reject
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
      suggestNumericOrder: 'Add a comparator function to sort in ascending order',
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
          if (isArrayFromKeyOrEntryCall(object)) {
            return;
          }
          // var arr = []; for (var key in obj) arr.push(key); arr.sort()
          if (object.type === 'Identifier' && isForInKeyArray(object, sourceCode)) {
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

        // Suppress for string arrays — covers Object.keys(), Array.from(map.keys()),
        // for-in key collections, and all other contexts where TypeScript infers string[]
        if (isStringArray(type, services)) {
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
