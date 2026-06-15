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
// https://sonarsource.github.io/rspec/#/rspec/S8782/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { FUNCTION_NODES } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isDescribeCase, isLifecycleHook, isTestCase, isTestConstruct } from '../helpers/mocha.js';
import * as meta from './generated-meta.js';

const AFTER_HOOK_CONSTRUCTS = ['after', 'afterAll', 'afterEach'];

type TestCaseRange = { first: number; last: number };
type ReportFn = (expr: estree.CallExpression, messageId: string) => void;

function getDescribeBody(node: estree.CallExpression): estree.BlockStatement | null {
  const callback = node.arguments[1];
  if (!callback || !FUNCTION_NODES.includes(callback.type)) {
    return null;
  }
  const body = (callback as estree.Function).body;
  return body.type === 'BlockStatement' ? body : null;
}

function findTestCaseRange(body: estree.BlockStatement): TestCaseRange | null {
  const isTestOrSuiteStatement = (statement: estree.Statement) =>
    statement.type === 'ExpressionStatement' &&
    statement.expression.type === 'CallExpression' &&
    (isTestCase(statement.expression) || isDescribeCase(statement.expression));
  const first = body.body.findIndex(isTestOrSuiteStatement);
  if (first === -1) {
    return null;
  }
  let last = body.body.length - 1;
  while (!isTestOrSuiteStatement(body.body[last])) last--;
  return { first, last };
}

function extractLifecycleHookCall(statement: estree.Statement): estree.CallExpression | null {
  if (
    statement.type !== 'ExpressionStatement' ||
    statement.expression.type !== 'CallExpression' ||
    !isLifecycleHook(statement.expression)
  ) {
    return null;
  }
  return statement.expression;
}

function classifyHook(
  expr: estree.CallExpression,
  index: number,
  range: TestCaseRange,
  afterHooksAtTop: estree.CallExpression[],
  afterHooksAtBottom: estree.CallExpression[],
  report: ReportFn,
) {
  const isAfterHook = isTestConstruct(expr, AFTER_HOOK_CONSTRUCTS);
  if (index < range.first) {
    isAfterHook && afterHooksAtTop.push(expr);
    return;
  }
  if (index > range.last) {
    isAfterHook ? afterHooksAtBottom.push(expr) : report(expr, 'moveBeforeHook');
    return;
  }
  report(expr, isAfterHook ? 'moveAfterHook' : 'moveBeforeHook');
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      moveBeforeHook: 'Move this hook above the test cases in the same scope.',
      moveAfterHook: 'Move this hook above or below the test cases in the same scope.',
      groupAfterHook: 'Group this hook with the other after-hooks in the same scope.',
    },
  }),
  create(context: Rule.RuleContext) {
    const reportHook: ReportFn = (expr, messageId) => {
      const callee = expr.callee;
      context.report({
        node: callee.type === 'MemberExpression' ? callee.object : callee,
        messageId,
      });
    };

    return {
      CallExpression(node: estree.CallExpression) {
        if (!isDescribeCase(node)) {
          return;
        }
        const body = getDescribeBody(node);
        if (!body) {
          return;
        }
        const range = findTestCaseRange(body);
        if (!range) {
          return;
        }

        const afterHooksAtTop: estree.CallExpression[] = [];
        const afterHooksAtBottom: estree.CallExpression[] = [];

        for (const [i, statement] of body.body.entries()) {
          const expr = extractLifecycleHookCall(statement);
          if (expr) {
            classifyHook(expr, i, range, afterHooksAtTop, afterHooksAtBottom, reportHook);
          }
        }

        if (afterHooksAtTop.length === 0 || afterHooksAtBottom.length === 0) {
          return;
        }
        const minority =
          afterHooksAtTop.length < afterHooksAtBottom.length ? afterHooksAtTop : afterHooksAtBottom;
        for (const expr of minority) {
          reportHook(expr, 'groupAfterHook');
        }
      },
    };
  },
};
