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
// https://sonarsource.github.io/rspec/#/rspec/S1764

import estree from 'estree';
import {
  areEquivalent,
  isIdentifier,
  isLiteral,
  issueLocation,
  IssueLocation,
  report,
} from '../helpers';
import { Rule } from 'eslint';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from './meta.json';

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

function hasRelevantOperator(node: estree.BinaryExpression | estree.LogicalExpression) {
  return (
    RELEVANT_OPERATOR_TOKEN_KINDS.has(node.operator) ||
    (EQUALITY_OPERATOR_TOKEN_KINDS.has(node.operator) && !hasIdentifierOperands(node))
  );
}

function hasIdentifierOperands(node: estree.BinaryExpression | estree.LogicalExpression) {
  return isIdentifier(node.left) && isIdentifier(node.right);
}

function isOneOntoOneShifting(node: estree.BinaryExpression | estree.LogicalExpression) {
  return (
    node.operator === '<<' &&
    isLiteral(node.left) &&
    (node.left.value === 1 || node.left.value === 1n)
  );
}

const message =
  'Correct one of the identical sub-expressions on both sides of operator "{{operator}}"';

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, {
    messages: {
      correctIdenticalSubExpressions: message,
      sonarRuntime: '{{sonarRuntimeData}}',
    },
    schema: [
      {
        // internal parameter
        type: 'string',
        enum: ['sonar-runtime'],
      },
    ],
  }),
  create(context) {
    return {
      LogicalExpression(node: estree.LogicalExpression) {
        check(node);
      },
      BinaryExpression(node: estree.BinaryExpression) {
        check(node);
      },
    };

    function check(expr: estree.BinaryExpression | estree.LogicalExpression) {
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
