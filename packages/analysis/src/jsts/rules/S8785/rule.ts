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

import type { Rule } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import { childrenOf } from '../helpers/ancestor.js';
import { isAssertion } from '../helpers/assertion-detection.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { report, toSecondaryLocation } from '../helpers/location.js';
import { importsOrDependsOnModule, getFullyQualifiedName } from '../helpers/module.js';
import { getVariableFromScope, isFunctionNode } from '../helpers/ast.js';
import {
  getMochaCalleeParts,
  SUITE_FUNCTION_NAMES,
  TEST_FUNCTION_NAMES,
} from '../helpers/mocha-style-test-frameworks.js';
import {
  isRequiredParserServices,
  type RequiredParserServices,
} from '../helpers/parser-services.js';
import { TEST_FRAMEWORK_STRUCTURE_FUNCTIONS } from '../helpers/test-frameworks.js';
import * as meta from './generated-meta.js';
import {
  findFirstTopLevelAwait,
  findTestsRegisteredAfter,
  getAwaitedCall,
  isFunctionLike,
  type FunctionLike,
} from './async-analysis.js';
import { followCallToDeclaration, followReferenceToDeclaration } from './call-to-declaration.js';

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

type RaisingSuiteCallback =
  | {
      callback: estree.FunctionExpression | estree.ArrowFunctionExpression;
      byReference: false;
    }
  | {
      callback: FunctionLike;
      byReference: true;
    };

type AsyncSuiteOutcome =
  | { kind: 'noTopLevelAwait' }
  | { kind: 'awaitedHelperReported'; skipAwait: estree.Node }
  | { kind: 'asyncSuiteReported' };

const messages = {
  removeAsync:
    'Remove the "async" keyword from this test suite callback; a test suite callback must be synchronous.',
  asyncSuiteCallback:
    'Move this async setup into a lifecycle hook or a test callback; any test declared after this "await" is silently dropped.',
  removeAsyncQuickFix: 'Remove the "async" keyword',
  droppedTest: 'This test is declared after the await and is never registered.',
  asyncHelperCall:
    'This async helper silently drops tests; remove its "async" keyword and move async setup into a lifecycle hook or a test callback.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages, hasSuggestions: true }),
  create(context: Rule.RuleContext) {
    if (!importsOrDependsOnModule(context, SUPPORTED_FRAMEWORKS, SUPPORTED_FRAMEWORKS)) {
      return {};
    }

    const parserServices = context.sourceCode.parserServices;

    return {
      CallExpression(node: estree.CallExpression) {
        const raisingSuiteCallback = getRaisingSuiteCallback(context, node, parserServices);
        if (!raisingSuiteCallback) {
          return;
        }
        visitRaisingSuiteCallback(context, parserServices, raisingSuiteCallback);
      },
    };
  },
};

function visitRaisingSuiteCallback(
  context: Rule.RuleContext,
  parserServices: Rule.RuleContext['sourceCode']['parserServices'],
  raisingSuiteCallback: RaisingSuiteCallback,
): void {
  const { callback, byReference } = raisingSuiteCallback;
  const asyncSuiteOutcome = callback.async
    ? analyzeAsyncSuiteCallback(context, parserServices, callback)
    : undefined;

  if (asyncSuiteOutcome?.kind === 'noTopLevelAwait') {
    // Async callback, no top-level await: remove the misleading async keyword.
    reportRemoveAsync(context, callback, !byReference);
  }

  if (isRequiredParserServices(parserServices)) {
    reportUnawaitedAsyncHelperCalls(
      context,
      parserServices,
      callback,
      asyncSuiteOutcome?.kind === 'awaitedHelperReported' ? asyncSuiteOutcome.skipAwait : undefined,
    );
  }
}

function analyzeAsyncSuiteCallback(
  context: Rule.RuleContext,
  parserServices: Rule.RuleContext['sourceCode']['parserServices'],
  callback: FunctionLike,
): AsyncSuiteOutcome {
  const topLevelAwait = findFirstTopLevelAwait(context, callback);
  if (!topLevelAwait) {
    return { kind: 'noTopLevelAwait' };
  }

  const awaitedHelperOutcome = tryReportAwaitedAsyncHelperCall(
    context,
    parserServices,
    callback,
    topLevelAwait,
  );
  if (awaitedHelperOutcome) {
    return awaitedHelperOutcome;
  }

  reportAsyncSuiteCallback(context, callback, topLevelAwait);
  return { kind: 'asyncSuiteReported' };
}

function tryReportAwaitedAsyncHelperCall(
  context: Rule.RuleContext,
  parserServices: Rule.RuleContext['sourceCode']['parserServices'],
  callback: FunctionLike,
  topLevelAwait: estree.Node,
): AsyncSuiteOutcome | undefined {
  if (!isRequiredParserServices(parserServices)) {
    return undefined;
  }

  const awaitedCall = getAwaitedCall(topLevelAwait);
  if (!awaitedCall) {
    return undefined;
  }

  const nextDescribeAwait =
    callback.body?.type === 'BlockStatement'
      ? findNextTopLevelAwaitAfter(context.sourceCode, callback.body, topLevelAwait)
      : undefined;
  const reported = reportAsyncHelperCall(
    context,
    parserServices,
    awaitedCall,
    callback,
    topLevelAwait,
    nextDescribeAwait,
  );
  if (!reported) {
    return undefined;
  }

  return { kind: 'awaitedHelperReported', skipAwait: topLevelAwait };
}

function reportAsyncSuiteCallback(
  context: Rule.RuleContext,
  callback: FunctionLike,
  topLevelAwait: estree.Node,
): void {
  const secondaryLocations = findTestsRegisteredAfter(
    context.sourceCode,
    callback,
    topLevelAwait,
    TEST_AND_SUITE_NAMES,
  ).map(test => toSecondaryLocation(test, messages.droppedTest));

  report(
    context,
    {
      messageId: 'asyncSuiteCallback',
      message: messages.asyncSuiteCallback,
      node: topLevelAwait,
    },
    secondaryLocations,
  );
}

/**
 * Returns the function callback of `node` when `node` is a supported suite form that runs its
 * callback during discovery; otherwise `undefined`. Handles direct calls (`describe(name, fn)`,
 * `describe.only(name, fn)`) and the curried `.each` form (`describe.each(table)(name, fn)`), where
 * the callback lives in the outer call's arguments.
 */
function getRaisingSuiteCallback(
  context: Rule.RuleContext,
  node: estree.CallExpression,
  parserServices: Rule.RuleContext['sourceCode']['parserServices'],
): RaisingSuiteCallback | undefined {
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
  const inlineCallback = node.arguments.find(isSuiteCallback);
  if (inlineCallback) {
    return { callback: inlineCallback, byReference: false };
  }
  if (!isRequiredParserServices(parserServices)) {
    return undefined;
  }
  for (const argument of node.arguments) {
    if (argument.type !== 'Identifier') {
      continue;
    }
    const decl = followReferenceToDeclaration(argument, parserServices);
    if (!decl) {
      continue;
    }
    const esTreeDecl = parserServices.tsNodeToESTreeNodeMap.get(decl) as estree.Node | undefined;
    if (!esTreeDecl || !isFunctionLike(esTreeDecl)) {
      continue;
    }
    return { callback: esTreeDecl, byReference: true };
  }
  return undefined;
}

/** Type guard for inline function callbacks (the describe callback is always an expression). */
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

function reportRemoveAsync(
  context: Rule.RuleContext,
  callback: FunctionLike,
  withQuickFix: boolean,
): void {
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
    ...(withQuickFix
      ? {
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
        }
      : {}),
  });
}

/**
 * Walks the top-level statements of `callback`'s body (not crossing function boundaries) and
 * reports `asyncHelperCall` for each `CallExpression` statement whose target is an async function
 * with at least one test registered after a top-level `await` inside it.
 *
 * `skipAwait` is an optional `AwaitExpression` node already handled by the caller (the top-level
 * await of the describe callback). Any statement whose expression IS that node is skipped.
 *
 * Returns `true` if at least one issue was reported.
 */
function reportUnawaitedAsyncHelperCalls(
  context: Rule.RuleContext,
  services: RequiredParserServices,
  callback: FunctionLike,
  skipAwait?: estree.Node,
): boolean {
  const body = callback.body;
  if (!body) {
    return false;
  }
  const { sourceCode } = context;
  let reported = false;
  // Block body: seed the stack with direct statement children.
  // Concise-body arrow (`() => expr`): seed with the qexpression itself so it falls through the
  // while loop below. The expression is identified inside the loop by `current === body`.
  const stack: estree.Node[] =
    body.type === 'BlockStatement'
      ? [...childrenOf(body, sourceCode.visitorKeys)]
      : [body];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || isFunctionNode(current)) {
      continue;
    }
    let expr: estree.Expression | null = null;
    if (current.type === 'ExpressionStatement') {
      expr = current.expression;
    } else if (body.type !== 'BlockStatement' && current === body) {
      expr = body;
    }
    if (expr === null) {
      stack.push(...childrenOf(current, sourceCode.visitorKeys));
      continue;
    }
    const nextDescribeAwait =
      body.type === 'BlockStatement'
        ? findNextTopLevelAwaitAfter(sourceCode, body, expr)
        : undefined;
    reported =
      reportAsyncHelperExpression(
        context,
        services,
        expr,
        callback,
        skipAwait,
        nextDescribeAwait,
      ) || reported;
  }
  return reported;
}

function reportAsyncHelperExpression(
  context: Rule.RuleContext,
  services: RequiredParserServices,
  expr: estree.Expression,
  callback: FunctionLike,
  skipAwait?: estree.Node,
  nextDescribeAwait?: estree.Node,
): boolean {
  // Unawaited call: helper() / () => helper()
  if (expr.type === 'CallExpression' && !shouldSkipHelperResolution(context, expr)) {
    return reportAsyncHelperCall(context, services, expr, callback);
  }
  // Awaited call: await helper() / async () => await helper()
  // Skip if this is the top-level-await already handled by the outer detection branch.
  if (
    expr.type === 'AwaitExpression' &&
    expr !== skipAwait &&
    expr.argument.type === 'CallExpression' &&
    !shouldSkipHelperResolution(context, expr.argument)
  ) {
    return reportAsyncHelperCall(
      context,
      services,
      expr.argument,
      callback,
      expr,
      nextDescribeAwait,
    );
  }
  return false;
}

function findNextTopLevelAwaitAfter(
  sourceCode: Rule.RuleContext['sourceCode'],
  body: estree.BlockStatement,
  afterNode: estree.Node,
): estree.Node | undefined {
  const afterEnd = sourceCode.getRange(afterNode)[1];
  for (const stmt of body.body) {
    if (
      stmt.type === 'ExpressionStatement' &&
      stmt.expression.type === 'AwaitExpression' &&
      sourceCode.getRange(stmt)[0] >= afterEnd
    ) {
      return stmt.expression;
    }
  }
  return undefined;
}

function shouldSkipHelperResolution(
  context: Rule.RuleContext,
  call: estree.CallExpression,
): boolean {
  const calleeParts = getMochaCalleeParts(call.callee);
  const isKnownFrameworkRegistration =
    calleeParts !== undefined &&
    TEST_FRAMEWORK_STRUCTURE_FUNCTIONS.has(calleeParts.base.name) &&
    isSupportedFrameworkConstruct(context, calleeParts.base);
  return isKnownFrameworkRegistration || isAssertion(context, call);
}

/**
 * Checks whether `callNode` targets an async function that drops tests after its first top-level
 * `await`. If so, reports `asyncHelperCall` on `callNode` with the dropped tests as secondaries.
 *
 * When `awaitNode` is provided, the call is awaited at `awaitNode` inside the describe callback,
 * so tests dropped in the describe body after `awaitNode` are also collected as secondaries.
 *
 * Returns `true` if an issue was reported.
 */
function reportAsyncHelperCall(
  context: Rule.RuleContext,
  services: RequiredParserServices,
  callNode: estree.CallExpression,
  describeCallback: FunctionLike,
  awaitNode?: estree.Node,
  nextDescribeAwait?: estree.Node,
): boolean {
  const decl = followCallToDeclaration(callNode, services);
  if (!decl) {
    return false;
  }

  // Only flag async functions.
  const isAsync = (ts.getCombinedModifierFlags(decl) & ts.ModifierFlags.Async) !== 0;
  if (!isAsync) {
    return false;
  }

  // Get the ESTree equivalent — skip cross-file declarations (no ESTree nodes available for
  // secondary locations, and we cannot confirm dropped tests without the body).
  const esTreeDecl = services.tsNodeToESTreeNodeMap.get(decl) as estree.Node | undefined;
  if (!esTreeDecl || !isFunctionLike(esTreeDecl)) {
    return false;
  }

  // Find the first top-level await inside the helper.
  const helperAwait = findFirstTopLevelAwait(context, esTreeDecl);
  if (!helperAwait) {
    return false;
  }

  // Require at least one test dropped after the await inside the helper.
  const droppedInHelper = findTestsRegisteredAfter(
    context.sourceCode,
    esTreeDecl,
    helperAwait,
    TEST_AND_SUITE_NAMES,
  );
  if (droppedInHelper.length === 0) {
    return false;
  }

  // If the call is awaited inside the describe callback, also collect tests dropped in the
  // describe body after the await expression, up to the next top-level await (if any) to avoid
  // overlapping secondaries when multiple sequential awaited helpers are reported.
  const droppedInDescribe = awaitNode
    ? findTestsRegisteredAfter(
        context.sourceCode,
        describeCallback,
        awaitNode,
        TEST_AND_SUITE_NAMES,
        nextDescribeAwait,
      )
    : [];

  const secondaryLocations = [...droppedInHelper, ...droppedInDescribe].map(test =>
    toSecondaryLocation(test, messages.droppedTest),
  );

  report(
    context,
    {
      messageId: 'asyncHelperCall',
      message: messages.asyncHelperCall,
      node: callNode,
    },
    secondaryLocations,
  );
  return true;
}
