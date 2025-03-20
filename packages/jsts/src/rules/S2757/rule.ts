/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S2757

import { AST, Rule } from 'eslint';
import estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      useExistingOperator: 'Was "{{operator}}=" meant instead?',
      suggestExistingOperator: 'Replace with "{{operator}}" operator',
    },
    hasSuggestions: true,
  }),
  create(context) {
    return {
      AssignmentExpression(assignmentExpression: estree.AssignmentExpression) {
        if (assignmentExpression.operator === '=') {
          checkOperator(context, assignmentExpression.right);
        }
      },
      VariableDeclarator(variableDeclarator: estree.VariableDeclarator) {
        checkOperator(context, variableDeclarator.init);
      },
    };
  },
};

function checkOperator(context: Rule.RuleContext, unaryNode?: estree.Expression | null) {
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
      const suggest: Rule.SuggestionReportDescriptor[] = [];
      if ((unaryNode as TSESTree.Node).parent?.type === 'AssignmentExpression') {
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

function isUnaryOperatorOfInterest(operator: estree.UnaryExpression['operator']): boolean {
  return operator === '-' || operator === '+' || operator === '!';
}

function areAdjacent(first: AST.Token, second: AST.Token): boolean {
  return (
    first.loc.end.column === second.loc.start.column && first.loc.end.line === second.loc.start.line
  );
}
