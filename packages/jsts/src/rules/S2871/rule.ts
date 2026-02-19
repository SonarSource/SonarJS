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
import ts from 'typescript';
import type estree from 'estree';
import {
  copyingSortLike,
  generateMeta,
  getParent,
  getTypeFromTreeNode,
  isArrayLikeType,
  isBigIntArray,
  isNumberArray,
  isRequiredParserServices,
  isStringArray,
  sortLike,
} from '../helpers/index.js';
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
const languageSensitiveOrderPlaceholder = '(a, b) => a.localeCompare(b)';

const sortMethodNames = new Set([...sortLike, ...copyingSortLike]);

function containsSortCall(node: estree.Node): boolean {
  if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
    const property = node.callee.property;
    if (property.type === 'Identifier' && sortMethodNames.has(property.name)) {
      return true;
    }
    return containsSortCall(node.callee.object);
  }
  if (node.type === 'MemberExpression') {
    return containsSortCall(node.object);
  }
  return false;
}

function isArrayFromIterator(object: estree.CallExpression): boolean {
  const callee = object.callee;
  if (
    callee.type !== 'MemberExpression' ||
    callee.object.type !== 'Identifier' ||
    callee.object.name !== 'Array' ||
    callee.property.type !== 'Identifier' ||
    callee.property.name !== 'from' ||
    object.arguments.length === 0
  ) {
    return false;
  }
  const firstArg = object.arguments[0];
  if (firstArg.type !== 'CallExpression' || firstArg.callee.type !== 'MemberExpression') {
    return false;
  }
  const methodProp = firstArg.callee.property;
  return (
    methodProp.type === 'Identifier' && ['keys', 'values', 'entries'].includes(methodProp.name)
  );
}

function isObjectKeys(object: estree.CallExpression): boolean {
  const callee = object.callee;
  return (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'Object' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'keys'
  );
}

function isFromKnownStringSource(object: estree.Node): boolean {
  if (object.type !== 'CallExpression') {
    return false;
  }
  return isArrayFromIterator(object) || isObjectKeys(object);
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

        if (sortMethodNames.has(text) && isArrayLikeType(type, services)) {
          // Suppress when sort() is used in patterns where default sorting is intentional
          if (isFromKnownStringSource(object)) {
            return;
          }

          // Suppress for string arrays in order-independent comparisons
          if (isStringArray(type, services) && isOrderIndependentComparison(call)) {
            return;
          }

          const suggest = getSuggestions(call, type);
          const messageId = getMessageId(type);
          context.report({ node, suggest, messageId });
        }
      },
    };

    function isOrderIndependentComparison(call: estree.CallExpression): boolean {
      // Walk up the AST to find a BinaryExpression ancestor
      let currentNode: estree.Node = call;
      let parent = getParent(context, currentNode);

      while (parent) {
        if (parent.type === 'BinaryExpression') {
          const operator = parent.operator;
          if (['===', '==', '!==', '!='].includes(operator)) {
            // Check if both sides contain sort() calls
            const leftHasSort = containsSortCall(parent.left);
            const rightHasSort = containsSortCall(parent.right);

            if (leftHasSort && rightHasSort) {
              return true;
            }
          }
          // If we hit a comparison but it doesn't match the pattern, stop
          return false;
        }

        // Stop at certain node types that indicate we're not in a comparison chain
        if (
          parent.type === 'ExpressionStatement' ||
          parent.type === 'VariableDeclarator' ||
          parent.type === 'AssignmentExpression' ||
          parent.type === 'ReturnStatement' ||
          parent.type === 'IfStatement'
        ) {
          return false;
        }

        currentNode = parent;
        parent = getParent(context, currentNode);
      }

      return false;
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
