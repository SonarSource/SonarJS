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

const JEST_LIKE_MODULES = ['vitest', 'bun:test', '@jest/globals'];
// Jest-like test runners which expose global methods that can be used in assertions
const JEST_LIKE_GLOBAL_MODULES = ['jest'];
const NODE_ASSERT_MODULES = ['assert', 'node:assert'];

export type AssertionPredicate = 'truthy' | 'falsy' | 'defined' | 'undefined' | 'null';

/**
 * Cross-framework representation of a test assertion
 */
export type Assertion = PredicateAssertion | ComparisonAssertion;

type AssertionBase = {
  node: estree.CallExpression;
  reportNode: estree.Node;
  negated: boolean;
};

/**
 * Covers predicate assertions:
 * Jest: `expect(value).toBeTruthy()` or `expect(value).toBeNull()`
 * Node.js: `assert.ok(value)` or `assert.strictEqual(value, null)`
 */
export type PredicateAssertion = AssertionBase & {
  kind: 'predicate';
  predicate: AssertionPredicate;
  actual: estree.Node;
};

/**
 * Covers comparision assertions:
 * Jest: `expect(value).toBe(value)`
 * Node.js: `assert.strictEqual(value, value)`
 */
export type ComparisonAssertion = AssertionBase & {
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

type NodeAssertMethod = 'assert' | 'ok' | 'strictEqual' | 'notStrictEqual';

export function extractTestAssertion(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): Assertion | null {
  // covers Jest-like assertion libraries
  if (importsOrDependsOnModule(context, JEST_LIKE_MODULES, JEST_LIKE_GLOBAL_MODULES)) {
    return extractExpectAssertion(node);
  }

  // covers Node.js assert
  if (importsModule(context, NODE_ASSERT_MODULES)) {
    return extractNodeJSAssertion(context, node);
  }

  return null;
}

function extractExpectAssertion(expectCall: estree.CallExpression): Assertion | null {
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

  // `assert` called directly
  if (isIdentifier(node.callee, 'assert')) {
    return { method: 'assert', reportNode: node.callee };
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

function getArgumentAtIndex(node: estree.CallExpression, index: number): estree.Node | null {
  const argument = node.arguments[index];
  if (!argument || argument.type === 'SpreadElement') {
    return null;
  }
  return argument;
}
