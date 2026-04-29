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
import * as meta from './generated-meta.js';

const messages = {
  issue: 'Replace this assertion; it always succeeds or fails.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    function checkAssertion(node: estree.Node) {
      const assertion = extractTestAssertion(context, node);
      const reportNode = assertion ? getTrivialAssertionNode(assertion) : null;
      if (reportNode) {
        context.report({ node: reportNode, messageId: 'issue' });
      }
    }

    return {
      CallExpression(node: estree.Node) {
        checkAssertion(node);
      },
      MemberExpression(node: estree.Node) {
        checkAssertion(node);
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

        // if both sides are syntactically constant, the comparison result is statically known
        if (
          isConstantPrimitiveValue(assertion.actual) &&
          isConstantPrimitiveValue(assertion.expected)
        ) {
          return assertion.actual;
        }
      }

      return null;
    default:
      return null;
  }
}

export function isConstantPrimitiveValue(node: estree.Node): boolean {
  switch (node.type) {
    case 'Literal':
      return (
        node.value === null ||
        typeof node.value === 'boolean' ||
        typeof node.value === 'string' ||
        typeof node.value === 'number' ||
        ('bigint' in node && typeof node.bigint === 'string')
      );
    case 'Identifier':
      return node.name === 'undefined';
    case 'TemplateLiteral':
      return node.expressions.length === 0;
    case 'UnaryExpression':
      // `void X` is always undefined regardless of X; the other operators preserve constness
      return (
        node.operator === 'void' ||
        (['!', '+', '-', 'typeof'].includes(node.operator) &&
          isConstantPrimitiveValue(node.argument))
      );
    case 'BinaryExpression':
    case 'LogicalExpression':
      return isConstantPrimitiveValue(node.left) && isConstantPrimitiveValue(node.right);
    default:
      return false;
  }
}

/**
 * These expression types create a new reference on each evaluation, so they are always different from any other value
 */
const FRESH_REFERENCE_EXPRESSIONS = new Set<estree.Node['type']>([
  'ArrayExpression',
  'ObjectExpression',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ClassExpression',
  'NewExpression',
]);

/**
 * Checks if the given node is an expression that creates a new reference on each evaluation, and thus is always different from any other value.
 */
function isFreshReferenceExpression(node: estree.Node): boolean {
  // regex literals create a fresh RegExp object on each evaluation
  if (node.type === 'Literal' && 'regex' in node) {
    return true;
  }
  return FRESH_REFERENCE_EXPRESSIONS.has(node.type);
}
