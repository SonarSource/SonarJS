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

import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import { type Assertion, extractTestAssertion } from '../helpers/assertions.js';
import { getVariableFromName } from '../helpers/ast.js';
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
      const trivial = assertion ? getTrivialAssertion(context, assertion) : null;
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
function getTrivialAssertion(
  context: Rule.RuleContext,
  assertion: Assertion,
): TrivialAssertion | null {
  switch (assertion.kind) {
    case 'predicate':
      if (isConstantPrimitiveValue(context, assertion.actual)) {
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
        // both sides are constant (syntactically or via a resolved binding): the comparison result is statically determined
        if (
          isConstantPrimitiveValue(context, assertion.actual) &&
          isConstantPrimitiveValue(context, assertion.expected)
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

function isConstantPrimitiveValue(
  context: Rule.RuleContext,
  node: estree.Node,
  visited?: Set<Scope.Variable>,
): boolean {
  // resolve `const` bindings through their initializer so that identifiers bound to a constant
  // primitive are treated as constants too. `visited` guards against mutually-recursive const
  // references like `const a = b; const b = a;` (TDZ at runtime).
  if (node.type === 'Identifier' && node.name !== 'undefined') {
    visited ??= new Set();
    const resolved = resolveConstBinding(context, node, visited);
    if (resolved) {
      return isConstantPrimitiveValue(context, resolved, visited);
    }
  }
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
      if (node.name === 'undefined') {
        const variable = getVariableFromName(context, 'undefined', node);
        // global `undefined` has no user definitions; a shadowed binding does
        return !variable || variable.defs.length === 0;
      }
      return false;
    case 'TemplateLiteral':
      return node.expressions.length === 0;
    case 'UnaryExpression':
      // `void X` is always undefined regardless of X; the other operators preserve constness
      return (
        node.operator === 'void' ||
        (UNARY_OPERATORS_PRESERVING_CONSTNESS.has(node.operator) &&
          isConstantPrimitiveValue(context, node.argument, visited))
      );
    case 'BinaryExpression':
    case 'LogicalExpression':
      return (
        isConstantPrimitiveValue(context, node.left, visited) &&
        isConstantPrimitiveValue(context, node.right, visited)
      );
    default:
      return false;
  }
}

/**
 * Returns the initializer of `node` if it refers to a `const` binding declared with a plain identifier
 * pattern (no destructuring) and that binding has not been visited already, otherwise undefined.
 * Restricting to `const` ensures the binding's value is statically equal to the initializer at every read.
 * The variable is added to `visited` so mutually-recursive references cannot loop forever.
 */
function resolveConstBinding(
  context: Rule.RuleContext,
  node: estree.Identifier,
  visited: Set<Scope.Variable>,
): estree.Expression | null | undefined {
  const variable = getVariableFromName(context, node.name, node);
  if (!variable || visited.has(variable) || variable.defs.length !== 1) {
    return undefined;
  }
  const def = variable.defs[0];
  if (def.type !== 'Variable' || def.parent?.type !== 'VariableDeclaration') {
    return undefined;
  }
  if (def.parent.kind !== 'const' || def.node.id.type !== 'Identifier') {
    return undefined;
  }
  visited.add(variable);
  return def.node.init;
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
