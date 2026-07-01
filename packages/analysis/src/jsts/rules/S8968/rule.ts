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
// https://sonarsource.github.io/rspec/#/rspec/S8968/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { FUNCTION_NODES, isIdentifier } from '../helpers/ast.js';
import { isTestCase } from '../helpers/mocha.js';
import { importsModule, importsOrDependsOnModule } from '../helpers/module.js';
import * as meta from './generated-meta.js';

const messages = {
  mocha: 'Call `this.skip()` instead of returning early.',
  vitest: "Call the test context's `skip()` instead of returning early.",
  playwright: 'Call `test.skip(condition)` instead of returning early.',
  nodeTest: "Call the test context's `skip()` before returning early.",
  bun: 'Move the condition to `test.skipIf()` instead of returning early.',
};

type Framework = keyof typeof messages;

const PLAYWRIGHT_MODULES = ['@playwright/test'];
const NODE_TEST_MODULES = ['node:test'];
const BUN_MODULES = ['bun:test'];
const VITEST_MODULES = ['vitest'];
const JEST_IMPORTS = ['jest', '@jest/globals'];
const JEST_DEPENDENCIES = ['jest'];
const JASMINE_MODULES = ['jasmine', 'jasmine-core', 'jasmine-node', 'karma-jasmine'];
const AVA_MODULES = ['ava'];
const QUNIT_MODULES = ['qunit'];

/**
 * Mocha is the fallback: unlike the other four frameworks, it works off globals
 * and is not necessarily imported anywhere in the file.
 * Jest and Jasmine are excluded outright: neither has a `this.skip()`-style
 * in-body skip, so the guard-return shape this rule flags isn't actionable there.
 * AVA and QUnit both support a bare `test(name, fn)` call identical in shape to
 * node:test/Bun/Vitest, so they are excluded too: both already fail a test by
 * default when it completes without an assertion, so the misleading "passed"
 * outcome this rule targets never occurs there.
 *
 * A file's own explicit import of a covered framework is checked before the
 * Jest/Jasmine/AVA/QUnit exclusion, and takes precedence over it: those four are
 * detected via `importsOrDependsOnModule`, which also matches on the project's
 * package.json dependencies, not just this file's imports. Checking that
 * project-wide signal first would wrongly exclude an unambiguous Playwright/
 * node:test/Bun/Vitest file whenever the project also happens to depend on
 * Jest/Jasmine/AVA/QUnit for unrelated reasons (e.g. a mixed-runner monorepo, or
 * a leftover Jest devDependency during a migration).
 */
function detectFramework(context: Rule.RuleContext): Framework | 'excluded' {
  if (importsModule(context, PLAYWRIGHT_MODULES)) {
    return 'playwright';
  }
  if (importsModule(context, NODE_TEST_MODULES)) {
    return 'nodeTest';
  }
  if (importsModule(context, BUN_MODULES)) {
    return 'bun';
  }
  if (importsModule(context, VITEST_MODULES)) {
    return 'vitest';
  }
  if (importsOrDependsOnModule(context, JEST_IMPORTS, JEST_DEPENDENCIES)) {
    return 'excluded';
  }
  if (importsOrDependsOnModule(context, JASMINE_MODULES, JASMINE_MODULES)) {
    return 'excluded';
  }
  if (importsOrDependsOnModule(context, AVA_MODULES, AVA_MODULES)) {
    return 'excluded';
  }
  if (importsOrDependsOnModule(context, QUNIT_MODULES, QUNIT_MODULES)) {
    return 'excluded';
  }
  // Neither imported directly in this file nor excluded: fall back to the project's
  // dependency manifest for Playwright/Vitest, which sometimes run test files that
  // don't literally import the framework (e.g. via a shared fixture re-export).
  if (importsOrDependsOnModule(context, PLAYWRIGHT_MODULES, PLAYWRIGHT_MODULES)) {
    return 'playwright';
  }
  if (importsOrDependsOnModule(context, VITEST_MODULES, VITEST_MODULES)) {
    return 'vitest';
  }
  return 'mocha';
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    const framework = detectFramework(context);
    if (framework === 'excluded') {
      return {};
    }

    return {
      'CallExpression:exit'(node: estree.Node) {
        const call = node as estree.CallExpression;
        const callback = extractCallback(call);
        if (!callback || callback.body.type !== 'BlockStatement') {
          return;
        }

        const statements = callback.body.body;
        if (statements.length < 2 || statements[0].type !== 'IfStatement') {
          return;
        }

        const guard = statements[0];
        if (guard.alternate) {
          return;
        }

        const returnStatement = getSoleReturnWithoutValue(guard.consequent);
        if (returnStatement) {
          context.report({
            node: returnStatement,
            messageId: framework,
          });
        }
      },
    };
  },
};

/**
 * A recognized it/test call's callback, or null. Does not reuse Mocha.extractTestCase,
 * which only looks at argument index 1 and therefore misses the 3-argument
 * `test(name, options, fn)` form used by node:test and Playwright: the callback is
 * always the last argument regardless of how many arguments precede it.
 * Calls already marked `.skip` are ignored: such a test can never be misreported as
 * "passed", since it never runs at all.
 */
function extractCallback(call: estree.CallExpression): estree.Function | null {
  if (!isTestCase(call)) {
    return null;
  }
  if (
    call.callee.type === 'MemberExpression' &&
    !call.callee.computed &&
    isIdentifier(call.callee.property, 'skip')
  ) {
    return null;
  }
  const lastArgument = call.arguments[call.arguments.length - 1];
  return lastArgument && FUNCTION_NODES.includes(lastArgument.type)
    ? (lastArgument as estree.Function)
    : null;
}

/**
 * Returns the `return;` statement if `statement` is exactly that, either directly
 * or as the only statement of a block. A `return` with a value is excluded: it usually
 * returns a promise or a result for an unrelated, legitimate reason. A block with
 * more than one statement is excluded too, since some of those frameworks expect a
 * skip call to be immediately followed by `return;` (e.g. node:test's `t.skip()`).
 */
function getSoleReturnWithoutValue(statement: estree.Statement): estree.ReturnStatement | null {
  if (statement.type === 'ReturnStatement') {
    return statement.argument === null ? statement : null;
  }
  if (statement.type === 'BlockStatement' && statement.body.length === 1) {
    return getSoleReturnWithoutValue(statement.body[0]);
  }
  return null;
}
