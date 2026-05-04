/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import { getNodeParent } from '../helpers/ancestor.js';
import { copyingSortLike, sortLike } from '../helpers/collection.js';
import { generateMeta } from '../helpers/generate-meta.js';
import {
  getTypeFromTreeNode,
  isArrayLikeType,
  isBigIntArray,
  isBooleanArray,
  isNumberArray,
  isStringArray,
} from '../helpers/type.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import * as meta from './generated-meta.js';

const allSortLike = new Set([...sortLike, ...copyingSortLike]);
const equalityOperators = new Set(['==', '!=', '===', '!==']);

type BareSortInfo = {
  methodName: string;
  receiver: estree.Node;
};

// Matches JSON.stringify(<expr>) — exactly one argument, non-computed property access.
// Does not match: JSON.stringify(x, replacer, space), JSON['stringify'](x), myObj.stringify(x).
function isJsonStringifyCall(node: estree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const callExpr = node as estree.CallExpression;
  if (callExpr.arguments.length !== 1) {
    return false;
  }
  const callee = callExpr.callee;
  if (callee.type !== 'MemberExpression') {
    return false;
  }
  return (
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'JSON' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'stringify'
  );
}

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

        if (allSortLike.has(text) && isArrayLikeType(type, services)) {
          if (isJsonStringifySortComparison(call)) {
            return;
          }
          const suggest = getSuggestions(call, type);
          const messageId = getMessageId(type);
          context.report({ node, suggest, messageId });
        }
      },
    };

    // Matches JSON.stringify(arr.sort()) == JSON.stringify(arr.sort()) or
    // JSON.stringify(arr.toSorted()) == JSON.stringify(arr.toSorted()) when both
    // sides use the same sort family over primitive arrays with known-safe
    // default sort semantics (number, string, boolean, bigint).
    function isJsonStringifySortComparison(call: estree.CallExpression): boolean {
      const parent = getNodeParent(call);
      if (!isJsonStringifyCall(parent) || (parent as estree.CallExpression).arguments[0] !== call) {
        return false;
      }
      const grandparent = getNodeParent(parent);
      if (grandparent.type !== 'BinaryExpression' || !equalityOperators.has(grandparent.operator)) {
        return false;
      }
      const sibling = grandparent.left === parent ? grandparent.right : grandparent.left;
      if (!isJsonStringifyCall(sibling)) {
        return false;
      }

      const callInfo = getBareSortInfo(call);
      const siblingInfo = getBareSortInfo((sibling as estree.CallExpression).arguments[0]);
      if (callInfo === null || siblingInfo === null) {
        return false;
      }

      return (
        callInfo.methodName === siblingInfo.methodName &&
        isPrimitiveSortReceiver(callInfo.receiver) &&
        isPrimitiveSortReceiver(siblingInfo.receiver)
      );
    }

    function getBareSortInfo(node: estree.Node): BareSortInfo | null {
      if (node.type !== 'CallExpression') {
        return null;
      }
      const callExpr = node as estree.CallExpression;
      if (callExpr.arguments.length !== 0) {
        return null;
      }
      if (callExpr.callee.type !== 'MemberExpression') {
        return null;
      }
      const callee = callExpr.callee;
      const text = sourceCode.getText(callee.property);
      if (!allSortLike.has(text)) {
        return null;
      }
      const receiverType = getTypeFromTreeNode(callee.object, services);
      if (!isArrayLikeType(receiverType, services)) {
        return null;
      }
      return {
        methodName: text,
        receiver: callee.object,
      };
    }

    function isPrimitiveSortReceiver(receiver: estree.Node): boolean {
      const receiverType = getTypeFromTreeNode(receiver, services);
      return (
        isNumberArray(receiverType, services) ||
        isBigIntArray(receiverType, services) ||
        isStringArray(receiverType, services) ||
        isBooleanArray(receiverType, services)
      );
    }

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

    function fixer(call: estree.CallExpression, ...placeholder: string[]): Rule.ReportFixer {
      const closingParenthesis = sourceCode.getLastToken(call, token => token.value === ')')!;
      const indent = ' '.repeat(call.loc?.start.column!);
      const text = placeholder.join(`\n${indent}`);
      return fixer => fixer.insertTextBefore(closingParenthesis, text);
    }
  },
};
