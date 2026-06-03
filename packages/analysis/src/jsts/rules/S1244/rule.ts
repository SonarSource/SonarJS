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

import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { isIdentifier, isNumberLiteral, getVariableFromName } from '../helpers/ast.js';
import { areEquivalent } from '../helpers/equivalence.js';
import { extractTestAssertion } from '../helpers/assertions.js';
import * as meta from './generated-meta.js';

const equalityOperators = new Set(['===', '!==', '==', '!=']);
const arithmeticOperators = new Set(['+', '-', '*', '%', '**']);
const indirectEqualityOperators = new Set(['<=', '>=']);
const indirectInequalityOperators = new Set(['<', '>']);
const decimalLiteralPattern = /^(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/u;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      noExactFloatEquality:
        'Do not check floating point equality or inequality with exact values, use a range instead.',
    },
  }),
  create(context: Rule.RuleContext) {
    function report(node: estree.Node) {
      context.report({
        messageId: 'noExactFloatEquality',
        node,
      });
    }

    function isFloatingPointSensitive(node: estree.Node): boolean {
      return isFloatingPointExpression(context, node, new Set<Scope.Variable>());
    }

    function shouldReportComparison(node: estree.BinaryExpression): boolean {
      return (
        equalityOperators.has(node.operator) &&
        (isFloatingPointSensitive(node.left) || isFloatingPointSensitive(node.right))
      );
    }

    return {
      BinaryExpression(node: estree.Node) {
        const binaryExpression = node as estree.BinaryExpression;
        if (shouldReportComparison(binaryExpression)) {
          report(binaryExpression);
        }
      },
      LogicalExpression(node: estree.Node) {
        const logicalExpression = node as estree.LogicalExpression;
        if (isIndirectExactComparison(context, logicalExpression, isFloatingPointSensitive)) {
          report(logicalExpression);
        }
      },
      CallExpression(node: estree.Node) {
        const assertion = extractTestAssertion(context, node);
        if (
          assertion?.kind === 'comparison' &&
          (isFloatingPointSensitive(assertion.actual) ||
            isFloatingPointSensitive(assertion.expected))
        ) {
          report(assertion.reportNode);
        }
      },
      SwitchCase(node: estree.Node) {
        const { test } = node as estree.SwitchCase;
        if (test && isFloatingPointSensitive(test)) {
          report(test);
        }
      },
    };
  },
};

function isFloatingPointLiteral(node: estree.Literal & { value: number }) {
  const raw = String(node.raw).replaceAll('_', '').toLowerCase();
  if (!raw.includes('.') && !raw.includes('e')) {
    return false;
  }
  if (!/^\d*(?:\.\d*)?(?:e[+-]?\d+)?$/u.test(raw)) {
    return false;
  }

  return !isExactlyRepresentableAsBinaryFraction(raw);
}

function isExactlyRepresentableAsBinaryFraction(raw: string) {
  const match = decimalLiteralPattern.exec(raw);
  if (!match) {
    return false;
  }

  const [, integerPart, fractionalPart = '', exponentPart] = match;
  const digits = `${integerPart}${fractionalPart}`;
  if (digits === '') {
    return false;
  }

  const exponent = Number(exponentPart ?? 0) - fractionalPart.length;
  const numerator = BigInt(digits);
  if (numerator === 0n || exponent >= 0) {
    return true;
  }

  const denominator = 10n ** BigInt(-exponent);
  const reducedDenominator = denominator / greatestCommonDivisor(numerator, denominator);
  return isPowerOfTwo(reducedDenominator);
}

function greatestCommonDivisor(left: bigint, right: bigint): bigint {
  let a = left;
  let b = right;
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

function isPowerOfTwo(value: bigint) {
  return value > 0n && (value & (value - 1n)) === 0n;
}

function isFractionProducingDivision(node: estree.BinaryExpression) {
  const leftValue = numericLiteralValue(node.left);
  const rightValue = numericLiteralValue(node.right);
  if (leftValue === null || rightValue === null || rightValue === 0) {
    return false;
  }
  return Number.isInteger(leftValue) && !Number.isInteger(leftValue / rightValue);
}

function numericLiteralValue(node: estree.Node): number | null {
  if (isNumberLiteral(node)) {
    return node.value;
  }
  if (
    node.type === 'UnaryExpression' &&
    (node.operator === '+' || node.operator === '-') &&
    isNumberLiteral(node.argument)
  ) {
    return node.operator === '-' ? -node.argument.value : node.argument.value;
  }
  return null;
}

function isFloatingPointConst(
  context: Rule.RuleContext,
  node: estree.Identifier,
  visitedVariables: Set<Scope.Variable>,
) {
  const variable = getVariableFromName(context, node.name, node);
  if (!variable || visitedVariables.has(variable)) {
    return false;
  }
  const definition = variable.defs[0];
  if (definition?.type !== 'Variable' || definition.node.type !== 'VariableDeclarator') {
    return false;
  }
  const declaration = definition.parent;
  if (
    declaration?.type !== 'VariableDeclaration' ||
    declaration.kind !== 'const' ||
    definition.node.id.type !== 'Identifier' ||
    !definition.node.init
  ) {
    return false;
  }
  visitedVariables.add(variable);
  return isFloatingPointExpression(context, definition.node.init, visitedVariables);
}

function isFloatingPointExpression(
  context: Rule.RuleContext,
  node: estree.Node,
  visitedVariables: Set<Scope.Variable>,
): boolean {
  if (isNumberLiteral(node)) {
    return isFloatingPointLiteral(node);
  }
  if (node.type === 'UnaryExpression') {
    return (
      ['+', '-'].includes(node.operator) &&
      isFloatingPointExpression(context, node.argument, visitedVariables)
    );
  }
  if (node.type === 'BinaryExpression') {
    if (node.operator === '/') {
      return (
        isFloatingPointExpression(context, node.left, visitedVariables) ||
        isFloatingPointExpression(context, node.right, visitedVariables) ||
        isFractionProducingDivision(node)
      );
    }
    return (
      arithmeticOperators.has(node.operator) &&
      (isFloatingPointExpression(context, node.left, visitedVariables) ||
        isFloatingPointExpression(context, node.right, visitedVariables))
    );
  }
  return isIdentifier(node) && isFloatingPointConst(context, node, visitedVariables);
}

type FloatingPointPredicate = (node: estree.Node) => boolean;

function isIndirectExactComparison(
  context: Rule.RuleContext,
  node: estree.LogicalExpression,
  isFloatingPointSensitive: FloatingPointPredicate,
) {
  const acceptedOperators = acceptedIndirectOperators(node.operator);
  const { left: leftComparison, right: rightComparison } = node;
  if (
    !acceptedOperators ||
    !isAcceptedComparison(leftComparison, acceptedOperators) ||
    !isAcceptedComparison(rightComparison, acceptedOperators)
  ) {
    return false;
  }

  return comparisonOrientations(leftComparison).some(left =>
    comparisonOrientations(rightComparison).some(
      right =>
        left.isAbove !== right.isAbove &&
        areEquivalent(left.expression, right.expression, context.sourceCode) &&
        areEquivalent(left.threshold, right.threshold, context.sourceCode) &&
        (isFloatingPointSensitive(left.expression) || isFloatingPointSensitive(left.threshold)),
    ),
  );
}

function acceptedIndirectOperators(operator: estree.LogicalExpression['operator']) {
  // && of two <=/>= comparisons collapses to equality; || of two strict </> comparisons
  // asserts inequality. Keep operator sets, this mapping, and comparisonOrientations in sync.
  if (operator === '&&') {
    return indirectEqualityOperators;
  }
  if (operator === '||') {
    return indirectInequalityOperators;
  }
  return null;
}

function isAcceptedComparison(
  node: estree.Expression,
  acceptedOperators: Set<string>,
): node is estree.BinaryExpression {
  return node.type === 'BinaryExpression' && acceptedOperators.has(node.operator);
}

function comparisonOrientations(node: estree.BinaryExpression) {
  const { left, right } = node;
  switch (node.operator) {
    case '<':
    case '<=':
      return [
        { expression: left, threshold: right, isAbove: false },
        { expression: right, threshold: left, isAbove: true },
      ];
    case '>':
    case '>=':
      return [
        { expression: left, threshold: right, isAbove: true },
        { expression: right, threshold: left, isAbove: false },
      ];
    default:
      return [];
  }
}
