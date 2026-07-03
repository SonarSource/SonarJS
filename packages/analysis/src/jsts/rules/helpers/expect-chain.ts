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
 * Collects the chain of member names hung off `call`, innermost first, e.g. for
 * `expect(x).not.resolves.toBe(y)` called with the `toBe(y)` node, returns
 * `[{name: 'toBe', ...}, {name: 'resolves', ...}, {name: 'not', ...}]`.
 * Stops (without signalling) at the first computed member or non-identifier
 * property, since neither is a recognisable named chain segment.
 */
export function collectCallChain(
  call: estree.CallExpression,
): { name: string; node: estree.Node }[] {
  const chain: { name: string; node: estree.Node }[] = [];
  let current: estree.Node | estree.Super = call;

  while (current.type === 'CallExpression' || current.type === 'MemberExpression') {
    if (current.type === 'CallExpression') {
      current = unwrapChainExpression(current.callee);
      continue;
    }

    if (current.computed || !isIdentifier(current.property)) {
      break;
    }

    chain.push({ name: current.property.name, node: current.property });
    current = unwrapChainExpression(current.object);
  }

  return chain;
}

/**
 * Walks down from `call` to the root call of its member/call chain, e.g. for
 * `expect(x).not.resolves.toBe(y)` called with the `toBe(y)` node, returns the
 * `expect(x)` call.
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
