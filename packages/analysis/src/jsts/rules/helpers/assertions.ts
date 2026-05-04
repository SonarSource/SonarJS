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
import type { Rule } from 'eslint';
import type estree from 'estree';
import { isIdentifier, isMethodCall } from './ast.js';
import { getFullyQualifiedName, importsModule, importsOrDependsOnModule } from './module.js';

const JEST_LIKE_MODULES = ['vitest', 'bun:test', '@jest/globals', '@playwright/test'];
// Jest-like test runners which expose global methods that can be used in assertions
const JEST_LIKE_GLOBAL_MODULES = ['jest', 'jasmine', '@playwright/test'];
const CHAI_LIKE_GLOBAL_MODULES = [
  'chai',
  'chai/register-assert',
  'chai/register-expect',
  'chai/register-should',
  'cypress',
];
const NODE_ASSERT_MODULES = ['assert', 'node:assert', 'assert/strict', 'node:assert/strict'];

type AssertionPredicate = 'truthy' | 'falsy' | 'defined' | 'undefined' | 'null';

/**
 * Cross-framework representation of a test assertion
 */
export type Assertion = PredicateAssertion | ComparisonAssertion;

type AssertionBase = {
  node: estree.Node;
  reportNode: estree.Node;
  negated: boolean;
};

/**
 * Covers predicate assertions:
 * Jest: `expect(value).toBeTruthy()`, `expect(value).toBeNull()`, ...
 * Node.js: `assert.ok(value)`, `assert.strictEqual(value, null)`, ...
 * chai: `assert.ok(value)`, `assert.isNull(value)`, ...
 */
type PredicateAssertion = AssertionBase & {
  kind: 'predicate';
  predicate: AssertionPredicate;
  actual: estree.Node;
};

/**
 * Covers comparision assertions:
 * Jest: `expect(value).toBe(value)`
 * Node.js: `assert.strictEqual(value, value)`
 * chai: `assert.strictEqual(value, value)`, `expect(value).toEqual(value)`, `value.should.equal(value)`, ...
 */
type ComparisonAssertion = AssertionBase & {
  kind: 'comparison';
  comparison: 'identity';
  actual: estree.Node;
  expected: estree.Node;
};

/**
 * Maps common Jest matcher names to their corresponding assertion predicates.
 * Also covers Jest-compatible assertion libraries like Vitest, Bun's test runner, etc.
 * https://jestjs.io/docs/expect
 */
const JEST_PREDICATES_MAPPING: Record<string, AssertionPredicate> = {
  toBeTruthy: 'truthy',
  toBeFalsy: 'falsy',
  toBeDefined: 'defined',
  toBeUndefined: 'undefined',
  toBeNull: 'null',
};

// https://nodejs.org/api/assert.html
type NodeAssertMethod = 'assert' | 'ok' | 'strictEqual' | 'notStrictEqual';

// https://www.chaijs.com/api/assert/
// `equal` / `notEqual` use `==` while `strictEqual` / `notStrictEqual` use `===`; both are still
// trivially decidable when one side is a freshly-created reference.
type ChaiAssertMethod =
  | 'assert'
  | 'ok'
  | 'isOk'
  | 'isNotOk'
  | 'isTrue'
  | 'isFalse'
  | 'isNull'
  | 'isNotNull'
  | 'isUndefined'
  | 'isDefined'
  | 'exists'
  | 'notExists'
  | 'equal'
  | 'notEqual'
  | 'strictEqual'
  | 'notStrictEqual';

export function extractTestAssertion(
  context: Rule.RuleContext,
  node: estree.Node,
): Assertion | null {
  // covers Jest-like assertion libraries
  if (importsOrDependsOnModule(context, JEST_LIKE_MODULES, JEST_LIKE_GLOBAL_MODULES)) {
    const assertion = extractExpectAssertion(node);
    if (assertion) {
      return assertion;
    }
  }

  // covers Chai-like assertion libraries (including Cypress expect/assert and cy.wrap().should() chains)
  if (importsOrDependsOnModule(context, CHAI_LIKE_GLOBAL_MODULES, CHAI_LIKE_GLOBAL_MODULES)) {
    const assertion =
      extractChaiAssertion(context, node, true) ?? extractCypressChainAssertion(node);
    if (assertion) {
      return assertion;
    }
  }

  // covers Node.js assert
  if (node.type === 'CallExpression' && importsModule(context, NODE_ASSERT_MODULES)) {
    return extractNodeJSAssertion(context, node);
  }

  return null;
}

function extractExpectAssertion(expectCall: estree.Node): Assertion | null {
  if (expectCall.type !== 'CallExpression') {
    return null;
  }
  if (!isMethodCall(expectCall)) {
    return null;
  }

  const matcher = expectCall.callee.property;
  const chain = extractExpectChain(expectCall.callee.object);
  if (!chain) {
    return null;
  }

  const actual = getArgumentAtIndex(chain.expectCall, 0);
  if (!actual) {
    return null;
  }

  const predicate = JEST_PREDICATES_MAPPING[matcher.name];
  if (predicate !== undefined && expectCall.arguments.length === 0) {
    return {
      kind: 'predicate',
      predicate,
      actual,
      negated: chain.negated,
      node: expectCall,
      reportNode: actual,
    };
  }

  if (matcher.name === 'toBe' && expectCall.arguments.length === 1) {
    const expected = getArgumentAtIndex(expectCall, 0);
    if (!expected) {
      return null;
    }
    return {
      kind: 'comparison',
      comparison: 'identity',
      actual,
      expected,
      negated: chain.negated,
      node: expectCall,
      reportNode: matcher,
    };
  }

  return null;
}

function extractExpectChain(node: estree.Node): {
  expectCall: estree.CallExpression;
  negated: boolean;
} | null {
  let current = node;
  let negated = false;

  while (current.type === 'MemberExpression' && !current.computed) {
    // covers cases like `expect(value).not.toBeTruthy()` where the presence of `.not` negates the assertion
    // also guards against invalid chains like `expect(value).toBeTruthy.not`
    if (negated || !isIdentifier(current.property, 'not')) {
      return null;
    }
    negated = true;
    current = current.object;
  }

  // guards against invalid expect chains
  // like `expect(value).toBeTruthy` (missing call)
  if (
    current.type !== 'CallExpression' ||
    current.arguments.length !== 1 ||
    !isIdentifier(current.callee, 'expect')
  ) {
    return null;
  }

  return { expectCall: current, negated };
}

function extractChaiAssertion(
  context: Rule.RuleContext,
  node: estree.Node,
  allowGlobal: boolean,
): Assertion | null {
  // chai supports three assertion styles:
  // assert-style (`assert.strictEqual(value, value)`)
  // expect-style (`expect(value).toBeTruthy()`)
  // should-style (`value.should.be.truthy`)
  if (node.type === 'CallExpression') {
    return (
      extractChaiAssertAssertion(context, node, allowGlobal) ??
      extractChaiExpectCallAssertion(context, node, allowGlobal) ??
      extractChaiShouldCallAssertion(node)
    );
  }

  if (node.type === 'MemberExpression') {
    return (
      extractChaiExpectPropertyAssertion(context, node, allowGlobal) ??
      extractChaiShouldPropertyAssertion(node)
    );
  }

  return null;
}

/**
 * Covers Chai's assert style assertions like `assert.strictEqual(value, value)` or `assert.ok(value)`
 */
function extractChaiAssertAssertion(
  context: Rule.RuleContext,
  node: estree.CallExpression,
  allowGlobal: boolean,
): Assertion | null {
  const assertCall = getChaiAssertCall(context, node, allowGlobal);
  if (!assertCall) {
    return null;
  }

  const predicate = getChaiAssertPredicate(assertCall.method);
  if (predicate) {
    const actual = getArgumentAtIndex(node, 0);
    if (!actual) {
      return null;
    }
    return {
      kind: 'predicate',
      predicate: predicate.predicate,
      actual,
      negated: predicate.negated,
      node,
      reportNode: actual,
    };
  }

  const actual = getArgumentAtIndex(node, 0);
  const expected = getArgumentAtIndex(node, 1);
  if (!actual || !expected) {
    return null;
  }

  return {
    kind: 'comparison',
    comparison: 'identity',
    actual,
    expected,
    negated: assertCall.method === 'notStrictEqual' || assertCall.method === 'notEqual',
    node,
    reportNode: assertCall.reportNode,
  };
}

function getChaiAssertCall(
  context: Rule.RuleContext,
  node: estree.CallExpression,
  allowGlobal: boolean,
): { method: ChaiAssertMethod; reportNode: estree.Node } | null {
  const fqnMethod = getChaiAssertMethodFromFqn(getFullyQualifiedName(context, node.callee));
  if (fqnMethod) {
    return { method: fqnMethod, reportNode: node.callee };
  }

  if (allowGlobal && isIdentifier(node.callee, 'assert')) {
    return { method: 'assert', reportNode: node.callee };
  }

  if (allowGlobal && isMethodCall(node) && isIdentifier(node.callee.object, 'assert')) {
    const method = getChaiAssertMethodFromName(node.callee.property.name);
    if (method) {
      return { method, reportNode: node.callee.property };
    }
  }

  return null;
}

function getChaiAssertMethodFromFqn(fqn: string | null): ChaiAssertMethod | null {
  if (!fqn?.startsWith('chai.assert')) {
    return null;
  }

  const [, , method] = fqn.split('.');
  return getChaiAssertMethodFromName(method ?? 'assert');
}

function getChaiAssertMethodFromName(name: string): ChaiAssertMethod | null {
  switch (name) {
    case 'assert':
    case 'ok':
    case 'isOk':
    case 'isNotOk':
    case 'isTrue':
    case 'isFalse':
    case 'isNull':
    case 'isNotNull':
    case 'isUndefined':
    case 'isDefined':
    case 'exists':
    case 'notExists':
    case 'equal':
    case 'notEqual':
    case 'strictEqual':
    case 'notStrictEqual':
      return name;
    default:
      return null;
  }
}

function getChaiAssertPredicate(
  method: ChaiAssertMethod,
): { predicate: AssertionPredicate; negated: boolean } | null {
  switch (method) {
    case 'assert':
    case 'ok':
    case 'isOk':
    case 'isTrue':
      return { predicate: 'truthy', negated: false };
    case 'isNotOk':
      return { predicate: 'truthy', negated: true };
    case 'isFalse':
      return { predicate: 'falsy', negated: false };
    case 'isNull':
      return { predicate: 'null', negated: false };
    case 'isNotNull':
      return { predicate: 'null', negated: true };
    case 'isUndefined':
      return { predicate: 'undefined', negated: false };
    case 'isDefined':
    case 'exists':
      return { predicate: 'defined', negated: false };
    case 'notExists':
      return { predicate: 'defined', negated: true };
    default:
      return null;
  }
}

/**
 * Covers Chai's expect style assertions like `expect(value).toBeTruthy()` or `expect(value).toBeNull()`
 */
function extractChaiExpectCallAssertion(
  context: Rule.RuleContext,
  node: estree.CallExpression,
  allowGlobal: boolean,
): Assertion | null {
  if (!isMethodCall(node)) {
    return null;
  }

  const matcher = node.callee.property.name;
  if (!isChaiIdentityMatcher(matcher)) {
    return null;
  }

  const chain = extractChaiExpectChain(context, node.callee.object, allowGlobal);
  if (!chain || chain.properties.includes('deep')) {
    return null;
  }

  const expected = getArgumentAtIndex(node, 0);
  if (!expected) {
    return null;
  }

  return {
    kind: 'comparison',
    comparison: 'identity',
    actual: chain.actual,
    expected,
    negated: chain.negated,
    node,
    reportNode: node.callee.property,
  };
}

function extractChaiExpectPropertyAssertion(
  context: Rule.RuleContext,
  node: estree.MemberExpression,
  allowGlobal: boolean,
): Assertion | null {
  if (node.computed || node.property.type !== 'Identifier') {
    return null;
  }

  const predicate = getChaiPropertyPredicate(node.property.name);
  if (!predicate) {
    return null;
  }

  const chain = extractChaiExpectChain(context, node.object, allowGlobal);
  if (!chain) {
    return null;
  }

  return {
    kind: 'predicate',
    predicate: predicate.predicate,
    actual: chain.actual,
    negated: chain.negated !== predicate.negated,
    node,
    reportNode: chain.actual,
  };
}

function extractChaiExpectChain(
  context: Rule.RuleContext,
  node: estree.Node,
  allowGlobal: boolean,
): { actual: estree.Node; negated: boolean; properties: string[] } | null {
  const chain = extractMemberChain(node);
  if (!chain) {
    return null;
  }

  const { base, properties } = chain;
  // chai supports `expect(target [, message])`
  if (base.type !== 'CallExpression' || base.arguments.length < 1) {
    return null;
  }

  if (!isChaiExpectCall(context, base, allowGlobal)) {
    return null;
  }

  const actual = getArgumentAtIndex(base, 0);
  if (!actual) {
    return null;
  }

  return {
    actual,
    negated: properties.includes('not'),
    properties,
  };
}

function isChaiExpectCall(
  context: Rule.RuleContext,
  node: estree.CallExpression,
  allowGlobal: boolean,
): boolean {
  return (
    getFullyQualifiedName(context, node.callee) === 'chai.expect' ||
    (allowGlobal && isIdentifier(node.callee, 'expect'))
  );
}

// covers chai's should-style assertions like `value.should.be.truthy` or `value.should.be.null`
function extractChaiShouldCallAssertion(node: estree.CallExpression): Assertion | null {
  if (!isMethodCall(node)) {
    return null;
  }

  const matcher = node.callee.property.name;
  if (!isChaiIdentityMatcher(matcher)) {
    return null;
  }

  const chain = extractChaiShouldChain(node.callee.object);
  if (!chain || chain.properties.includes('deep')) {
    return null;
  }

  const expected = getArgumentAtIndex(node, 0);
  if (!expected) {
    return null;
  }

  return {
    kind: 'comparison',
    comparison: 'identity',
    actual: chain.actual,
    expected,
    negated: chain.negated,
    node,
    reportNode: node.callee.property,
  };
}

function extractChaiShouldPropertyAssertion(node: estree.MemberExpression): Assertion | null {
  if (node.computed || node.property.type !== 'Identifier') {
    return null;
  }

  const predicate = getChaiPropertyPredicate(node.property.name);
  if (!predicate) {
    return null;
  }

  const chain = extractChaiShouldChain(node.object);
  if (!chain) {
    return null;
  }

  return {
    kind: 'predicate',
    predicate: predicate.predicate,
    actual: chain.actual,
    negated: chain.negated !== predicate.negated,
    node,
    reportNode: chain.actual,
  };
}

function extractChaiShouldChain(
  node: estree.Node,
): { actual: estree.Node; negated: boolean; properties: string[] } | null {
  const properties: string[] = [];
  let current = node;

  while (current.type === 'MemberExpression' && !current.computed) {
    if (current.property.type !== 'Identifier') {
      return null;
    }
    if (current.property.name === 'should') {
      return {
        actual: current.object,
        negated: properties.includes('not'),
        properties,
      };
    }
    properties.unshift(current.property.name);
    current = current.object;
  }

  return null;
}

function extractMemberChain(node: estree.Node): { base: estree.Node; properties: string[] } | null {
  const properties: string[] = [];
  let current = node;

  while (current.type === 'MemberExpression' && !current.computed) {
    if (current.property.type !== 'Identifier') {
      return null;
    }
    properties.unshift(current.property.name);
    current = current.object;
  }

  return { base: current, properties };
}

function isChaiIdentityMatcher(name: string): boolean {
  return name === 'equal' || name === 'equals' || name === 'eq';
}

function getChaiPropertyPredicate(
  name: string,
): { predicate: AssertionPredicate; negated: boolean } | null {
  switch (name) {
    case 'true':
    case 'ok':
      return { predicate: 'truthy', negated: false };
    case 'false':
      return { predicate: 'falsy', negated: false };
    case 'null':
      return { predicate: 'null', negated: false };
    case 'undefined':
      return { predicate: 'undefined', negated: false };
    // chai BDD `.exist` (with `.exists` alias) — checks neither null nor undefined
    case 'exist':
    case 'exists':
      return { predicate: 'defined', negated: false };
    default:
      return null;
  }
}

function extractNodeJSAssertion(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): Assertion | null {
  const assertCall = getNodeJSAssertCall(context, node);
  if (!assertCall) {
    return null;
  }

  if (assertCall.method === 'assert' || assertCall.method === 'ok') {
    const actual = getArgumentAtIndex(node, 0);
    if (!actual) {
      return null;
    }
    return {
      kind: 'predicate',
      predicate: 'truthy',
      actual,
      negated: false,
      node,
      reportNode: actual,
    };
  }

  const actual = getArgumentAtIndex(node, 0);
  const expected = getArgumentAtIndex(node, 1);
  if (!actual || !expected) {
    return null;
  }

  return {
    kind: 'comparison',
    comparison: 'identity',
    actual,
    expected,
    negated: assertCall.method === 'notStrictEqual',
    node,
    reportNode: assertCall.reportNode,
  };
}

function getNodeJSAssertCall(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): { method: NodeAssertMethod; reportNode: estree.Node } | null {
  // fully qualified assert method like `assert.strictEqual()`
  const fqnMethod = getNodeJSAssertMethodFromFqn(getFullyQualifiedName(context, node.callee));
  if (fqnMethod) {
    return { method: fqnMethod, reportNode: node.callee };
  }

  // assert method from destructured import like `const { strictEqual } = require('assert');`
  if (isMethodCall(node) && isIdentifier(node.callee.object, 'assert')) {
    const method = getNodeJSAssertMethodFromName(node.callee.property.name);
    if (method) {
      return { method, reportNode: node.callee.property };
    }
  }

  return null;
}

function getNodeJSAssertMethodFromFqn(fqn: string | null): NodeAssertMethod | null {
  switch (fqn) {
    case 'assert':
    case 'assert.strict':
      return 'assert';
    case 'assert.ok':
    case 'assert.strict.ok':
      return 'ok';
    case 'assert.strictEqual':
    case 'assert.strict.strictEqual':
      return 'strictEqual';
    case 'assert.notStrictEqual':
    case 'assert.strict.notStrictEqual':
      return 'notStrictEqual';
    default:
      return null;
  }
}

/**
 * covers cases like `const { strictEqual } = require('assert'); strictEqual(...)` or `import { strictEqual } from 'assert'; strictEqual(...)`
 */
function getNodeJSAssertMethodFromName(name: string): NodeAssertMethod | null {
  switch (name) {
    case 'ok':
    case 'strictEqual':
    case 'notStrictEqual':
      return name;
    default:
      return null;
  }
}

/**
 * Covers Cypress chain assertions like `cy.wrap(value).should('be.true')` or `cy.wrap(value).and('be.null')`.
 * The predicate is a Chai assertion string (dot-separated, optional `not.` prefix).
 */
function extractCypressChainAssertion(node: estree.Node): Assertion | null {
  if (node.type !== 'CallExpression' || !isMethodCall(node)) {
    return null;
  }
  if (!isIdentifier(node.callee.property, 'should', 'and')) {
    return null;
  }

  const predicateArg = node.arguments[0];
  if (predicateArg?.type !== 'Literal' || typeof predicateArg.value !== 'string') {
    return null;
  }

  const subject = extractCyWrapSubject(node.callee.object);
  if (!subject) {
    return null;
  }

  const parsed = parseCypressPredicateString(predicateArg.value);
  if (!parsed) {
    return null;
  }

  return {
    kind: 'predicate',
    predicate: parsed.predicate,
    actual: subject,
    negated: parsed.negated,
    node,
    reportNode: subject,
  };
}

function extractCyWrapSubject(node: estree.Node): estree.Node | null {
  if (node.type === 'CallExpression' && isMethodCall(node)) {
    if (isIdentifier(node.callee.object, 'cy') && isIdentifier(node.callee.property, 'wrap')) {
      const arg = node.arguments[0];
      return arg && arg.type !== 'SpreadElement' ? arg : null;
    }
    return extractCyWrapSubject(node.callee.object);
  }
  if (node.type === 'MemberExpression' && !node.computed) {
    return extractCyWrapSubject(node.object);
  }
  return null;
}

function parseCypressPredicateString(
  predicate: string,
): { predicate: AssertionPredicate; negated: boolean } | null {
  const parts = predicate.split('.');
  let idx = 0;

  const negated = parts[idx] === 'not';
  if (negated) {
    idx++;
  }

  // skip the `be` language chain if present
  if (parts[idx] === 'be') {
    idx++;
  }

  const result = getChaiPropertyPredicate(parts[idx]);
  return result ? { predicate: result.predicate, negated } : null;
}

function getArgumentAtIndex(node: estree.CallExpression, index: number): estree.Node | null {
  const argument = node.arguments[index];
  if (!argument || argument.type === 'SpreadElement') {
    return null;
  }
  return argument;
}
