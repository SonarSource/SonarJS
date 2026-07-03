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
  suggestDeepEquality: 'Replace with `{{matcher}}`.',
};

type TrivialAssertion = {
  reportNode: estree.Node;
  messageId: keyof typeof messages;
  data?: Record<string, string>;
  suggest?: Rule.SuggestionReportDescriptor[];
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages, hasSuggestions: true }),
  create(context: Rule.RuleContext) {
    function checkAssertion(node: estree.Node) {
      const assertion = extractTestAssertion(context, node);
      const trivial = assertion ? getTrivialAssertion(context, assertion) : null;
      if (trivial) {
        context.report({
          node: trivial.reportNode,
          messageId: trivial.messageId,
          data: trivial.data,
          suggest: trivial.suggest,
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
    case 'predicate':
      return resolvePredicateAssertion(context, assertion);
    case 'comparison':
      return resolveComparisonAssertion(context, assertion);
    default:
      return null;
  }
}

function resolvePredicateAssertion(
  context: Rule.RuleContext,
  assertion: Extract<Assertion, { kind: 'predicate' }>,
): TrivialAssertion | null {
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

function resolveComparisonAssertion(
  context: Rule.RuleContext,
  assertion: Extract<Assertion, { kind: 'comparison' }>,
): TrivialAssertion | null {
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
        suggest: toSuggestions(getFreshIdentitySuggestion(context, assertion)),
      };
    }
    if (isFreshReferenceExpression(assertion.expected)) {
      return {
        reportNode: assertion.expected,
        messageId: 'freshIdentity',
        data: { matcher: getDeepEqualityMatcher(assertion.style, assertion.negated) },
        suggest: toSuggestions(getFreshIdentitySuggestion(context, assertion)),
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
          ? strictEqualityHolds(assertion.style, actual.value, expected.value)
          : // eslint-disable-next-line eqeqeq
            actual.value == expected.value;
      if (equal !== assertion.negated) {
        return { reportNode: assertion.actual, messageId: 'issue' };
      }
    }
  }
  return null;
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

function strictEqualityHolds(
  style: AssertionStyle,
  actual: ConstantPrimitive,
  expected: ConstantPrimitive,
): boolean {
  return usesObjectIsForStrictEquality(style) ? Object.is(actual, expected) : actual === expected;
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
    default: {
      const exhaustiveCheck: never = style;
      return exhaustiveCheck;
    }
  }
}

type ComparisonAssertion = Extract<Assertion, { kind: 'comparison' }>;

function toSuggestions(
  suggestion: Rule.SuggestionReportDescriptor | null,
): Rule.SuggestionReportDescriptor[] | undefined {
  return suggestion ? [suggestion] : undefined;
}

/**
 * Builds the suggestion that swaps a `freshIdentity` assertion's matcher for its deep equality
 * counterpart, for the assertion's own style and negation. Returns null when the assertion's
 * shape doesn't map cleanly onto a single text edit (e.g. an unexpected AST shape).
 */
function getFreshIdentitySuggestion(
  context: Rule.RuleContext,
  assertion: ComparisonAssertion,
): Rule.SuggestionReportDescriptor | null {
  const matcher = getDeepEqualityMatcher(assertion.style, assertion.negated);
  switch (assertion.style) {
    case 'jest-like':
    case 'jasmine':
    case 'playwright':
      // reportNode is always the matcher property identifier itself (e.g. `toBe` in
      // `expect(x).toBe(y)`), so it's always safe to rename in place
      return replacePropertyIdentifier(assertion.reportNode, 'toEqual', matcher);
    case 'chai-bdd':
      // `eql` is chai's built-in alias for `.deep.equal`, so no chain restructuring is needed;
      // reportNode is always the matcher property identifier (e.g. `equal` in `.to.equal(y)`).
      // Report the inserted name (`eql`, with `not` left untouched when already present) so the
      // suggestion label matches the applied edit.
      return replacePropertyIdentifier(
        assertion.reportNode,
        'eql',
        assertion.negated ? 'not.eql' : 'eql',
      );
    case 'chai-assert':
      return replaceCalleeMethodName(
        assertion.node,
        assertion.negated ? 'notDeepEqual' : 'deepEqual',
        matcher,
      );
    case 'node-assert':
      return replaceCalleeMethodName(
        assertion.node,
        assertion.negated ? 'notDeepStrictEqual' : 'deepStrictEqual',
        matcher,
      );
    case 'cypress':
      return replaceCypressPredicateString(context, assertion, matcher);
    default: {
      const exhaustiveCheck: never = assertion.style;
      return exhaustiveCheck;
    }
  }
}

function replacePropertyIdentifier(
  reportNode: estree.Node,
  newName: string,
  matcher: string,
): Rule.SuggestionReportDescriptor | null {
  if (reportNode.type !== 'Identifier') {
    return null;
  }
  return {
    messageId: 'suggestDeepEquality',
    data: { matcher },
    fix: fixer => fixer.replaceText(reportNode, newName),
  };
}

/**
 * Replaces the method name in an `obj.method(...)` call with `newName`. Only fires when the
 * call is written as a member access: destructured/aliased imports like
 * `import { strictEqual as same } from 'node:assert'; same(x, y)` make the callee a bare
 * identifier bound to a specific function, so renaming its call site would reference an
 * undefined binding instead of fixing the assertion.
 */
function replaceCalleeMethodName(
  assertionNode: estree.Node,
  newName: string,
  matcher: string,
): Rule.SuggestionReportDescriptor | null {
  if (
    assertionNode.type !== 'CallExpression' ||
    assertionNode.callee.type !== 'MemberExpression' ||
    assertionNode.callee.computed ||
    assertionNode.callee.property.type !== 'Identifier'
  ) {
    return null;
  }
  const identifier = assertionNode.callee.property;
  return {
    messageId: 'suggestDeepEquality',
    data: { matcher },
    fix: fixer => fixer.replaceText(identifier, newName),
  };
}

/**
 * Cypress expresses the comparison as a Chai assertion string, e.g. `cy.wrap(x).should('equal', y)`,
 * so the fix rewrites the string content instead of an identifier.
 */
function replaceCypressPredicateString(
  context: Rule.RuleContext,
  assertion: ComparisonAssertion,
  matcher: string,
): Rule.SuggestionReportDescriptor | null {
  if (assertion.node.type !== 'CallExpression') {
    return null;
  }
  const predicateArg = assertion.node.arguments[0];
  if (predicateArg?.type !== 'Literal' || typeof predicateArg.value !== 'string') {
    return null;
  }
  const quote = context.sourceCode.getText(predicateArg)[0];
  const newValue = assertion.negated ? 'not.deep.equal' : 'deep.equal';
  return {
    messageId: 'suggestDeepEquality',
    data: { matcher },
    fix: fixer => fixer.replaceText(predicateArg, `${quote}${newValue}${quote}`),
  };
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
function freshReferencePredicateHolds(predicate: AssertionPredicate): boolean {
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
