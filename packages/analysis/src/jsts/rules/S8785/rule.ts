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
// https://sonarsource.github.io/rspec/#/rspec/S8785/javascript

import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { report, toSecondaryLocation } from '../helpers/location.js';
import { importsOrDependsOnModule, getFullyQualifiedName } from '../helpers/module.js';
import { childrenOf } from '../helpers/ancestor.js';
import { getVariableFromScope, isFunctionNode } from '../helpers/ast.js';
import {
  getMochaCalleeParts,
  SUITE_FUNCTION_NAMES,
  TEST_FUNCTION_NAMES,
} from '../helpers/mocha-style-test-frameworks.js';
import * as meta from './generated-meta.js';

/**
 * Frameworks that run a suite's callback synchronously during the discovery phase. Vitest is
 * intentionally excluded: it awaits the suite callback, so an async callback is safe there.
 * `@jest/globals` is the explicit Jest entry point (`import { describe } from '@jest/globals'`) and
 * must be treated like `jest`, mirroring S8780.
 */
const SUPPORTED_FRAMEWORKS = ['jest', '@jest/globals', 'mocha', 'cypress'];

/**
 * Suite-defining identifiers whose callback runs during discovery. `xdescribe`/`xcontext` (skip
 * variants) are intentionally absent: their tests are excluded from the run, so an async callback
 * cannot silently drop them.
 */
const SUITE_BASE_NAMES = new Set(['describe', 'context', 'suite', 'fdescribe']);

/**
 * Modifiers allowed on a raising suite form: `describe.only`, `describe.each`,
 * `describe.only.each`, etc. `skip` is excluded, which leaves `describe.skip`, `context.skip`,
 * `suite.skip`, and `describe.skip.each` out of scope.
 */
const RAISING_MODIFIERS = new Set(['only', 'each']);

/** Test- and suite-registering identifiers, used to detect the tests dropped after an `await`. */
const TEST_AND_SUITE_NAMES = new Set([...TEST_FUNCTION_NAMES, ...SUITE_FUNCTION_NAMES]);

const messages = {
  removeAsync:
    'Remove the "async" keyword from this test suite callback; a test suite callback must be synchronous.',
  moveAsyncSetup: 'Move this asynchronous work into a lifecycle hook.',
  removeAsyncQuickFix: 'Remove the "async" keyword',
  droppedTest: 'This test is declared after the await and is never registered.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages, hasSuggestions: true }),
  create(context: Rule.RuleContext) {
    if (!importsOrDependsOnModule(context, SUPPORTED_FRAMEWORKS, SUPPORTED_FRAMEWORKS)) {
      return {};
    }

    return {
      CallExpression(node: estree.CallExpression) {
        const callback = getRaisingSuiteCallback(context, node);
        if (callback?.async) {
          reportAsyncCallback(context, callback);
        }
      },
    };
  },
};

/**
 * Returns the function callback of `node` when `node` is a supported suite form that runs its
 * callback during discovery; otherwise `undefined`. Handles direct calls (`describe(name, fn)`,
 * `describe.only(name, fn)`) and the curried `.each` form (`describe.each(table)(name, fn)`), where
 * the callback lives in the outer call's arguments.
 */
function getRaisingSuiteCallback(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): estree.FunctionExpression | estree.ArrowFunctionExpression | undefined {
  const parts = getMochaCalleeParts(node.callee);
  if (parts === undefined || !SUITE_BASE_NAMES.has(parts.base.name)) {
    return undefined;
  }
  if (!parts.modifiers.every(modifier => RAISING_MODIFIERS.has(modifier))) {
    return undefined;
  }
  if (!isSupportedFrameworkConstruct(context, parts.base)) {
    return undefined;
  }
  // The callback is the function literal among the arguments. A callback passed by reference
  // (an identifier, a call, etc.) is not a literal and is intentionally not reported.
  return node.arguments.find(isSuiteCallback);
}

function isSuiteCallback(
  node: estree.Node,
): node is estree.FunctionExpression | estree.ArrowFunctionExpression {
  return node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
}

/**
 * Whether the suite identifier comes from a supported framework. An imported/required name must
 * resolve to `jest`, `@jest/globals`, `mocha`, or `cypress` (this excludes Vitest); a locally-defined
 * name is rejected; an unresolved global is accepted, since the file-level dependency gate already
 * confirmed a supported framework is in use.
 */
function isSupportedFrameworkConstruct(
  context: Rule.RuleContext,
  identifier: estree.Identifier,
): boolean {
  const variable = getVariableFromScope(context.sourceCode.getScope(identifier), identifier.name);
  if (variable && variable.defs.length > 0) {
    const fqn = getFullyQualifiedName(context, identifier);
    if (fqn === null) {
      return false;
    }
    // `getFullyQualifiedName` splits the module path on `/`, so a scoped entry point like
    // `@jest/globals` yields the prefix `@jest.globals` (not a single first segment). Match the
    // whole module prefix rather than `fqn.split('.')[0]`.
    return SUPPORTED_FRAMEWORKS.some(module => {
      const prefix = module.replaceAll('/', '.');
      return fqn === prefix || fqn.startsWith(`${prefix}.`);
    });
  }
  return true;
}

function reportAsyncCallback(
  context: Rule.RuleContext,
  callback: estree.FunctionExpression | estree.ArrowFunctionExpression,
): void {
  const topLevelAwait = findFirstTopLevelAwait(context, callback);
  if (topLevelAwait === undefined) {
    // No top-level await: every test still registers, but the `async` keyword is misleading and
    // makes the callback return a promise the framework silently ignores. A quick fix removes it.
    const asyncToken = context.sourceCode.getFirstToken(callback);
    if (asyncToken?.value !== 'async') {
      return;
    }
    const tokenAfterAsync = context.sourceCode.getTokenAfter(asyncToken);
    // This rule declares `hasSecondaries`, so the linter decodes every issue message of S8785 as
    // an encoded payload. Route this report through the `report` helper too (with no secondary
    // locations) so its message is encoded consistently; a raw `context.report` would emit a plain
    // string that the decoder fails to `JSON.parse`.
    report(context, {
      loc: asyncToken.loc,
      messageId: 'removeAsync',
      message: messages.removeAsync,
      suggest: [
        {
          messageId: 'removeAsyncQuickFix',
          fix: fixer =>
            fixer.removeRange([
              asyncToken.range[0],
              tokenAfterAsync?.range[0] ?? asyncToken.range[1],
            ]),
        },
      ],
    });
    return;
  }

  // A top-level await: the framework registers whatever was scheduled before it and moves on, so
  // tests declared afterwards are silently dropped. No safe automated fix exists.
  const secondaryLocations = findTestsRegisteredAfter(
    context.sourceCode,
    callback,
    topLevelAwait,
  ).map(test => toSecondaryLocation(test, messages.droppedTest));
  report(
    context,
    {
      messageId: 'moveAsyncSetup',
      message: messages.moveAsyncSetup,
      node: topLevelAwait,
    },
    secondaryLocations,
  );
}

/**
 * Finds the earliest `await` (or `for await...of`) that runs directly in the callback's body,
 * i.e. not nested inside another function. Returns `undefined` when there is none.
 */
function findFirstTopLevelAwait(
  context: Rule.RuleContext,
  callback: estree.FunctionExpression | estree.ArrowFunctionExpression,
): estree.Node | undefined {
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
 * Collects the test/suite registrations declared in the callback body after the given await node.
 * Returns the callee of each such call, to be used as a secondary location.
 *
 * The walk descends into nested blocks (`if`, `try`, loops, ...) because a registration there is
 * dropped just like a top-level one: once the callback suspends on the await, everything that runs
 * afterwards does so too late to be registered. It stops at nested function boundaries — a test
 * inside a dropped nested suite's own callback belongs to that suite's registration, not to a
 * separate dropped registration, so only the nested suite's callee is collected.
 */
function findTestsRegisteredAfter(
  sourceCode: SourceCode,
  callback: estree.FunctionExpression | estree.ArrowFunctionExpression,
  awaitNode: estree.Node,
): estree.Node[] {
  if (callback.body.type !== 'BlockStatement') {
    return [];
  }
  // The offset at which the callback suspends. A `for await...of` suspends at the loop itself (the
  // first `iterator.next()` call, even for a synchronous iterable), so its entire body is dropped
  // too — use the loop's start. A plain `await` only drops what follows it — use the await's end.
  const suspendOffset =
    awaitNode.type === 'ForOfStatement'
      ? sourceCode.getRange(awaitNode)[0]
      : sourceCode.getRange(awaitNode)[1];
  const tests: estree.Node[] = [];
  const stack: estree.Node[] = [...childrenOf(callback.body, sourceCode.visitorKeys)];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined || isFunctionNode(current)) {
      continue;
    }
    if (
      current.type === 'ExpressionStatement' &&
      current.expression.type === 'CallExpression' &&
      sourceCode.getRange(current)[0] >= suspendOffset
    ) {
      const parts = getMochaCalleeParts(current.expression.callee);
      if (parts && TEST_AND_SUITE_NAMES.has(parts.base.name)) {
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
