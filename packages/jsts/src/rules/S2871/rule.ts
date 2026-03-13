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
import { isRequiredParserServices } from '../helpers/parser-services.js';
import { isCallingMethod } from '../helpers/ast.js';
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
 * Checks if the array being sorted comes from Object.keys, Object.getOwnPropertyNames,
 * Map.keys(), Map.entries(), or similar string-returning methods
 */
function isArrayFromKeyOrEntryCall(node: estree.Node): boolean {
  // Object.keys().sort() or Object.getOwnPropertyNames().sort()
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'Object' &&
    node.callee.property.type === 'Identifier'
  ) {
    const methodName = node.callee.property.name;
    if (['keys', 'getOwnPropertyNames', 'getOwnPropertySymbols'].includes(methodName)) {
      return true;
    }
  }

  // Array.from(map.keys()).sort() or similar
  if (node.type === 'CallExpression' && isCallingMethod(node as estree.CallExpression, 1, 'from')) {
    const arg = (node as estree.CallExpression).arguments[0];
    if (
      arg &&
      arg.type === 'CallExpression' &&
      arg.callee.type === 'MemberExpression' &&
      arg.callee.property.type === 'Identifier'
    ) {
      const innerMethodName = arg.callee.property.name;
      if (['keys', 'entries', 'values'].includes(innerMethodName)) {
        return true;
      }
    }
  }

  // [...map.keys()].sort() or similar
  if (node.type === 'SpreadElement' && node.argument.type === 'CallExpression') {
    const call = node.argument as estree.CallExpression;
    if (call.callee.type === 'MemberExpression' && call.callee.property.type === 'Identifier') {
      const methodName = call.callee.property.name;
      if (['keys', 'entries', 'values'].includes(methodName)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if the sort() call is part of an order-independent comparison
 * e.g., arr1.sort() === arr2.sort()
 */
function isInOrderIndependentComparison(parent: estree.Node | undefined): boolean {
  if (!parent || parent.type !== 'BinaryExpression') {
    return false;
  }
  const binaryExpr = parent as estree.BinaryExpression;
  return ['===', '!==', '==', '!='].includes(binaryExpr.operator);
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
    if (!isRequiredParserServices(services)) {
      return {};
    }

    return {
      'CallExpression[arguments.length=0][callee.type="MemberExpression"]': (
        call: estree.CallExpression,
      ) => {
        const { object, property: node } = call.callee as estree.MemberExpression;
        const text = sourceCode.getText(node);
        const type = getTypeFromTreeNode(object, services);

        if ([...sortLike, ...copyingSortLike].includes(text) && isArrayLikeType(type, services)) {
          // Suppress for string arrays (TypeScript type analysis)
          if (isStringArray(type, services)) {
            // TypeScript knows the values are strings; default alphabetical sort is intentional
            return;
          }

          // Suppress for known string-producing patterns
          if (isArrayFromKeyOrEntryCall(object)) {
            // Array from Object.keys(), Map.keys(), etc. - always strings
            return;
          }

          // Suppress for order-independent comparisons (a.sort() === b.sort())
          const parent = getNodeParent(call);
          if (isInOrderIndependentComparison(parent)) {
            // Order-independent comparison where alphabetical sort is intentional
            return;
          }

          const suggest = getSuggestions(call, type);
          context.report({ node, suggest, messageId: 'provideCompareFunction' });
        }
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
