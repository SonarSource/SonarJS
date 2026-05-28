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
import { generateMeta } from '../helpers/generate-meta.js';
import { isIdentifier, isNumberLiteral, getVariableFromName } from '../helpers/ast.js';
import { areEquivalent } from '../helpers/equivalence.js';
import { extractTestAssertion } from '../helpers/assertions.js';
import * as meta from './generated-meta.js';

const equalityOperators = new Set(['===', '!==', '==', '!=']);
const arithmeticOperators = new Set(['+', '-', '*', '%', '**']);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      noExactFloatEquality:
        'Do not check floating point inequality with exact values, use a range instead.',
    },
  }),
  create(context: Rule.RuleContext) {
    function report(node: estree.Node) {
      context.report({
        messageId: 'noExactFloatEquality',
        node,
      });
    }

    function isFloatingPointSensitive(
      node: estree.Node,
      visitedVariables = new Set<string>(),
    ): boolean {
      if (isNumberLiteral(node)) {
        return isFloatingPointLiteral(node);
      }

      switch (node.type) {
        case 'UnaryExpression':
          return ['+', '-'].includes(node.operator) && isFloatingPointSensitive(node.argument);
        case 'BinaryExpression':
          if (node.operator === '/') {
            return (
              isFloatingPointSensitive(node.left) ||
              isFloatingPointSensitive(node.right) ||
              isFractionProducingDivision(node)
            );
          }
          return (
            arithmeticOperators.has(node.operator) &&
            (isFloatingPointSensitive(node.left) || isFloatingPointSensitive(node.right))
          );
        case 'Identifier':
          return isFloatingPointConst(context, node, visitedVariables);
        default:
          return false;
      }
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
    };
  },
};

function isFloatingPointLiteral(node: estree.Literal & { value: number }) {
  return /[.eE]/.test(String(node.raw));
}

function isFractionProducingDivision(node: estree.BinaryExpression) {
  if (!isNumberLiteral(node.left) || !isNumberLiteral(node.right) || node.right.value === 0) {
    return false;
  }
  return Number.isInteger(node.left.value) && !Number.isInteger(node.left.value / node.right.value);
}

function isFloatingPointConst(
  context: Rule.RuleContext,
  node: estree.Identifier,
  visitedVariables: Set<string>,
) {
  if (visitedVariables.has(node.name)) {
    return false;
  }
  const variable = getVariableFromName(context, node.name, node);
  const definition = variable?.defs[0];
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
  visitedVariables.add(node.name);
  return isFloatingPointExpression(context, definition.node.init, visitedVariables);
}

function isFloatingPointExpression(
  context: Rule.RuleContext,
  node: estree.Node,
  visitedVariables: Set<string>,
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
  const acceptedOperators =
    node.operator === '&&'
      ? new Set(['<=', '>='])
      : node.operator === '||'
        ? new Set(['<', '>'])
        : null;
  if (
    !acceptedOperators ||
    !isAcceptedComparison(node.left, acceptedOperators) ||
    !isAcceptedComparison(node.right, acceptedOperators)
  ) {
    return false;
  }

  const leftComparison = node.left;
  const rightComparison = node.right;
  return comparisonAlternatives(leftComparison).some(left =>
    comparisonAlternatives(rightComparison).some(
      right =>
        left.direction !== right.direction &&
        areEquivalent(left.expression, right.expression, context.sourceCode) &&
        areEquivalent(left.threshold, right.threshold, context.sourceCode) &&
        (isFloatingPointSensitive(left.expression) || isFloatingPointSensitive(left.threshold)),
    ),
  );
}

function isAcceptedComparison(
  node: estree.Expression,
  acceptedOperators: Set<string>,
): node is estree.BinaryExpression {
  return node.type === 'BinaryExpression' && acceptedOperators.has(node.operator);
}

function comparisonAlternatives(node: estree.BinaryExpression) {
  const left = node.left;
  const right = node.right;
  switch (node.operator) {
    case '<':
    case '<=':
      return [
        { expression: left, threshold: right, direction: 'below' },
        { expression: right, threshold: left, direction: 'above' },
      ];
    case '>':
    case '>=':
      return [
        { expression: left, threshold: right, direction: 'above' },
        { expression: right, threshold: left, direction: 'below' },
      ];
    default:
      return [];
  }
}
