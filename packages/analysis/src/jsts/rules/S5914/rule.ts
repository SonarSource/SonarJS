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
import {
  type Assertion,
  type AssertionStyle,
  extractTestAssertion,
} from '../helpers/assertions.js';
import { generateMeta } from '../helpers/generate-meta.js';
import {
  freshReferencePredicateHolds,
  predicateHolds,
  resolveConstantPrimitiveValue,
  strictEqualityHolds,
} from './constant-evaluation.js';
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
