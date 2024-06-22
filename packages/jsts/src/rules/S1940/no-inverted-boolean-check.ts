/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S1940

import type { TSESTree, TSESLint } from '@typescript-eslint/utils';
import { isBinaryExpression } from '../utils/nodes';
import docsUrl from '../utils/docs-url';

const invertedOperators: { [operator: string]: string } = {
  '==': '!=',
  '!=': '==',
  '===': '!==',
  '!==': '===',
  '>': '<=',
  '<': '>=',
  '>=': '<',
  '<=': '>',
};

const rule: TSESLint.RuleModule<string, string[]> = {
  defaultOptions: [],
  meta: {
    messages: {
      useOppositeOperator: 'Use the opposite operator ({{invertedOperator}}) instead.',
      suggestOperationInversion: 'Invert inner operation (apply if NaN is not expected)',
    },
    schema: [],
    type: 'suggestion',
    docs: {
      description: 'Boolean checks should not be inverted',
      recommended: 'recommended',
      url: docsUrl(__filename),
    },
    hasSuggestions: true,
    fixable: 'code',
  },
  create(context) {
    return {
      UnaryExpression: (node: TSESTree.Node) =>
        visitUnaryExpression(node as TSESTree.UnaryExpression, context),
    };
  },
};

function visitUnaryExpression(
  unaryExpression: TSESTree.UnaryExpression,
  context: TSESLint.RuleContext<string, string[]>,
) {
  if (unaryExpression.operator === '!' && isBinaryExpression(unaryExpression.argument)) {
    const condition: TSESTree.BinaryExpression = unaryExpression.argument;
    const invertedOperator = invertedOperators[condition.operator];
    if (invertedOperator) {
      const left = context.sourceCode.getText(condition.left);
      const right = context.sourceCode.getText(condition.right);
      const [start, end] =
        unaryExpression.parent?.type === 'UnaryExpression' ? ['(', ')'] : ['', ''];
      context.report({
        messageId: 'useOppositeOperator',
        suggest: [
          {
            messageId: 'suggestOperationInversion',
            fix: fixer =>
              fixer.replaceText(
                unaryExpression,
                `${start}${left} ${invertedOperator} ${right}${end}`,
              ),
          },
        ],
        data: { invertedOperator },
        node: unaryExpression,
      });
    }
  }
}

export = rule;
