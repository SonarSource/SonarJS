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
// https://sonarsource.github.io/rspec/#/rspec/S1764

import estree from 'estree';
import {
  areEquivalent,
  generateMeta,
  isIdentifier,
  isLiteral,
  IssueLocation,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import type { Rule } from 'eslint';
import { meta } from './meta.js';

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
  meta: generateMeta(
    meta as Rule.RuleMetaData,
    {
      messages: {
        correctIdenticalSubExpressions: message,
      },
    },
    true,
  ),
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
          secondaryLocations.push(toSecondaryLocation(expr.left));
        }
        report(
          context,
          {
            message,
            messageId: 'correctIdenticalSubExpressions',
            data: {
              operator: expr.operator,
            },
            node: isSonarRuntime() ? expr.right : expr,
          },
          secondaryLocations,
        );
      }
    }

    function isSonarRuntime() {
      return context.options[context.options.length - 1] === 'sonar-runtime';
    }
  },
};
