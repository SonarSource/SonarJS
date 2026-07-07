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

/**
 * Shared traversal helpers for walking an `expect(...).a.b.c()` style member/call
 * chain, used by rules that need to inspect the chain of matcher/modifier names
 * hung off an `expect(...)` (or similar) root call.
 */
import type estree from 'estree';
import { isIdentifier } from './ast.js';

export function unwrapChainExpression<T extends estree.Node | estree.Super>(
  node: T,
): T | estree.Expression {
  return node.type === 'ChainExpression' ? node.expression : node;
}

/**
 * Collects the chain of member names hung off `call`, furthest from the root
 * call first, e.g. for `expect(x).not.resolves.toBe(y)` called with the `toBe(y)`
 * node, returns
 * `{ segments: [{name: 'toBe', ...}, {name: 'resolves', ...}, {name: 'not', ...}], complete: true }`.
 * `complete` is `false` when a computed member or non-identifier property was hit
 * before reaching the root call, in which case `segments` only holds the
 * well-formed prefix collected so far — callers that need the full chain to be
 * a recognised, closed set of names (rather than just searching the collected
 * prefix for one specific name) should treat an incomplete chain as unresolved.
 */
export function collectCallChain(call: estree.CallExpression): {
  segments: { name: string; node: estree.Node }[];
  complete: boolean;
} {
  const segments: { name: string; node: estree.Node }[] = [];
  let current: estree.Node | estree.Super = call;

  while (current.type === 'CallExpression' || current.type === 'MemberExpression') {
    if (current.type === 'CallExpression') {
      current = unwrapChainExpression(current.callee);
      continue;
    }

    if (current.computed || !isIdentifier(current.property)) {
      return { segments, complete: false };
    }

    segments.push({ name: current.property.name, node: current.property });
    current = unwrapChainExpression(current.object);
  }

  return { segments, complete: true };
}

/**
 * Walks down from `call` to the root call of its member/call chain, e.g. for
 * `expect(x).not.resolves.toBe(y)` called with the `toBe(y)` node, returns the
 * `expect(x)` call. Tolerates computed members and non-identifier properties
 * anywhere in the chain, since finding the root call doesn't depend on the
 * chain's named segments being fully resolvable.
 */
export function getRootCall(call: estree.CallExpression): estree.CallExpression | null {
  let current: estree.Node | estree.Super = call;

  while (current.type === 'CallExpression' || current.type === 'MemberExpression') {
    if (current.type === 'CallExpression') {
      const callee: estree.Expression | estree.Super = unwrapChainExpression(current.callee);
      if (
        callee.type !== 'MemberExpression' ||
        (callee.object.type !== 'CallExpression' && callee.object.type !== 'MemberExpression')
      ) {
        return current;
      }
      current = callee;
      continue;
    }

    current = unwrapChainExpression(current.object);
  }

  return null;
}
