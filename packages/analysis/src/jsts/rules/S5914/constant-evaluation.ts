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
import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import type { AssertionPredicate, AssertionStyle } from '../helpers/assertions.js';
import { getVariableFromName } from '../helpers/ast.js';

export type ConstantPrimitive = boolean | string | number | bigint | null | undefined;

/**
 * Whether a resolved constant `value` satisfies the given assertion `predicate`.
 */
export function predicateHolds(predicate: AssertionPredicate, value: ConstantPrimitive): boolean {
  switch (predicate) {
    case 'truthy':
      return Boolean(value);
    case 'falsy':
      return !value;
    case 'true':
      return value === true;
    case 'false':
      return value === false;
    case 'defined':
      return value !== undefined;
    case 'undefined':
      return value === undefined;
    case 'null':
      return value === null;
    case 'exists':
      return value !== null && value !== undefined;
    default: {
      const exhaustiveCheck: never = predicate;
      return exhaustiveCheck;
    }
  }
}

/**
 * Same as `predicateHolds`, specialized for freshly-created references: they're always truthy,
 * always defined, always "existing", and never null, `=== true`, or `=== false` (a fresh
 * reference is an object, never the boolean primitive itself).
 */
export function freshReferencePredicateHolds(predicate: AssertionPredicate): boolean {
  switch (predicate) {
    case 'truthy':
    case 'defined':
    case 'exists':
      return true;
    case 'falsy':
    case 'true':
    case 'false':
    case 'undefined':
    case 'null':
      return false;
    default: {
      const exhaustiveCheck: never = predicate;
      return exhaustiveCheck;
    }
  }
}

/**
 * Whether `style`'s strict-equality matcher is documented as comparing with the SameValue
 * algorithm (`Object.is`) rather than `===`: Jest/Vitest/Bun's `toBe`, Playwright's `toBe`, and
 * Node's `assert.strictEqual`/`notStrictEqual` all state this explicitly in their docs. This
 * matters for `NaN` (`NaN === NaN` is `false`, but `Object.is(NaN, NaN)` is `true`) and signed
 * zero (`-0 === 0` is `true`, but `Object.is(-0, 0)` is `false`). Jasmine's `toBe` and chai's
 * `.equal`/`strictEqual` (including Cypress, which delegates to chai) are documented as using
 * plain `===`. This is an exhaustive switch (rather than a Set) so that adding a new
 * `AssertionStyle` forces an explicit choice instead of silently defaulting to `===`.
 */
function usesObjectIsForStrictEquality(style: AssertionStyle): boolean {
  switch (style) {
    case 'jest-like':
    case 'playwright':
    case 'node-assert':
      return true;
    case 'jasmine':
    case 'chai-bdd':
    case 'chai-assert':
    case 'cypress':
      return false;
    default: {
      const exhaustiveCheck: never = style;
      return exhaustiveCheck;
    }
  }
}

export function strictEqualityHolds(
  style: AssertionStyle,
  actual: ConstantPrimitive,
  expected: ConstantPrimitive,
): boolean {
  return usesObjectIsForStrictEquality(style) ? Object.is(actual, expected) : actual === expected;
}

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
 *
 * Equality and logical operators accept the full `ConstantPrimitive` union as-is. The rest
 * (arithmetic, relational, bitwise) reject mixed `number | bigint` operand types even when both
 * sides are individually valid, so they're narrowed to `number`: a cast rather than a behavior
 * change, since the real runtime values (and any resulting TypeError, e.g. mixing bigint and
 * number) still flow through unchanged.
 */
const BINARY_OPERATOR_EVALUATORS: {
  [K in estree.BinaryOperator | estree.LogicalOperator]?: (
    left: ConstantPrimitive,
    right: ConstantPrimitive,
  ) => ConstantPrimitive;
} = {
  '+': (l, r) => (l as number) + (r as number),
  '-': (l, r) => (l as number) - (r as number),
  '*': (l, r) => (l as number) * (r as number),
  '/': (l, r) => (l as number) / (r as number),
  '%': (l, r) => (l as number) % (r as number),
  '**': (l, r) => (l as number) ** (r as number),
  '===': (l, r) => l === r,
  '!==': (l, r) => l !== r,
  // eslint-disable-next-line eqeqeq
  '==': (l, r) => l == r,
  // eslint-disable-next-line eqeqeq
  '!=': (l, r) => l != r,
  '<': (l, r) => (l as number) < (r as number),
  '<=': (l, r) => (l as number) <= (r as number),
  '>': (l, r) => (l as number) > (r as number),
  '>=': (l, r) => (l as number) >= (r as number),
  '<<': (l, r) => (l as number) << (r as number),
  '>>': (l, r) => (l as number) >> (r as number),
  '>>>': (l, r) => (l as number) >>> (r as number),
  '&': (l, r) => (l as number) & (r as number),
  '|': (l, r) => (l as number) | (r as number),
  '^': (l, r) => (l as number) ^ (r as number),
  '&&': (l, r) => (l ? r : l),
  '||': (l, r) => l || r,
  '??': (l, r) => l ?? r,
};

/**
 * Resolves `node` to its constant primitive value when it's statically known (including through
 * a resolved `const` binding), or `undefined` when it isn't resolvable. `visited` guards against
 * mutually-recursive const references like `const a = b; const b = a;` (TDZ at runtime).
 */
export function resolveConstantPrimitiveValue(
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
      return resolveLiteral(node);
    case 'Identifier':
      return resolveUndefinedIdentifier(context, node);
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

function resolveLiteral(node: estree.Literal): { value: ConstantPrimitive } | undefined {
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
}

function resolveUndefinedIdentifier(
  context: Rule.RuleContext,
  node: estree.Identifier,
): { value: ConstantPrimitive } | undefined {
  if (node.name !== 'undefined') {
    return undefined;
  }
  const variable = getVariableFromName(context, 'undefined', node);
  // global `undefined` has no user definitions; a shadowed binding does
  return !variable || variable.defs.length === 0 ? { value: undefined } : undefined;
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
  // each operand gets its own copy of `visited`: resolving the same identifier from two
  // independent operands (e.g. `a + a`) is not a cycle, only re-entering an identifier that is
  // already being expanded along the *same* resolution chain is. Cloning from the set as it was
  // when entering this call (rather than sharing one mutable instance) keeps the two operands from
  // seeing each other's bindings while still detecting genuine cycles through an outer identifier.
  const left = resolveConstantPrimitiveValue(
    context,
    node.left,
    visited ? new Set(visited) : undefined,
  );
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
  const right = resolveConstantPrimitiveValue(
    context,
    node.right,
    visited ? new Set(visited) : undefined,
  );
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
 * Scope types that represent a distinct execution context: code inside one only runs once the
 * context itself is invoked, rather than inline with the surrounding statements.
 */
const EXECUTION_CONTEXT_SCOPE_TYPES = new Set<Scope.Scope['type']>([
  'function',
  'global',
  'module',
  'class-static-block',
]);

/**
 * Returns the nearest enclosing scope that represents a distinct execution context (function,
 * module, global, or class static block), walking up from `scope`.
 */
function getExecutionContextScope(scope: Scope.Scope): Scope.Scope {
  let current = scope;
  while (current.upper && !EXECUTION_CONTEXT_SCOPE_TYPES.has(current.type)) {
    current = current.upper;
  }
  return current;
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
  if (!node.range || !def.node.range) {
    return undefined;
  }
  // a read that textually precedes its `const` declaration is only a guaranteed temporal-dead-zone
  // violation when it runs in the same execution context as the declaration: reads deferred into a
  // nested function (e.g. a test callback) may execute after the declaration has run, so source
  // order alone can't prove a crash there. Restricting the check to the shared execution context
  // avoids false negatives on such deferred reads while still catching genuine TDZ violations.
  const readScope = context.sourceCode.getScope(node);
  const sameExecutionContext =
    getExecutionContextScope(readScope) === getExecutionContextScope(variable.scope);
  if (sameExecutionContext && node.range[0] < def.node.range[0]) {
    return undefined;
  }
  visited.add(variable);
  return def.node.init;
}
