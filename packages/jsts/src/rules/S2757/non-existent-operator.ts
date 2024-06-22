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
// https://sonarsource.github.io/rspec/#/rspec/S2757

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import docsUrl from '../utils/docs-url';

const rule: TSESLint.RuleModule<string, string[]> = {
  defaultOptions: [],
  meta: {
    messages: {
      useExistingOperator: 'Was "{{operator}}=" meant instead?',
      suggestExistingOperator: 'Replace with "{{operator}}" operator',
    },
    schema: [],
    type: 'problem',
    hasSuggestions: true,
    docs: {
      description: 'Non-existent operators "=+", "=-" and "=!" should not be used',
      recommended: 'recommended',
      url: docsUrl(__filename),
    },
  },
  create(context) {
    return {
      AssignmentExpression(node: TSESTree.Node) {
        const assignmentExpression = node as TSESTree.AssignmentExpression;
        if (assignmentExpression.operator === '=') {
          checkOperator(context, assignmentExpression.right);
        }
      },
      VariableDeclarator(node: TSESTree.Node) {
        const variableDeclarator = node as TSESTree.VariableDeclarator;
        checkOperator(context, variableDeclarator.init);
      },
    };
  },
};

function checkOperator(
  context: TSESLint.RuleContext<string, string[]>,
  unaryNode?: TSESTree.Expression | null,
) {
  if (
    unaryNode &&
    unaryNode.type === 'UnaryExpression' &&
    isUnaryOperatorOfInterest(unaryNode.operator)
  ) {
    const { sourceCode } = context;
    const assignmentOperatorToken = sourceCode.getTokenBefore(
      unaryNode,
      token => token.value === '=',
    );
    const unaryOperatorToken = sourceCode.getFirstToken(unaryNode);
    const expressionFirstToken = sourceCode.getFirstToken(unaryNode.argument);

    if (
      assignmentOperatorToken != null &&
      unaryOperatorToken != null &&
      expressionFirstToken != null &&
      areAdjacent(assignmentOperatorToken, unaryOperatorToken) &&
      !areAdjacent(unaryOperatorToken, expressionFirstToken)
    ) {
      const suggest: TSESLint.ReportSuggestionArray<string> = [];
      if (unaryNode.parent?.type === 'AssignmentExpression') {
        const range: [number, number] = [
          assignmentOperatorToken.range[0],
          unaryOperatorToken.range[1],
        ];
        const invertedOperators = unaryOperatorToken.value + assignmentOperatorToken.value;
        suggest.push({
          messageId: 'suggestExistingOperator',
          data: {
            operator: invertedOperators,
          },
          fix: fixer => fixer.replaceTextRange(range, invertedOperators),
        });
      }
      context.report({
        messageId: 'useExistingOperator',
        data: {
          operator: unaryNode.operator,
        },
        loc: { start: assignmentOperatorToken.loc.start, end: unaryOperatorToken.loc.end },
        suggest,
      });
    }
  }
}

function isUnaryOperatorOfInterest(operator: TSESTree.UnaryExpression['operator']): boolean {
  return operator === '-' || operator === '+' || operator === '!';
}

function areAdjacent(first: TSESLint.AST.Token, second: TSESLint.AST.Token): boolean {
  return (
    first.loc.end.column === second.loc.start.column && first.loc.end.line === second.loc.start.line
  );
}

export = rule;
