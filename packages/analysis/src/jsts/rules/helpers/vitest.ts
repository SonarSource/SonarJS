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
import { getFullyQualifiedName } from './module.js';
import { getFullyQualifiedNameTS } from './module-ts.js';
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import ts from 'typescript';

export function isAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  const fullyQualifiedName = extractFQNforCallExpression(context, node);
  return isFQNAssertion(fullyQualifiedName);
}

export function isTSAssertion(services: ParserServicesWithTypeInformation, node: ts.Node) {
  if (node.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  const fqn = getFullyQualifiedNameTS(services, node);
  return isFQNAssertion(fqn);
}

// Vitest's compile-time type checks: never executed at runtime, idiomatic at top
// level in .test-d.ts files, so rules about assertion placement must not flag them.
const TYPE_LEVEL_ROOTS = ['vitest.expectTypeOf', 'vitest.assertType'];

// The set of valid matchers is open (custom matchers, matchers called on a stored
// result), so we cannot enumerate them. Instead, we match anything under these
// roots and then exclude the few non-assertion members below.
const ASSERTION_ROOTS = ['vitest.expect', ...TYPE_LEVEL_ROOTS];

// Static helpers on `expect` that share the `vitest.expect` root but configure or
// declare rather than assert. This set IS closed, so we carve it out by name.
const NON_ASSERTION_EXPECT_MEMBERS = new Set([
  'extend',
  'addEqualityTesters',
  'addSnapshotSerializer',
  'getState',
  'setState',
  'assertions',
  'hasAssertions',
]);

function isFQNAssertion(fqn: string | null | undefined): boolean {
  if (!fqn || !ASSERTION_ROOTS.some(root => fqn === root || fqn.startsWith(`${root}.`))) {
    return false;
  }
  const [, namespace, member] = fqn.split('.');
  return !(namespace === 'expect' && NON_ASSERTION_EXPECT_MEMBERS.has(member));
}

/**
 * Whether `node` is a call to a vitest `expect` setup/config helper
 * (`expect.extend`, `addSnapshotSerializer`, …). These are not runtime assertions
 * (see {@link isFQNAssertion}), but their arguments are type-checked — so under the
 * type-checker they act as compile-time checks. Type-aware callers may treat them
 * as such.
 */
export function isTSSetupCall(services: ParserServicesWithTypeInformation, node: ts.Node): boolean {
  if (node.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  const [, namespace, member] = (getFullyQualifiedNameTS(services, node) ?? '').split('.');
  return namespace === 'expect' && NON_ASSERTION_EXPECT_MEMBERS.has(member);
}

function extractFQNforCallExpression(context: Rule.RuleContext, node: estree.Node) {
  if (node.type !== 'CallExpression') {
    return undefined;
  }
  return getFullyQualifiedName(context, node);
}

/**
 * Whether `node` is a Vitest compile-time type check (`expectTypeOf` / `assertType`).
 * These are processed by `tsc`, never executed at runtime, so placement outside a
 * test case is idiomatic and must not be flagged.
 */
export function isTypeLevelAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  const fqn = extractFQNforCallExpression(context, node);
  if (!fqn) {
    return false;
  }
  return TYPE_LEVEL_ROOTS.some(root => fqn === root || fqn.startsWith(`${root}.`));
}
