/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S1067/javascript

import { Rule, AST } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import { toEncodedMessage } from '../helpers';
import { SONAR_RUNTIME } from '../parameters';
import { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import { generateMeta } from '../helpers/generate-meta';
import { FromSchema } from 'json-schema-to-ts';
import rspecMeta from './meta.json';

const DEFAULT = 3;

const schema = {
  type: 'array',
  minItems: 0,
  maxItems: 2,
  items: [
    {
      type: 'object',
      properties: {
        max: {
          type: 'integer',
        },
      },
      additionalProperties: false,
    },
    {
      type: 'string',
      // internal parameter for rules having secondary locations
      enum: [SONAR_RUNTIME],
    },
  ],
} as const satisfies JSONSchema4;

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, { schema }),
  create(context: Rule.RuleContext) {
    const threshold = (context.options as FromSchema<typeof schema>)[0]?.max ?? DEFAULT;
    const statementLevel: ExpressionComplexity[] = [new ExpressionComplexity()];
    return {
      '*': (node: estree.Node) => {
        const tree = node as TSESTree.Node;
        if (isConditionalLike(tree)) {
          const expr = statementLevel[statementLevel.length - 1];
          expr.incrementNestedExprLevel();
          expr.addOperator(getOperatorToken(tree, context));
        } else if (isScopeLike(tree)) {
          statementLevel.push(new ExpressionComplexity());
        }
      },
      '*:exit': (node: estree.Node) => {
        const tree = node as TSESTree.Node;
        if (isConditionalLike(tree)) {
          const expr = statementLevel[statementLevel.length - 1];
          expr.decrementNestedExprLevel();
          if (expr.isOnFirstExprLevel()) {
            const operators = expr.getComplexityOperators();
            if (operators.length > threshold) {
              reportIssue(tree, operators, threshold, context);
            }
            expr.resetExpressionComplexityOperators();
          }
        } else if (isScopeLike(tree)) {
          statementLevel.pop();
        }
      },
    };
  },
};

class ExpressionComplexity {
  nestedLevel = 0;
  operators: AST.Token[] = [];

  addOperator(operator: AST.Token) {
    this.operators.push(operator);
  }

  incrementNestedExprLevel() {
    this.nestedLevel++;
  }

  decrementNestedExprLevel() {
    this.nestedLevel--;
  }

  isOnFirstExprLevel() {
    return this.nestedLevel === 0;
  }

  getComplexityOperators() {
    return this.operators;
  }

  resetExpressionComplexityOperators() {
    this.operators = [];
  }
}

function isScopeLike(node: TSESTree.Node) {
  return (
    node.type === 'FunctionExpression' ||
    (node.type === 'FunctionDeclaration' && node.generator) ||
    node.type === 'ObjectExpression' ||
    node.type === 'CallExpression' ||
    node.type === 'JSXElement'
  );
}

function isConditionalLike(node: TSESTree.Node) {
  return node.type === 'ConditionalExpression' || node.type === 'LogicalExpression';
}

function getOperatorToken(node: TSESTree.Node, context: Rule.RuleContext) {
  const sourceCode = context.sourceCode;
  if (node.type === 'ConditionalExpression') {
    return sourceCode.getTokenAfter(
      node.test as estree.Node,
      token => token.type === 'Punctuator' && token.value === '?',
    )!;
  } else {
    const expr = node as estree.LogicalExpression;
    return sourceCode.getTokenAfter(
      expr.left,
      token => token.type === 'Punctuator' && token.value === expr.operator,
    )!;
  }
}

function reportIssue(
  node: TSESTree.Node,
  operators: AST.Token[],
  max: number,
  context: Rule.RuleContext,
) {
  const complexity = operators.length;
  const message = `Reduce the number of conditional operators (${complexity}) used in the expression (maximum allowed ${max}).`;
  const secondaryLocationsHolder = operators;
  const secondaryMessages = Array(complexity).fill('+1');
  const cost = complexity - max;
  context.report({
    node: node as estree.Node,
    message: toEncodedMessage(message, secondaryLocationsHolder, secondaryMessages, cost),
  });
}
