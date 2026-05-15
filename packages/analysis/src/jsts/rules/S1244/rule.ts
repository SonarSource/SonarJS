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

import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import { type Assertion, extractTestAssertion } from '../helpers/assertions.js';
import { areEquivalent } from '../helpers/equivalence.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const messages = {
  issue:
    'Replace this exact floating-point comparison with a tolerant comparison or approximate assertion.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context) {
    function checkAssertion(node: estree.Node) {
      const assertion = extractTestAssertion(context, node);
      if (isExactFloatAssertion(assertion)) {
        context.report({ node: assertion.reportNode, messageId: 'issue' });
      }
    }

    return {
      BinaryExpression(node: estree.BinaryExpression) {
        if (
          isEqualityOperator(node.operator) &&
          (isFloatSensitiveExpression(node.left) || isFloatSensitiveExpression(node.right))
        ) {
          reportBinaryComparison(context, node);
        }
      },
      LogicalExpression(node: estree.LogicalExpression) {
        if (isIndirectFloatComparison(node, context.sourceCode)) {
          context.report({ node, messageId: 'issue' });
        }
      },
      CallExpression(node: estree.Node) {
        checkAssertion(node);
      },
      MemberExpression(node: estree.Node) {
        checkAssertion(node);
      },
    };
  },
};

function reportBinaryComparison(context: Rule.RuleContext, node: estree.BinaryExpression) {
  const operator = context.sourceCode.getFirstTokenBetween(
    node.left,
    node.right,
    token => token.value === node.operator,
  );

  context.report({
    loc: operator!.loc,
    messageId: 'issue',
  });
}

function isExactFloatAssertion(
  assertion: Assertion | null,
): assertion is Extract<Assertion, { kind: 'comparison' }> {
  return (
    assertion?.kind === 'comparison' &&
    assertion.comparison === 'identity' &&
    (isFloatSensitiveExpression(assertion.actual) || isFloatSensitiveExpression(assertion.expected))
  );
}

function isEqualityOperator(operator: estree.BinaryOperator) {
  return operator === '===' || operator === '!==';
}

function isFloatSensitiveExpression(node: estree.Node): boolean {
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'number' && isFloatSensitiveNumericLiteral(node.raw);
    case 'BinaryExpression':
      if (node.operator === '/') {
        return true;
      }
      return (
        isFloatPropagatingOperator(node.operator) &&
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

function isFloatSensitiveNumericLiteral(raw: string | undefined): boolean {
  return raw?.includes('.') === true || /e-\d/i.test(raw ?? '');
}

function isFloatPropagatingOperator(operator: estree.BinaryOperator) {
  return (
    operator === '+' ||
    operator === '-' ||
    operator === '*' ||
    operator === '**' ||
    operator === '%'
  );
}

function isIndirectFloatComparison(node: estree.LogicalExpression, sourceCode: SourceCode) {
  if (node.left.type !== 'BinaryExpression' || node.right.type !== 'BinaryExpression') {
    return false;
  }

  if (node.operator === '&&') {
    return matchesIndirectPattern(node.left, node.right, '<=', '>=', sourceCode);
  }

  if (node.operator === '||') {
    return matchesIndirectPattern(node.left, node.right, '<', '>', sourceCode);
  }

  return false;
}

function matchesIndirectPattern(
  left: estree.BinaryExpression,
  right: estree.BinaryExpression,
  firstOperator: estree.BinaryOperator,
  secondOperator: estree.BinaryOperator,
  sourceCode: SourceCode,
) {
  if (!hasOperators(left, right, firstOperator, secondOperator)) {
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

function hasOperators(
  left: estree.BinaryExpression,
  right: estree.BinaryExpression,
  firstOperator: estree.BinaryOperator,
  secondOperator: estree.BinaryOperator,
) {
  return (
    (left.operator === firstOperator && right.operator === secondOperator) ||
    (left.operator === secondOperator && right.operator === firstOperator)
  );
}
