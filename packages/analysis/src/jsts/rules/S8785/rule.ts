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
 */
const SUPPORTED_FRAMEWORKS = ['jest', 'mocha', 'cypress'];

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
  moveAsyncSetup: 'Move this asynchronous setup into a "beforeAll" or "beforeEach" hook.',
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
 * resolve to `jest`, `mocha`, or `cypress` (this excludes Vitest); a locally-defined name is
 * rejected; an unresolved global is accepted, since the file-level dependency gate already
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
    return SUPPORTED_FRAMEWORKS.includes(fqn.split('.')[0]);
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
    context.report({
      loc: asyncToken.loc,
      messageId: 'removeAsync',
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
 */
function findTestsRegisteredAfter(
  sourceCode: SourceCode,
  callback: estree.FunctionExpression | estree.ArrowFunctionExpression,
  awaitNode: estree.Node,
): estree.Node[] {
  if (callback.body.type !== 'BlockStatement') {
    return [];
  }
  const awaitEnd = sourceCode.getRange(awaitNode)[1];
  const tests: estree.Node[] = [];
  for (const statement of callback.body.body) {
    if (sourceCode.getRange(statement)[0] < awaitEnd) {
      continue;
    }
    if (
      statement.type !== 'ExpressionStatement' ||
      statement.expression.type !== 'CallExpression'
    ) {
      continue;
    }
    const parts = getMochaCalleeParts(statement.expression.callee);
    if (parts && TEST_AND_SUITE_NAMES.has(parts.base.name)) {
      tests.push(statement.expression.callee);
    }
  }
  return tests;
}
