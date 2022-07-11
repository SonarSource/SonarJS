/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import { Rule, SourceCode } from 'eslint';
import * as estree from 'estree';
import { getTypeFromTreeNode, isBigIntType, isNumberType, isStringType } from '../utils';

export const rule: Rule.RuleModule = {
  meta: {
    hasSuggestions: true,
    messages: {
      noPotentialLeakedRender:
        'Potential leaked value that might cause unintentionally rendered values or rendering crashes',
      suggestCoercion: 'Coerce the conditional to a boolean',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      'JSXExpressionContainer > LogicalExpression[operator="&&"]'(node: estree.LogicalExpression) {
        const leftSide = node.left;

        if (isValidNestedLogicalExpression(context, leftSide)) {
          return;
        }

        context.report({
          messageId: 'noPotentialLeakedRender',
          node,
          suggest: [
            {
              messageId: 'suggestCoercion',
              fix: fixer => fixer.replaceText(node, fixNestedLogicalExpression(context, node)),
            },
          ],
        });
      },
    };
  },
};

function isParenthesized(sourceCode: SourceCode, node: estree.Node) {
  const previousToken = sourceCode.getTokenBefore(node);
  const nextToken = sourceCode.getTokenAfter(node);

  return (
    !!previousToken &&
    !!nextToken &&
    typeof node.range !== 'undefined' &&
    previousToken.value === '(' &&
    previousToken.range[1] <= node.range[0] &&
    nextToken.value === ')' &&
    nextToken.range[0] >= node.range[1]
  );
}

function isValidNestedLogicalExpression(context: Rule.RuleContext, node: estree.Node): boolean {
  if (node.type === 'LogicalExpression') {
    return (
      isValidNestedLogicalExpression(context, node.left) &&
      isValidNestedLogicalExpression(context, node.right)
    );
  }
  const type = getTypeFromTreeNode(node, context.parserServices);
  return !isStringType(type) && !isBigIntType(type) && !isNumberType(type);
}

function fixNestedLogicalExpression(context: Rule.RuleContext, node: estree.Node): string {
  const sourceCode = context.getSourceCode();
  const addParentheses = isParenthesized(sourceCode, node);
  if (node.type === 'LogicalExpression') {
    return `${addParentheses ? '(' : ''}${fixNestedLogicalExpression(context, node.left)} ${
      node.operator
    } ${fixNestedLogicalExpression(context, node.right)}${addParentheses ? ')' : ''}`;
  }
  const type = getTypeFromTreeNode(node, context.parserServices);
  const valid = !isStringType(type) && !isBigIntType(type) && !isNumberType(type);

  let text = sourceCode.getText(node);
  if (addParentheses) {
    text = `(${text})`;
  }
  if (!valid) {
    text = `!!${text}`;
  }
  return text;
}
