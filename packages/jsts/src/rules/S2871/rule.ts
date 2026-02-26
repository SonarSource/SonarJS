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
import {
  copyingSortLike,
  generateMeta,
  getNodeParent,
  getTypeFromTreeNode,
  isArrayLikeType,
  isBigIntArray,
  isCallingMethod,
  isIdentifier,
  isNumberArray,
  isRequiredParserServices,
  isStringArray,
  sortLike,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

const ORDER_INDEPENDENT_OPERATORS = new Set(['===', '!==', '==', '!=']);

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
const languageSensitiveOrderPlaceholder = '(a, b) => a.localeCompare(b)';

function isObjectKeysCall(node: estree.Node): boolean {
  return (
    node.type === 'CallExpression' &&
    isCallingMethod(node, 1, 'keys') &&
    isIdentifier(node.callee.object, 'Object')
  );
}

function isArrayFromKeysOrEntries(node: estree.Node): boolean {
  // Matches Array.from(iterable.keys()), Array.from(iterable.entries()), etc.
  if (
    node.type !== 'CallExpression' ||
    !isCallingMethod(node, 1, 'from') ||
    !isIdentifier(node.callee.object, 'Array')
  ) {
    return false;
  }
  const firstArg = node.arguments[0];
  return (
    firstArg.type === 'CallExpression' && isCallingMethod(firstArg, 0, 'keys', 'entries', 'values')
  );
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
        'Add a comparator function to sort in ascending language-sensitive order',
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
          if (isSuppressedSort(call, object, type)) {
            return;
          }
          const suggest = getSuggestions(call, type);
          const messageId = getMessageId(type);
          context.report({ node, suggest, messageId });
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
      } else if (isStringArray(type, services)) {
        suggestions.push({
          messageId: 'suggestLanguageSensitiveOrder',
          fix: fixer(call, languageSensitiveOrderPlaceholder),
        });
      }
      return suggestions;
    }

    function getMessageId(type: ts.Type) {
      if (isStringArray(type, services)) {
        return 'provideCompareFunctionForArrayOfStrings';
      }

      return 'provideCompareFunction';
    }

    function isSuppressedSort(call: estree.CallExpression, object: estree.Node, type: ts.Type) {
      // Suppress when sort() is used for order-independent comparison (e.g., a.sort() === b.sort())
      if (isStringArray(type, services)) {
        const parent = getNodeParent(call);
        if (
          parent.type === 'BinaryExpression' &&
          ORDER_INDEPENDENT_OPERATORS.has(parent.operator)
        ) {
          return true;
        }
      }

      // Suppress when array comes from Object.keys(), Map.keys(), or Map.entries()
      return isObjectKeysCall(object) || isArrayFromKeysOrEntries(object);
    }

    function fixer(call: estree.CallExpression, ...placeholder: string[]): Rule.ReportFixer {
      const closingParenthesis = sourceCode.getLastToken(call, token => token.value === ')')!;
      const indent = ' '.repeat(call.loc?.start.column!);
      const text = placeholder.join(`\n${indent}`);
      return fixer => fixer.insertTextBefore(closingParenthesis, text);
    }
  },
};
