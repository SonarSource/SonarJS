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
  // hint targeted at identity comparisons against a freshly-created value: a deep equality matcher is almost always what was meant
  freshIdentity:
    'Use a deep equality matcher; freshly-created values are never identical to other values.',
  // hint for predicate assertions on a freshly-created value, where the truthiness/nullishness is statically known
  freshPredicate:
    'Replace this assertion; the value is freshly created here, so the result is independent of the code under test.',
};

type TrivialAssertion = { reportNode: estree.Node; messageId: keyof typeof messages };

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    function checkAssertion(node: estree.Node) {
      const assertion = extractTestAssertion(context, node);
      const trivial = assertion ? getTrivialAssertion(assertion) : null;
      if (trivial) {
        context.report({ node: trivial.reportNode, messageId: trivial.messageId });
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
 * Classifies the assertion as trivial (always succeeds or always fails) and picks the most
 * informative message for the underlying cause.
 * @returns the node to report and the corresponding message id, or null if the assertion is not trivial.
 */
function getTrivialAssertion(assertion: Assertion): TrivialAssertion | null {
  switch (assertion.kind) {
    case 'predicate':
      if (isConstantPrimitiveValue(assertion.actual)) {
        return { reportNode: assertion.actual, messageId: 'issue' };
      }
      if (isFreshReferenceExpression(assertion.actual)) {
        return { reportNode: assertion.actual, messageId: 'freshPredicate' };
      }
      return null;
    case 'comparison':
      if (assertion.comparison === 'identity') {
        // a freshly-created value on either side makes the identity check trivially fail (or trivially succeed when negated)
        if (isFreshReferenceExpression(assertion.actual)) {
          return { reportNode: assertion.actual, messageId: 'freshIdentity' };
        }
        if (isFreshReferenceExpression(assertion.expected)) {
          return { reportNode: assertion.expected, messageId: 'freshIdentity' };
        }
        // both sides are syntactically constant: the comparison result is statically determined
        if (
          isConstantPrimitiveValue(assertion.actual) &&
          isConstantPrimitiveValue(assertion.expected)
        ) {
          return { reportNode: assertion.actual, messageId: 'issue' };
        }
      }
      return null;
    default:
      return null;
  }
}

const UNARY_OPERATORS_PRESERVING_CONSTNESS = new Set<estree.UnaryOperator>([
  '!',
  '+',
  '-',
  'typeof',
]);

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
        (UNARY_OPERATORS_PRESERVING_CONSTNESS.has(node.operator) &&
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
