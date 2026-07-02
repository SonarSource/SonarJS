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
import { getVariableFromName, isIdentifier, isMethodCall } from './ast.js';
import type { Assertion } from './assertions.js';
import {
  getArgumentAtIndex,
  getChaiPropertyPredicate,
  type ChaiPredicate,
} from './assertions-chai-common.js';
import { getFullyQualifiedName } from './module.js';

type ChaiComparison = 'strict' | 'deep' | 'loose';

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
  | 'notStrictEqual'
  | 'deepEqual'
  | 'notDeepEqual';

export function extractChaiAssertion(
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
      style: 'chai-assert',
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
    style: 'chai-assert',
    kind: 'comparison',
    comparison: getChaiAssertComparison(assertCall.method),
    actual,
    expected,
    negated: assertCall.method.startsWith('not'),
    node,
    reportNode: assertCall.reportNode,
  };
}

function getChaiAssertComparison(method: ChaiAssertMethod): ChaiComparison {
  switch (method) {
    case 'equal':
    case 'notEqual':
      return 'loose';
    case 'deepEqual':
    case 'notDeepEqual':
      return 'deep';
    default:
      return 'strict';
  }
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

  if (
    allowGlobal &&
    isIdentifier(node.callee, 'assert') &&
    isGlobalAssertReference(context, node)
  ) {
    return { method: 'assert', reportNode: node.callee };
  }

  if (
    allowGlobal &&
    isMethodCall(node) &&
    isIdentifier(node.callee.object, 'assert') &&
    isGlobalAssertReference(context, node)
  ) {
    const method = getChaiAssertMethodFromName(node.callee.property.name);
    if (method) {
      return { method, reportNode: node.callee.property };
    }
  }

  return null;
}

// Chai global `assert` should not steal calls from a locally-bound `assert`
// such as `import assert from 'node:assert'`.
function isGlobalAssertReference(context: Rule.RuleContext, node: estree.Node) {
  const variable = getVariableFromName(context, 'assert', node);
  return !variable || variable.defs.length === 0;
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
    case 'deepEqual':
    case 'notDeepEqual':
      return name;
    default:
      return null;
  }
}

function getChaiAssertPredicate(
  method: ChaiAssertMethod,
): { predicate: ChaiPredicate; negated: boolean } | null {
  switch (method) {
    case 'assert':
    case 'ok':
    case 'isOk':
      return { predicate: 'truthy', negated: false };
    case 'isNotOk':
      return { predicate: 'truthy', negated: true };
    // chai's `isTrue`/`isFalse` are strict (`=== true`/`=== false`), unlike `isOk`/`isNotOk`,
    // which accept any truthy/falsy value
    case 'isTrue':
      return { predicate: 'true', negated: false };
    case 'isFalse':
      return { predicate: 'false', negated: false };
    case 'isNull':
      return { predicate: 'null', negated: false };
    case 'isNotNull':
      return { predicate: 'null', negated: true };
    case 'isUndefined':
      return { predicate: 'undefined', negated: false };
    case 'isDefined':
      return { predicate: 'defined', negated: false };
    // chai's `exists`/`notExists` are stricter than `isDefined`: they require not-null AND
    // not-undefined, unlike `isDefined`, which is only "not undefined"
    case 'exists':
      return { predicate: 'exists', negated: false };
    case 'notExists':
      return { predicate: 'exists', negated: true };
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
  const comparison = getChaiComparison(matcher, node.callee.object);
  if (!comparison) {
    return null;
  }

  const chain = extractChaiExpectChain(context, node.callee.object, allowGlobal);
  if (!chain) {
    return null;
  }

  const expected = getArgumentAtIndex(node, 0);
  if (!expected) {
    return null;
  }

  return {
    style: 'chai-bdd',
    kind: 'comparison',
    comparison,
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
    style: 'chai-bdd',
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
  const comparison = getChaiComparison(matcher, node.callee.object);
  if (!comparison) {
    return null;
  }

  const chain = extractChaiShouldChain(node.callee.object);
  if (!chain) {
    return null;
  }

  const expected = getArgumentAtIndex(node, 0);
  if (!expected) {
    return null;
  }

  return {
    style: 'chai-bdd',
    kind: 'comparison',
    comparison,
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
    style: 'chai-bdd',
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

function getChaiComparison(matcher: string, chainNode: estree.Node): ChaiComparison | null {
  if (matcher === 'eql' || matcher === 'eqls') {
    return 'deep';
  }
  if (matcher === 'equal' || matcher === 'equals' || matcher === 'eq') {
    const chain = extractMemberChain(chainNode);
    return chain?.properties.includes('deep') ? 'deep' : 'strict';
  }
  return null;
}
