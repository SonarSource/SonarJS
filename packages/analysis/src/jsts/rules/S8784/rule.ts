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
// https://sonarsource.github.io/rspec/#/rspec/S8784/javascript
import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { FUNCTION_NODES } from '../helpers/ast.js';
import {
  getPlaywrightDescribeQualifiers,
  getPlaywrightTestQualifiers,
  isMochaTestConstruct,
  SUITE_FUNCTION_NAMES,
  TEST_FUNCTION_NAMES,
} from '../helpers/mocha-style-test-frameworks.js';
import {
  hasSupportedAssertionLibrary,
  isAssertion,
  isScriptCapableAssertion,
} from '../helpers/assertion-detection.js';
import * as meta from './generated-meta.js';

const messages = {
  moveAssertion: 'Move this assertion into a test case or a lifecycle hook.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    if (!hasSupportedAssertionLibrary(context)) {
      return {};
    }
    // Dedupe by enclosing statement: a single `expect(x).toBe(y)` produces two
    // matching CallExpressions (the inner `expect()` and the outer chained
    // call), and Cypress `.should().and()` matches per link. They all share one
    // ExpressionStatement, so we report each statement at most once.
    const reportedStatements = new Set<estree.Node>();
    // Test structure is a whole-file property, so top-level assertions are only
    // resolved at Program:exit.
    let hasTestStructure = false;
    // Top-level assertion statements → whether any matched call is script-capable.
    const topLevelStatements = new Map<estree.Node, boolean>();

    const report = (statement: estree.Node) => {
      if (!reportedStatements.has(statement)) {
        reportedStatements.add(statement);
        context.report({ node: statement, messageId: 'moveAssertion' });
      }
    };

    return {
      CallExpression(node: estree.CallExpression) {
        if (isTestStructureConstruct(context, node)) {
          hasTestStructure = true;
        }
        if (!isAssertion(context, node)) {
          return;
        }
        const statement = findEnclosingExpressionStatement(context, node);
        if (statement === undefined) {
          return;
        }
        switch (classifyPlacement(context, node)) {
          case 'inside-function':
            return; // a test case, a lifecycle hook, or an unrelated helper
          case 'suite-body':
            report(statement); // runs at suite-collection time — always misplaced
            return;
          case 'top-level': {
            const scriptCapable =
              (topLevelStatements.get(statement) ?? false) ||
              isScriptCapableAssertion(context, node);
            topLevelStatements.set(statement, scriptCapable);
            break;
          }
        }
      },
      'Program:exit'() {
        // A top-level script-capable assertion in a file with no test structure is
        // a standalone script (the assertion is the test); a runner-bound one is
        // always misplaced. Flag everything else.
        for (const [statement, scriptCapable] of topLevelStatements) {
          if (hasTestStructure || !scriptCapable) {
            report(statement);
          }
        }
      },
    };
  },
};

/**
 * Whether `call` is a recognised test-framework construct that proves the file is
 * a test file: a Mocha-style suite (`describe`/`context`/`suite`) or test case
 * (`it`/`test`/`specify`), or any Playwright `test`/`test.describe` call. It reuses
 * `isMochaTestConstruct`, so a locally-defined `describe`/`it` does not count. The
 * Playwright check mirrors `isPlaywrightDescribe`'s FQN-then-name resolution so the
 * two agree (notably for the `test` extended-fixtures pattern, where the FQN does
 * not resolve to `@playwright/test`).
 */
function isTestStructureConstruct(context: Rule.RuleContext, call: estree.CallExpression): boolean {
  return (
    isMochaTestConstruct(context, call, SUITE_FUNCTION_NAMES) ||
    isMochaTestConstruct(context, call, TEST_FUNCTION_NAMES) ||
    (getPlaywrightTestQualifiers(context, call.callee) ??
      getPlaywrightDescribeQualifiers(call.callee)) !== undefined
  );
}

/**
 * Returns the ExpressionStatement for which `node` is the (transitive)
 * expression, or `undefined` when the assertion is not used as a standalone
 * statement (e.g. as an argument, in a declaration, returned, or as an arrow
 * concise body). We only flag statement-level assertions: that is the strongest
 * signal that the assertion actually executes at this position, and it gives a
 * clean highlight target.
 *
 * The walk only climbs through the assertion's own call/member chain (including
 * `await`/`yield`/optional-chaining/non-null wrappers, which matters for
 * async-first libraries like supertest).
 */
function findEnclosingExpressionStatement(
  context: Rule.RuleContext,
  node: estree.Node,
): estree.Node | undefined {
  const ancestors = context.sourceCode.getAncestors(node);
  let child: estree.Node = node;
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const parent = ancestors[i];
    switch (parent.type) {
      case 'ExpressionStatement':
        return parent;
      case 'MemberExpression':
        if (parent.object !== child) {
          return undefined;
        }
        break;
      case 'CallExpression':
        if (parent.callee !== child) {
          return undefined;
        }
        break;
      case 'ChainExpression':
      case 'AwaitExpression':
      case 'YieldExpression':
        break;
      default:
        // TSNonNullExpression (`x!.should()`) is a TS-only node absent from the
        // estree type union; treat it as a transparent chain wrapper too.
        if ((parent.type as string) !== 'TSNonNullExpression') {
          return undefined;
        }
    }
    child = parent;
  }
  return undefined;
}

/**
 * Where an assertion sits relative to test cases:
 * - `top-level`: no enclosing function — it runs at module load.
 * - `suite-body`: its nearest enclosing function is a suite callback
 *   (`describe`/`context`/`suite` or Playwright's `test.describe`) — it runs at
 *   suite-collection time, never as part of a test.
 * - `inside-function`: any other enclosing function — a test case, a lifecycle
 *   hook, or an unrelated helper. We cannot prove it runs outside a test, so we
 *   stay silent.
 */
function classifyPlacement(
  context: Rule.RuleContext,
  node: estree.Node,
): 'top-level' | 'suite-body' | 'inside-function' {
  const ancestors = context.sourceCode.getAncestors(node);
  const fnIndex = findEnclosingFunctionIndex(ancestors);
  if (fnIndex === -1) {
    return 'top-level';
  }
  const enclosingFunction = ancestors[fnIndex];
  const parent = ancestors[fnIndex - 1];
  const isSuiteBody =
    parent?.type === 'CallExpression' &&
    parent.arguments.includes(enclosingFunction as estree.Expression) &&
    isSuiteCallback(context, parent);
  return isSuiteBody ? 'suite-body' : 'inside-function';
}

/**
 * Whether `call` is a suite declaration whose body runs at collection time:
 * a Mocha-style `describe`/`context`/`suite` (also covering Jest/Vitest/Jasmine/
 * Cypress), or Playwright's `test.describe(...)`.
 */
function isSuiteCallback(context: Rule.RuleContext, call: estree.CallExpression): boolean {
  return (
    isMochaTestConstruct(context, call, SUITE_FUNCTION_NAMES) || isPlaywrightDescribe(context, call)
  );
}

function isPlaywrightDescribe(context: Rule.RuleContext, call: estree.CallExpression): boolean {
  const qualifiers =
    getPlaywrightTestQualifiers(context, call.callee) ??
    getPlaywrightDescribeQualifiers(call.callee);
  return qualifiers?.[0] === 'describe';
}

function findEnclosingFunctionIndex(ancestors: estree.Node[]): number {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (FUNCTION_NODES.includes(ancestors[i].type)) {
      return i;
    }
  }
  return -1;
}
