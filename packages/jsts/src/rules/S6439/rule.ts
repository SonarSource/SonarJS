/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
// https://sonarsource.github.io/rspec/#/rspec/S6439/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  getTypeFromTreeNode,
  isBigIntType,
  isNumberType,
  isRequiredParserServices,
  isStringType,
} from '../helpers';

const detectReactNativeSelector = [
  ':matches(',
  [
    'CallExpression[callee.name="require"][arguments.0.value="react-native"]',
    'ImportDeclaration[source.value="react-native"]',
  ].join(','),
  ')',
].join('');

export const rule: Rule.RuleModule = {
  meta: {
    hasSuggestions: true,
    messages: {
      nonBooleanMightRender: 'Convert the conditional to a boolean to avoid leaked value',
      suggestConversion: 'Convert the conditional to a boolean',
    },
  },
  create(context: Rule.RuleContext) {
    if (!isRequiredParserServices(context.parserServices)) {
      return {};
    }
    let usesReactNative = false;

    return {
      [detectReactNativeSelector]() {
        usesReactNative = true;
      },
      'JSXExpressionContainer > LogicalExpression[operator="&&"]'(node: estree.LogicalExpression) {
        const leftSide = node.left;
        checkNonBoolean(context, usesReactNative ? isStringOrNumber : isNumber, leftSide);
      },
    };
  },
};

function report(node: estree.Node, context: Rule.RuleContext) {
  context.report({
    messageId: 'nonBooleanMightRender',
    node,
    suggest: [
      {
        messageId: 'suggestConversion',
        fix: fixer => {
          const sourceCode = context.sourceCode;
          const previousToken = sourceCode.getTokenBefore(node);
          const nextToken = sourceCode.getTokenAfter(node);

          const fixes = [];
          if (
            !!previousToken &&
            !!nextToken &&
            node.range !== undefined &&
            previousToken.value === '(' &&
            previousToken.range[1] <= node.range[0] &&
            nextToken.value === ')' &&
            nextToken.range[0] >= node.range[1]
          ) {
            fixes.push(fixer.remove(previousToken));
            fixes.push(fixer.remove(nextToken));
          }
          fixes.push(fixer.replaceText(node, `!!(${sourceCode.getText(node)})`));
          return fixes;
        },
      },
    ],
  });
}

function isStringOrNumber(node: estree.Node, context: Rule.RuleContext) {
  const type = getTypeFromTreeNode(node, context.sourceCode.parserServices);
  return isStringType(type) || isBigIntType(type) || isNumberType(type);
}

function isNumber(node: estree.Node, context: Rule.RuleContext) {
  const type = getTypeFromTreeNode(node, context.sourceCode.parserServices);
  return isBigIntType(type) || isNumberType(type);
}

function checkNonBoolean(
  context: Rule.RuleContext,
  isLeakingType: (node: estree.Node, context: Rule.RuleContext) => boolean,
  node: estree.Node,
): void {
  if (node.type === 'LogicalExpression') {
    checkNonBoolean(context, isLeakingType, node.left);
    checkNonBoolean(context, isLeakingType, node.right);
  } else if (isLeakingType(node, context)) {
    report(node, context);
  }
}
