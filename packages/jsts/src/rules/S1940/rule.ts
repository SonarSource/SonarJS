/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S1940

import type { Rule } from 'eslint';
import estree from 'estree';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

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

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      useOppositeOperator: 'Use the opposite operator ({{invertedOperator}}) instead.',
      suggestOperationInversion: 'Invert inner operation (apply if NaN is not expected)',
    },
    hasSuggestions: true,
    fixable: 'code',
  }),
  create(context) {
    return {
      UnaryExpression: (node: estree.UnaryExpression) => visitUnaryExpression(node, context),
    };
  },
};

function visitUnaryExpression(unaryExpression: estree.UnaryExpression, context: Rule.RuleContext) {
  if (
    unaryExpression.operator === '!' &&
    unaryExpression.argument.type === AST_NODE_TYPES.BinaryExpression
  ) {
    const condition: estree.BinaryExpression = unaryExpression.argument;
    const invertedOperator = invertedOperators[condition.operator];
    if (invertedOperator) {
      const left = context.sourceCode.getText(condition.left);
      const right = context.sourceCode.getText(condition.right);
      const [start, end] =
        (unaryExpression as TSESTree.UnaryExpression).parent?.type === 'UnaryExpression'
          ? ['(', ')']
          : ['', ''];
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
