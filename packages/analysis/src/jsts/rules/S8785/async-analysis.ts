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
import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import { childrenOf } from '../helpers/ancestor.js';
import { isFunctionNode } from '../helpers/ast.js';
import { getMochaCalleeParts } from '../helpers/mocha-style-test-frameworks.js';

/** Any function-like node, including named declarations used as async helpers. */
export type FunctionLike =
  | estree.FunctionDeclaration
  | estree.FunctionExpression
  | estree.ArrowFunctionExpression;

/** Type guard for any function-like node, including named function declarations used as helpers. */
export function isFunctionLike(node: estree.Node): node is FunctionLike {
  return (
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionDeclaration'
  );
}

/**
 * If `awaitNode` is an `AwaitExpression` whose argument is a `CallExpression`, returns that
 * `CallExpression`; otherwise returns `undefined`.
 */
export function getAwaitedCall(awaitNode: estree.Node): estree.CallExpression | undefined {
  if (awaitNode.type === 'AwaitExpression' && awaitNode.argument.type === 'CallExpression') {
    return awaitNode.argument;
  }
  return undefined;
}

/**
 * Finds the earliest `await` (or `for await...of`) that runs directly in the function's body,
 * i.e. not nested inside another function. Returns `undefined` when there is none.
 */
export function findFirstTopLevelAwait(
  context: Rule.RuleContext,
  callback: FunctionLike,
): estree.Node | undefined {
  if (callback.body === null) {
    return undefined;
  }
  const { sourceCode } = context;
  const stack: estree.Node[] = [callback.body];
  let earliest: estree.Node | undefined;
  let earliestStart = Infinity;
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined || isFunctionNode(current)) {
      // A nested function has its own execution context; its awaits are not top-level here.
      continue;
    }
    if (isTopLevelAwait(current)) {
      const start = sourceCode.getRange(current)[0];
      if (start < earliestStart) {
        earliest = current;
        earliestStart = start;
      }
    }
    stack.push(...childrenOf(current, sourceCode.visitorKeys));
  }
  return earliest;
}

function isTopLevelAwait(node: estree.Node): boolean {
  return (
    node.type === 'AwaitExpression' ||
    (node.type === 'ForOfStatement' && (node as estree.ForOfStatement & { await: boolean }).await)
  );
}

/**
 * Collects the test/suite registrations declared in the function body after the given await node.
 * Returns the callee of each such call, to be used as a secondary location.
 *
 * The walk descends into nested blocks (`if`, `try`, loops, ...) because a registration there is
 * dropped just like a top-level one: once the callback suspends on the await, everything that runs
 * afterwards does so too late to be registered. It stops at nested function boundaries — a test
 * inside a dropped nested suite's own callback belongs to that suite's registration, not to a
 * separate dropped registration, so only the nested suite's callee is collected.
 */
export function findTestsRegisteredAfter(
  sourceCode: SourceCode,
  callback: FunctionLike,
  awaitNode: estree.Node,
  testAndSuiteNames: Set<string>,
  beforeNode?: estree.Node,
): estree.Node[] {
  if (callback.body?.type !== 'BlockStatement') {
    return [];
  }
  // The offset at which the callback suspends. A `for await...of` suspends at the loop itself (the
  // first `iterator.next()` call, even for a synchronous iterable), so its entire body is dropped
  // too — use the loop's start. A plain `await` only drops what follows it — use the await's end.
  const suspendOffset =
    awaitNode.type === 'ForOfStatement'
      ? sourceCode.getRange(awaitNode)[0]
      : sourceCode.getRange(awaitNode)[1];
  const endOffset = beforeNode === undefined ? Infinity : sourceCode.getRange(beforeNode)[0];
  const tests: estree.Node[] = [];
  const stack: estree.Node[] = [...childrenOf(callback.body, sourceCode.visitorKeys)];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined || isFunctionNode(current)) {
      continue;
    }
    const nodeStart = sourceCode.getRange(current)[0];
    if (
      current.type === 'ExpressionStatement' &&
      current.expression.type === 'CallExpression' &&
      nodeStart >= suspendOffset &&
      nodeStart < endOffset
    ) {
      const parts = getMochaCalleeParts(current.expression.callee);
      if (parts && testAndSuiteNames.has(parts.base.name)) {
        tests.push(current.expression.callee);
        // Don't descend into the registered call: its own callback is a function boundary and any
        // tests it contains belong to its registration, not to a separate dropped one.
        continue;
      }
    }
    stack.push(...childrenOf(current, sourceCode.visitorKeys));
  }
  // The stack-based walk yields nodes out of source order; sort so secondary locations are emitted
  // deterministically (asserted in unit tests, dumped in ruling).
  return tests.sort((a, b) => sourceCode.getRange(a)[0] - sourceCode.getRange(b)[0]);
}
