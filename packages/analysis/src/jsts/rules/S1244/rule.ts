/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S1244/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { type Assertion, extractTestAssertion } from '../helpers/assertions.js';
import { areEquivalent } from '../helpers/equivalence.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const messages = {
  issue:
    'Do not check floating point equality or inequality with exact values, use a range instead.',
};

const EQUALITY_OPERATORS = new Set(['===', '!==']);
const FLOAT_PROPAGATING_OPERATORS = new Set(['+', '-', '*', '**', '%']);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context) {
    const sourceCode = context.sourceCode;

    function checkAssertion(node: estree.Node): void {
      const assertion = extractTestAssertion(context, node);
      if (!isStrictComparisonAssertion(assertion)) {
        return;
      }

      if (
        isFloatSensitiveExpression(assertion.actual) ||
        isFloatSensitiveExpression(assertion.expected)
      ) {
        context.report({
          node: assertion.reportNode,
          messageId: 'issue',
        });
      }
    }

    return {
      BinaryExpression(node: estree.BinaryExpression) {
        if (
          EQUALITY_OPERATORS.has(node.operator) &&
          (isFloatSensitiveExpression(node.left) || isFloatSensitiveExpression(node.right))
        ) {
          context.report({
            node,
            messageId: 'issue',
          });
        }
      },
      LogicalExpression(node: estree.LogicalExpression) {
        if (
          (node.operator === '&&' && matchesIndirectPattern(node.left, node.right, '<=', '>=')) ||
          (node.operator === '||' && matchesIndirectPattern(node.left, node.right, '<', '>'))
        ) {
          context.report({
            node,
            messageId: 'issue',
          });
        }
      },
      CallExpression: checkAssertion,
      MemberExpression: checkAssertion,
    };

    function matchesIndirectPattern(
      left: estree.Node,
      right: estree.Node,
      operatorA: string,
      operatorB: string,
    ): boolean {
      if (left.type !== 'BinaryExpression' || right.type !== 'BinaryExpression') {
        return false;
      }

      return (
        matchesOrderedIndirectPattern(left, right, operatorA, operatorB) ||
        matchesOrderedIndirectPattern(left, right, operatorB, operatorA)
      );
    }

    function matchesOrderedIndirectPattern(
      left: estree.BinaryExpression,
      right: estree.BinaryExpression,
      operatorA: string,
      operatorB: string,
    ): boolean {
      if (left.operator !== operatorA || right.operator !== operatorB) {
        return false;
      }

      return (
        (areEquivalent(left.left, right.left, sourceCode) &&
          areEquivalent(left.right, right.right, sourceCode) &&
          isFloatSensitiveExpression(left.right)) ||
        (areEquivalent(left.right, right.right, sourceCode) &&
          areEquivalent(left.left, right.left, sourceCode) &&
          isFloatSensitiveExpression(left.left))
      );
    }
  },
};

function isStrictComparisonAssertion(assertion: Assertion | null): assertion is Assertion & {
  kind: 'comparison';
} {
  return assertion?.kind === 'comparison' && assertion.comparison === 'strict';
}

function isFloatSensitiveExpression(node: estree.Node): boolean {
  switch (node.type) {
    case 'Literal':
      return isFloatLiteral(node);
    case 'BinaryExpression':
      if (node.operator === '/') {
        return true;
      }
      return (
        FLOAT_PROPAGATING_OPERATORS.has(node.operator) &&
        (isFloatSensitiveExpression(node.left) || isFloatSensitiveExpression(node.right))
      );
    case 'UnaryExpression':
      return (
        (node.operator === '-' || node.operator === '+') &&
        isFloatSensitiveExpression(node.argument)
      );
    default:
      return false;
  }
}

function isFloatLiteral(node: estree.Literal): boolean {
  return typeof node.value === 'number' && typeof node.raw === 'string' && node.raw.includes('.');
}
