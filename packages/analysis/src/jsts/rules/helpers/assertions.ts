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
import { extractChaiAssertion } from './assertions-chai.js';
import { extractCypressChainAssertion } from './assertions-cypress.js';
import { getFullyQualifiedName, importsModule, importsOrDependsOnModule } from './module.js';

const JEST_LIKE_MODULES = ['vitest', 'bun:test', '@jest/globals'];
// Jest-like test runners which expose global methods that can be used in assertions
const JEST_LIKE_GLOBAL_MODULES = ['jest'];
const JASMINE_MODULES = ['jasmine'];
const JASMINE_GLOBAL_MODULES = ['jasmine', 'jasmine-core', 'jasmine-node', 'karma-jasmine'];
const PLAYWRIGHT_MODULES = ['@playwright/test'];
const CHAI_LIKE_GLOBAL_MODULES = [
  'chai',
  'chai/register-assert',
  'chai/register-expect',
  'chai/register-should',
  'cypress',
];
const NODE_ASSERT_MODULES = ['assert', 'node:assert', 'assert/strict', 'node:assert/strict'];

// `defined` is "not undefined" (matches Jest's `toBeDefined`); `exists` is the stricter
// "not null and not undefined" (matches chai's `.exist`/`assert.exists`) — they are genuinely
// different predicates, not two names for the same check.
export type AssertionPredicate = 'truthy' | 'falsy' | 'defined' | 'undefined' | 'null' | 'exists';
export type AssertionStyle =
  | 'jest-like'
  | 'jasmine'
  | 'chai-bdd'
  | 'chai-assert'
  | 'cypress'
  | 'playwright'
  | 'node-assert';

/**
 * Cross-framework representation of a test assertion
 */
export type Assertion = PredicateAssertion | ComparisonAssertion;

type AssertionBase = {
  style: AssertionStyle;
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
  comparison: 'strict' | 'deep' | 'loose';
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
type NodeAssertMethod =
  | 'assert'
  | 'ok'
  | 'looseDeepEqual'
  | 'looseNotDeepEqual'
  | 'deepEqual'
  | 'notDeepEqual'
  | 'strictEqual'
  | 'notStrictEqual'
  | 'deepStrictEqual'
  | 'notDeepStrictEqual';

type AssertionLibrary = {
  imports: string[];
  dependencies: string[];
  extract: (context: Rule.RuleContext, node: estree.Node) => Assertion | null;
};

const ASSERTION_LIBRARIES: AssertionLibrary[] = [
  {
    imports: JEST_LIKE_MODULES,
    dependencies: JEST_LIKE_GLOBAL_MODULES,
    extract: (_context, node) => extractExpectAssertion(node, 'jest-like'),
  },
  {
    imports: JASMINE_MODULES,
    dependencies: JASMINE_GLOBAL_MODULES,
    extract: (_context, node) => extractExpectAssertion(node, 'jasmine'),
  },
  {
    imports: PLAYWRIGHT_MODULES,
    dependencies: PLAYWRIGHT_MODULES,
    extract: (_context, node) => extractExpectAssertion(node, 'playwright'),
  },
  {
    imports: CHAI_LIKE_GLOBAL_MODULES,
    dependencies: CHAI_LIKE_GLOBAL_MODULES,
    extract: (context, node) =>
      extractChaiAssertion(context, node, true) ?? extractCypressChainAssertion(node),
  },
];

export function extractTestAssertion(
  context: Rule.RuleContext,
  node: estree.Node,
): Assertion | null {
  // Explicit imports in the current file are more precise than project-wide dependency signals.
  const importedAssertion = extractAssertionFromLibraries(context, node, library =>
    importsModule(context, library.imports),
  );
  if (importedAssertion) {
    return importedAssertion;
  }

  const dependencyAssertion = extractAssertionFromLibraries(context, node, library =>
    importsOrDependsOnModule(context, library.imports, library.dependencies),
  );
  if (dependencyAssertion) {
    return dependencyAssertion;
  }

  // covers Node.js assert
  if (node.type === 'CallExpression' && importsModule(context, NODE_ASSERT_MODULES)) {
    return extractNodeJSAssertion(context, node);
  }

  return null;
}

function extractAssertionFromLibraries(
  context: Rule.RuleContext,
  node: estree.Node,
  isAvailable: (library: AssertionLibrary) => boolean,
): Assertion | null {
  for (const library of ASSERTION_LIBRARIES) {
    if (!isAvailable(library)) {
      continue;
    }

    const assertion = library.extract(context, node);
    if (assertion) {
      return assertion;
    }
  }

  return null;
}

function extractExpectAssertion(expectCall: estree.Node, style: AssertionStyle): Assertion | null {
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
      style,
      kind: 'predicate',
      predicate,
      actual,
      negated: chain.negated,
      node: expectCall,
      reportNode: actual,
    };
  }

  const comparison = getJestComparison(matcher.name);
  if (comparison && expectCall.arguments.length === 1) {
    const expected = getArgumentAtIndex(expectCall, 0);
    if (!expected) {
      return null;
    }
    return {
      style,
      kind: 'comparison',
      comparison,
      actual,
      expected,
      negated: chain.negated,
      node: expectCall,
      reportNode: matcher,
    };
  }

  return null;
}

function getJestComparison(name: string): ComparisonAssertion['comparison'] | null {
  switch (name) {
    case 'toBe':
      return 'strict';
    case 'toEqual':
    case 'toStrictEqual':
      return 'deep';
    default:
      return null;
  }
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
      style: 'node-assert',
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
    style: 'node-assert',
    kind: 'comparison',
    comparison: getNodeJSComparison(assertCall.method),
    actual,
    expected,
    negated: assertCall.negated,
    node,
    reportNode: assertCall.reportNode,
  };
}

function getNodeJSComparison(method: NodeAssertMethod): ComparisonAssertion['comparison'] {
  switch (method) {
    case 'deepStrictEqual':
    case 'notDeepStrictEqual':
    case 'deepEqual':
    case 'notDeepEqual':
      return 'deep';
    case 'looseDeepEqual':
    case 'looseNotDeepEqual':
      return 'loose';
    default:
      return 'strict';
  }
}

function getNodeJSAssertCall(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): { method: NodeAssertMethod; negated: boolean; reportNode: estree.Node } | null {
  // fully qualified assert method like `assert.strictEqual()`
  const fqn = getFullyQualifiedName(context, node.callee);
  const fqnMethod = getNodeJSAssertMethodFromFqn(fqn);
  if (fqnMethod) {
    return {
      // `negated` is derived from the raw method name, before normalization renames
      // e.g. `notDeepEqual` to `looseNotDeepEqual` for a non-strict import, which would
      // otherwise no longer start with `not`.
      method: normalizeNodeJSAssertMethod(fqnMethod, isStrictNodeJSAssertFqn(fqn)),
      negated: fqnMethod.startsWith('not'),
      reportNode: node.callee,
    };
  }

  // `assert.xxx()` where `assert`'s origin isn't traceable via its fully qualified name, e.g. a
  // test-framework-provided `assert` parameter (`QUnit.test('...', assert => { assert.ok(x); })`).
  // Whether such an `assert` is the strict or non-strict variant can't be determined here, so
  // `deepEqual`/`notDeepEqual` — whose comparison kind depends on that — are left unresolved
  // rather than guessing non-strict; the unambiguous methods are still recognized.
  if (isMethodCall(node) && isIdentifier(node.callee.object, 'assert')) {
    const method = getNodeJSAssertMethodFromName(node.callee.property.name);
    if (method === 'deepEqual' || method === 'notDeepEqual') {
      return null;
    }
    if (method) {
      return {
        method: normalizeNodeJSAssertMethod(method, false),
        negated: method.startsWith('not'),
        reportNode: node.callee.property,
      };
    }
  }

  return null;
}

function normalizeNodeJSAssertMethod(
  method: NodeAssertMethod,
  isStrictAssert: boolean,
): NodeAssertMethod {
  if (method === 'deepEqual') {
    return isStrictAssert ? method : 'looseDeepEqual';
  }
  if (method === 'notDeepEqual') {
    return isStrictAssert ? method : 'looseNotDeepEqual';
  }
  return method;
}

function isStrictNodeJSAssertFqn(fqn: string | null): boolean {
  return fqn?.startsWith('assert.strict.') ?? false;
}

function getNodeJSAssertMethodFromFqn(fqn: string | null): NodeAssertMethod | null {
  switch (fqn) {
    case 'assert':
    case 'assert.strict':
      return 'assert';
    case 'assert.ok':
    case 'assert.strict.ok':
      return 'ok';
    case 'assert.deepEqual':
    case 'assert.strict.deepEqual':
      return 'deepEqual';
    case 'assert.notDeepEqual':
    case 'assert.strict.notDeepEqual':
      return 'notDeepEqual';
    case 'assert.strictEqual':
    case 'assert.strict.strictEqual':
      return 'strictEqual';
    case 'assert.notStrictEqual':
    case 'assert.strict.notStrictEqual':
      return 'notStrictEqual';
    case 'assert.deepStrictEqual':
    case 'assert.strict.deepStrictEqual':
      return 'deepStrictEqual';
    case 'assert.notDeepStrictEqual':
    case 'assert.strict.notDeepStrictEqual':
      return 'notDeepStrictEqual';
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
    case 'deepEqual':
    case 'notDeepEqual':
    case 'strictEqual':
    case 'notStrictEqual':
    case 'deepStrictEqual':
    case 'notDeepStrictEqual':
      return name;
    default:
      return null;
  }
}

function getArgumentAtIndex(node: estree.CallExpression, index: number): estree.Node | null {
  const argument = node.arguments[index];
  if (!argument || argument.type === 'SpreadElement') {
    return null;
  }
  return argument;
}
