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
// https://sonarsource.github.io/rspec/#/rspec/S5914/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { type Assertion, extractTestAssertion } from '../helpers/assertions.js';
import { generateMeta } from '../helpers/generate-meta.js';
import {
  isBigIntLiteral,
  isBooleanLiteral,
  isNullLiteral,
  isNumberLiteral,
  isStaticTemplateLiteral,
  isStringLiteral,
  isUndefined,
} from '../helpers/ast.js';
import * as meta from './generated-meta.js';

const messages = {
  issue: 'Replace this assertion; it always succeeds or fails.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.Node) {
        const assertion = extractTestAssertion(context, node as estree.CallExpression);
        const reportNode = assertion ? getTrivialAssertionNode(assertion) : null;
        if (reportNode) {
          context.report({ node: reportNode, messageId: 'issue' });
        }
      },
    };
  },
};

/**
 * Checks if the given assertion is trivial, meaning that it will always succeed or always fail
 * @returns the node to report if so.
 */
function getTrivialAssertionNode(assertion: Assertion): estree.Node | null {
  switch (assertion.kind) {
    case 'predicate':
      return isConstantPrimitiveValue(assertion.actual) ||
        isFreshReferenceExpression(assertion.actual)
        ? assertion.actual
        : null;
    case 'comparison':
      // if the actual or expected expression produces a fresh reference
      // then the identity comparison will always fail or always succeed
      if (assertion.comparison === 'identity') {
        if (isFreshReferenceExpression(assertion.actual)) {
          return assertion.actual;
        }

        if (isFreshReferenceExpression(assertion.expected)) {
          return assertion.expected;
        }
      }

      return null;
    default:
      return null;
  }
}

/**
 * Checks if the given node is a literal or an expression that can be determined syntactically as always having the same value
 * such as `undefined`, `null`, numeric/string/bigint literals, or simple unary/binary expressions.
 */
function isConstantPrimitiveValue(node: estree.Node): boolean {
  if (isBooleanLiteral(node)) {
    return true;
  }
  if (isStringLiteral(node)) {
    return true;
  }
  if (isNumberLiteral(node)) {
    return true;
  }
  if (isBigIntLiteral(node)) {
    return true;
  }
  if (isNullLiteral(node)) {
    return true;
  }
  if (isUndefined(node)) {
    return true;
  }
  if (isStaticTemplateLiteral(node)) {
    return true;
  }
  if (node.type === 'UnaryExpression') {
    return isConstantUnaryExpression(node);
  }
  if (node.type === 'BinaryExpression') {
    return isConstantPrimitiveValue(node.left) && isConstantPrimitiveValue(node.right);
  }
  return false;
}

function isConstantUnaryExpression(node: estree.UnaryExpression): boolean {
  if (node.operator !== '-' && node.operator !== '+' && node.operator !== '!') {
    return false;
  }
  const argument = node.argument;
  if (isNumberLiteral(argument) || isBooleanLiteral(argument) || isBigIntLiteral(argument)) {
    return true;
  }
  return false;
}

/**
 * These expression types create a new reference on each evaluation, so they are always different from any other value
 */
const FRESH_REFERENCE_EXPRESSIONS = new Set([
  'ArrayExpression',
  'ObjectExpression',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ClassExpression',
]);

/**
 * Checks if the given node is an expression that creates a new reference on each evaluation, and thus is always different from any other value.
 */
function isFreshReferenceExpression(node: estree.Node): boolean {
  return FRESH_REFERENCE_EXPRESSIONS.has(node.type);
}
