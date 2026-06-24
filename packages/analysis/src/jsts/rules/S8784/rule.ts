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
} from '../helpers/mocha-style-test-frameworks.js';
import { hasSupportedAssertionLibrary, isAssertion } from '../helpers/assertion-detection.js';
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
    return {
      CallExpression(node: estree.CallExpression) {
        if (!isAssertion(context, node)) {
          return;
        }
        const statement = findEnclosingExpressionStatement(context, node);
        if (statement === undefined || reportedStatements.has(statement)) {
          return;
        }
        if (runsOutsideTestCase(context, node)) {
          reportedStatements.add(statement);
          context.report({ node: statement, messageId: 'moveAssertion' });
        }
      },
    };
  },
};

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
 * An assertion runs outside a test case when its nearest enclosing function is a
 * suite callback — `describe`/`context`/`suite` or Playwright's `test.describe` —
 * (it runs at suite-collection time), or when there is no enclosing function at
 * all (it runs at module load). Any other enclosing function — a test case, a
 * lifecycle hook, or an unrelated helper — is treated as "cannot prove it runs
 * outside a test", so we stay silent.
 */
function runsOutsideTestCase(context: Rule.RuleContext, node: estree.Node): boolean {
  const ancestors = context.sourceCode.getAncestors(node);
  const fnIndex = findEnclosingFunctionIndex(ancestors);
  if (fnIndex === -1) {
    return true; // module top level
  }
  const enclosingFunction = ancestors[fnIndex];
  const parent = ancestors[fnIndex - 1];
  return (
    parent?.type === 'CallExpression' &&
    parent.arguments.includes(enclosingFunction as estree.Expression) &&
    isSuiteCallback(context, parent)
  );
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
