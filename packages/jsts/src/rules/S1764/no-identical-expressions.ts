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
// https://sonarsource.github.io/rspec/#/rspec/S1764

import type { TSESTree, TSESLint } from '@typescript-eslint/utils';
import { isIdentifier, isLiteral } from '../utils/nodes';
import { areEquivalent } from '../utils/equivalence';
import { report, issueLocation, IssueLocation } from '../utils/locations';
import docsUrl from '../utils/docs-url';

const EQUALITY_OPERATOR_TOKEN_KINDS = new Set(['==', '===', '!=', '!==']);

// consider only binary expressions with these operators
const RELEVANT_OPERATOR_TOKEN_KINDS = new Set([
  '&&',
  '||',
  '/',
  '-',
  '<<',
  '>>',
  '<',
  '<=',
  '>',
  '>=',
]);

function hasRelevantOperator(node: TSESTree.BinaryExpression | TSESTree.LogicalExpression) {
  return (
    RELEVANT_OPERATOR_TOKEN_KINDS.has(node.operator) ||
    (EQUALITY_OPERATOR_TOKEN_KINDS.has(node.operator) && !hasIdentifierOperands(node))
  );
}

function hasIdentifierOperands(node: TSESTree.BinaryExpression | TSESTree.LogicalExpression) {
  return isIdentifier(node.left) && isIdentifier(node.right);
}

function isOneOntoOneShifting(node: TSESTree.BinaryExpression | TSESTree.LogicalExpression) {
  return (
    node.operator === '<<' &&
    isLiteral(node.left) &&
    (node.left.value === 1 || node.left.value === 1n)
  );
}

const message =
  'Correct one of the identical sub-expressions on both sides of operator "{{operator}}"';

const rule: TSESLint.RuleModule<string, string[]> = {
  defaultOptions: [],
  meta: {
    messages: {
      correctIdenticalSubExpressions: message,
      sonarRuntime: '{{sonarRuntimeData}}',
    },
    type: 'problem',
    docs: {
      description: 'Identical expressions should not be used on both sides of a binary operator',
      recommended: 'recommended',
      url: docsUrl(__filename),
    },
    schema: [
      {
        // internal parameter
        type: 'string',
        enum: ['sonar-runtime'],
      },
    ],
  },
  create(context) {
    return {
      LogicalExpression(node: TSESTree.Node) {
        check(node as TSESTree.LogicalExpression);
      },
      BinaryExpression(node: TSESTree.Node) {
        check(node as TSESTree.BinaryExpression);
      },
    };

    function check(expr: TSESTree.BinaryExpression | TSESTree.LogicalExpression) {
      if (
        hasRelevantOperator(expr) &&
        !isOneOntoOneShifting(expr) &&
        areEquivalent(expr.left, expr.right, context.sourceCode)
      ) {
        const secondaryLocations: IssueLocation[] = [];
        if (expr.left.loc) {
          secondaryLocations.push(issueLocation(expr.left.loc));
        }
        report(
          context,
          {
            messageId: 'correctIdenticalSubExpressions',
            data: {
              operator: expr.operator,
            },
            node: isSonarRuntime() ? expr.right : expr,
          },
          secondaryLocations,
          message,
        );
      }
    }

    function isSonarRuntime() {
      return context.options[context.options.length - 1] === 'sonar-runtime';
    }
  },
};

export = rule;
