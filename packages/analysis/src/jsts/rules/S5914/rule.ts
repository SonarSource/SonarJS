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
import {
  type Assertion,
  type AssertionPredicate,
  type AssertionStyle,
  extractTestAssertion,
} from '../helpers/assertions.js';
import { getVariableFromName } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const messages = {
  issue: 'Replace this assertion; it always succeeds.',
  // hint targeted at identity comparisons against a freshly-created value: name the deep equality
  // matcher for the assertion's own style, since it's almost always what was meant
  freshIdentity:
    'Use `{{matcher}}` instead; freshly-created values are never identical to other values.',
  // hint for predicate assertions on a freshly-created value, where the truthiness/nullishness is statically known
  freshPredicate:
    'Replace this assertion; the value is freshly created here, so the result is independent of the code under test.',
};

type TrivialAssertion = {
  reportNode: estree.Node;
  messageId: keyof typeof messages;
  data?: Record<string, string>;
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    function checkAssertion(node: estree.Node) {
      const assertion = extractTestAssertion(context, node);
      const trivial = assertion ? getTrivialAssertion(context, assertion) : null;
      if (trivial) {
        context.report({
          node: trivial.reportNode,
          messageId: trivial.messageId,
          data: trivial.data,
        });
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
 * Classifies the assertion as trivially true (always guaranteed to succeed) and picks the most
 * informative message for the underlying cause. An assertion that is guaranteed to always *fail*
 * is not reported here: it's self-correcting, since it makes the test suite fail immediately.
 * The one exception is an identity comparison against a freshly-created value, which is reported
 * regardless of which way it resolves, since it usually signals a toBe/toEqual mixup.
 * @returns the node to report and the corresponding message id, or null if the assertion isn't trivially true.
 */
function getTrivialAssertion(
  context: Rule.RuleContext,
  assertion: Assertion,
): TrivialAssertion | null {
  switch (assertion.kind) {
    case 'predicate': {
      const actual = resolveConstantPrimitiveValue(context, assertion.actual);
      if (actual && predicateHolds(assertion.predicate, actual.value) !== assertion.negated) {
        return { reportNode: assertion.actual, messageId: 'issue' };
      }
      if (
        isFreshReferenceExpression(assertion.actual) &&
        freshReferencePredicateHolds(assertion.predicate) !== assertion.negated
      ) {
        return { reportNode: assertion.actual, messageId: 'freshPredicate' };
      }
      return null;
    }
    case 'comparison':
      if (assertion.comparison === 'strict') {
        // a freshly-created value on either side makes strict equality trivially fail (or
        // trivially succeed when negated), and is flagged either way: it's a common
        // toBe/toEqual mixup. Loose equality is excluded because object-to-primitive coercion
        // can make comparisons like `[] == false` pass.
        if (isFreshReferenceExpression(assertion.actual)) {
          return {
            reportNode: assertion.actual,
            messageId: 'freshIdentity',
            data: { matcher: getDeepEqualityMatcher(assertion.style, assertion.negated) },
          };
        }
        if (isFreshReferenceExpression(assertion.expected)) {
          return {
            reportNode: assertion.expected,
            messageId: 'freshIdentity',
            data: { matcher: getDeepEqualityMatcher(assertion.style, assertion.negated) },
          };
        }
      }
      // both sides are constant (syntactically or via a resolved binding): for strict or loose
      // equality the comparison result is statically determined. Deep equality is intentionally
      // skipped via an explicit whitelist to avoid widening this rule when assertion helper
      // comparison kinds evolve.
      if (assertion.comparison === 'strict' || assertion.comparison === 'loose') {
        const actual = resolveConstantPrimitiveValue(context, assertion.actual);
        const expected = resolveConstantPrimitiveValue(context, assertion.expected);
        if (actual && expected) {
          const equal =
            assertion.comparison === 'strict'
              ? actual.value === expected.value
              : // eslint-disable-next-line eqeqeq
                actual.value == expected.value;
          if (equal !== assertion.negated) {
            return { reportNode: assertion.actual, messageId: 'issue' };
          }
        }
      }
      return null;
    default:
      return null;
  }
}

/**
 * Names the deep equality matcher that most likely fixes a `freshIdentity` finding, for the
 * assertion's own style and negation, so the suggestion reads naturally regardless of which
 * library the offending assertion came from.
 */
function getDeepEqualityMatcher(style: AssertionStyle, negated: boolean): string {
  switch (style) {
    case 'jest-like':
    case 'jasmine':
    case 'playwright':
      return negated ? 'not.toEqual' : 'toEqual';
    case 'chai-bdd':
    case 'cypress':
      return negated ? 'not.deep.equal' : 'deep.equal';
    case 'chai-assert':
      return negated ? 'notDeepEqual' : 'deepEqual';
    case 'node-assert':
      return negated ? 'notDeepStrictEqual' : 'deepStrictEqual';
    default:
      return negated
        ? 'a matcher that checks deep inequality'
        : 'a matcher that checks deep equality';
  }
}

/**
 * Whether a resolved constant `value` satisfies the given assertion `predicate`.
 */
function predicateHolds(predicate: AssertionPredicate, value: ConstantPrimitive): boolean {
  switch (predicate) {
    case 'truthy':
      return Boolean(value);
    case 'falsy':
      return !value;
    case 'defined':
      return value !== undefined;
    case 'undefined':
      return value === undefined;
    case 'null':
      return value === null;
    default:
      return false;
  }
}

/**
 * Same as `predicateHolds`, specialized for freshly-created references: they're always truthy,
 * always defined, and never null.
 */
function freshReferencePredicateHolds(predicate: AssertionPredicate): boolean {
  switch (predicate) {
    case 'truthy':
    case 'defined':
      return true;
    case 'falsy':
    case 'undefined':
    case 'null':
      return false;
    default:
      return false;
  }
}

type ConstantPrimitive = boolean | string | number | bigint | null | undefined;

const UNARY_OPERATORS_PRESERVING_CONSTNESS = new Set<estree.UnaryOperator>([
  '!',
  '+',
  '-',
  'typeof',
]);

/**
 * Real JS semantics for each supported binary/logical operator, applied to already-resolved
 * constant operands. `in` and `instanceof` aren't meaningful for primitive constants and are
 * intentionally left unsupported.
 */
const BINARY_OPERATOR_EVALUATORS: {
  [K in estree.BinaryOperator | estree.LogicalOperator]?: (
    left: any,
    right: any,
  ) => ConstantPrimitive;
} = {
  '+': (l, r) => l + r,
  '-': (l, r) => l - r,
  '*': (l, r) => l * r,
  '/': (l, r) => l / r,
  '%': (l, r) => l % r,
  '**': (l, r) => l ** r,
  '===': (l, r) => l === r,
  '!==': (l, r) => l !== r,
  // eslint-disable-next-line eqeqeq
  '==': (l, r) => l == r,
  // eslint-disable-next-line eqeqeq
  '!=': (l, r) => l != r,
  '<': (l, r) => l < r,
  '<=': (l, r) => l <= r,
  '>': (l, r) => l > r,
  '>=': (l, r) => l >= r,
  '<<': (l, r) => l << r,
  '>>': (l, r) => l >> r,
  '>>>': (l, r) => l >>> r,
  '&': (l, r) => l & r,
  '|': (l, r) => l | r,
  '^': (l, r) => l ^ r,
  '&&': (l, r) => (l ? r : l),
  '||': (l, r) => (l ? l : r),
  '??': (l, r) => l ?? r,
};

/**
 * Resolves `node` to its constant primitive value when it's statically known (including through
 * a resolved `const` binding), or `undefined` when it isn't resolvable. `visited` guards against
 * mutually-recursive const references like `const a = b; const b = a;` (TDZ at runtime).
 */
function resolveConstantPrimitiveValue(
  context: Rule.RuleContext,
  node: estree.Node,
  visited?: Set<Scope.Variable>,
): { value: ConstantPrimitive } | undefined {
  if (node.type === 'Identifier' && node.name !== 'undefined') {
    visited ??= new Set();
    const resolved = resolveConstBinding(context, node, visited);
    if (resolved) {
      return resolveConstantPrimitiveValue(context, resolved, visited);
    }
  }
  switch (node.type) {
    case 'Literal':
      if (
        node.value === null ||
        typeof node.value === 'boolean' ||
        typeof node.value === 'string' ||
        typeof node.value === 'number'
      ) {
        return { value: node.value };
      }
      if ('bigint' in node && typeof node.bigint === 'string') {
        return { value: BigInt(node.bigint) };
      }
      return undefined;
    case 'Identifier':
      if (node.name === 'undefined') {
        const variable = getVariableFromName(context, 'undefined', node);
        // global `undefined` has no user definitions; a shadowed binding does
        return !variable || variable.defs.length === 0 ? { value: undefined } : undefined;
      }
      return undefined;
    case 'TemplateLiteral':
      return node.expressions.length === 0
        ? { value: node.quasis[0].value.cooked ?? '' }
        : undefined;
    case 'UnaryExpression':
      return resolveUnary(context, node, visited);
    case 'BinaryExpression':
    case 'LogicalExpression':
      return resolveBinary(context, node, visited);
    default:
      return undefined;
  }
}

function resolveUnary(
  context: Rule.RuleContext,
  node: estree.UnaryExpression,
  visited: Set<Scope.Variable> | undefined,
): { value: ConstantPrimitive } | undefined {
  // `void X` is always undefined regardless of X
  if (node.operator === 'void') {
    return { value: undefined };
  }
  if (!UNARY_OPERATORS_PRESERVING_CONSTNESS.has(node.operator)) {
    return undefined;
  }
  const argument = resolveConstantPrimitiveValue(context, node.argument, visited);
  if (!argument) {
    return undefined;
  }
  try {
    switch (node.operator) {
      case '!':
        return { value: !argument.value };
      case '+':
        return { value: +(argument.value as never) };
      case '-':
        return { value: -(argument.value as never) };
      case 'typeof':
        return { value: typeof argument.value };
      default:
        return undefined;
    }
  } catch {
    // e.g. mixing incompatible bigint/number operands throws a TypeError at evaluation time
    return undefined;
  }
}

function resolveBinary(
  context: Rule.RuleContext,
  node: estree.BinaryExpression | estree.LogicalExpression,
  visited: Set<Scope.Variable> | undefined,
): { value: ConstantPrimitive } | undefined {
  const evaluate = BINARY_OPERATOR_EVALUATORS[node.operator];
  if (!evaluate) {
    return undefined;
  }
  const left = resolveConstantPrimitiveValue(context, node.left, visited);
  if (!left) {
    return undefined;
  }
  // short-circuiting operators don't need the right operand when it's never evaluated
  if (node.operator === '&&' && !left.value) {
    return { value: left.value };
  }
  if (node.operator === '||' && left.value) {
    return { value: left.value };
  }
  if (node.operator === '??' && left.value !== null && left.value !== undefined) {
    return { value: left.value };
  }
  const right = resolveConstantPrimitiveValue(context, node.right, visited);
  if (!right) {
    return undefined;
  }
  try {
    return { value: evaluate(left.value, right.value) };
  } catch {
    // e.g. mixing incompatible bigint/number operands throws a TypeError at evaluation time
    return undefined;
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
