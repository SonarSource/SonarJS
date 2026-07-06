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
import {
  isMochaTestConstruct,
  collectMemberChain,
  getPlaywrightTestQualifiers,
  PLAYWRIGHT_TEST_MODIFIERS,
  TEST_FUNCTION_NAMES,
} from '../helpers/mocha-style-test-frameworks.js';
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

const suggestionMessages = {
  suggestMochaSkip: 'Replace with `this.skip()`.',
  suggestVitestSkip: "Replace with the test context's `skip()`.",
  suggestPlaywrightSkip: 'Replace with `test.skip(condition)`.',
  suggestNodeTestSkip: "Call the test context's `skip()` before returning.",
  suggestBunSkipIf: 'Move the condition to `test.skipIf()`.',
};

const PLAYWRIGHT_MODULES = ['@playwright/test'];
const NODE_TEST_MODULES = ['node:test'];
const BUN_MODULES = ['bun:test'];
const VITEST_MODULES = ['vitest'];
const MOCHA_MODULES = ['mocha'];
const JEST_IMPORTS = ['jest', '@jest/globals'];
const JEST_DEPENDENCIES = ['jest'];
const JASMINE_MODULES = ['jasmine', 'jasmine-core', 'jasmine-node', 'karma-jasmine'];
const AVA_MODULES = ['ava'];
const QUNIT_MODULES = ['qunit'];

/**
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
 * node:test/Bun/Vitest/Mocha file whenever the project also happens to depend on
 * Jest/Jasmine/AVA/QUnit for unrelated reasons (e.g. a mixed-runner monorepo, or
 * a leftover Jest devDependency during a migration). Mocha is included in this
 * early check too: although it usually runs off globals, a file can still
 * explicitly `import { it } from 'mocha'`, and that signal must win over the
 * project-wide exclusion just like the other frameworks.
 *
 * Absent that explicit import, Mocha has no other positive signal to rely on, so
 * it's checked last via `importsOrDependsOnModule` against the project's
 * package.json dependencies. Without this dependency check, every file with no
 * other framework signal would be assumed to be Mocha, which produces false
 * positives on frameworks this rule doesn't otherwise recognize (e.g. Jasmine
 * loaded from a vendored copy rather than an npm dependency). If nothing
 * indicates Mocha either, the file is excluded rather than guessed at.
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
  if (importsModule(context, MOCHA_MODULES)) {
    return 'mocha';
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
  if (importsOrDependsOnModule(context, MOCHA_MODULES, MOCHA_MODULES)) {
    return 'mocha';
  }
  return 'excluded';
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: { ...messages, ...suggestionMessages },
    hasSuggestions: true,
  }),
  create(context: Rule.RuleContext) {
    const framework = detectFramework(context);
    if (framework === 'excluded') {
      return {};
    }

    return {
      'CallExpression:exit'(node: estree.Node) {
        const call = node as estree.CallExpression;
        const callback = extractCallback(context, call, framework);
        if (callback?.body.type !== 'BlockStatement') {
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
            suggest: buildSuggestions(context, framework, call, callback, guard),
          });
        }
      },
    };
  },
};

/**
 * A recognized it/test call's callback, or null. The callback is always the last
 * argument regardless of how many arguments precede it, to cover the 3-argument
 * `test(name, options, fn)` form used by node:test and Playwright.
 * Calls already marked `.skip` are ignored: such a test can never be misreported as
 * "passed", since it never runs at all.
 */
function extractCallback(
  context: Rule.RuleContext,
  call: estree.CallExpression,
  framework: Framework,
): estree.Function | null {
  if (!isRecognizedTestCall(context, call, framework)) {
    return null;
  }
  if (
    call.callee.type === 'MemberExpression' &&
    !call.callee.computed &&
    isIdentifier(call.callee.property, 'skip')
  ) {
    return null;
  }
  const lastArgument = call.arguments.at(-1);
  return lastArgument && FUNCTION_NODES.includes(lastArgument.type)
    ? (lastArgument as estree.Function)
    : null;
}

/**
 * Mocha and Vitest share the same `it`/`test` call shape, so aliased imports,
 * destructured `require()` bindings, and their modifier chains (`.only`,
 * `.concurrent`, Vitest's `.sequential`) are resolved through the same helper
 * already relied on by other test-related rules (e.g. S8960). `.skip` is
 * deliberately not a recognized modifier there, so a `.skip`-marked call is
 * already excluded at this stage.
 *
 * Playwright has its own `test` export and modifier set, resolved separately via
 * `getPlaywrightTestQualifiers`; only its known modifiers (plus `.skip`, filtered
 * out below) are accepted so that unrelated member chains aren't misread as tests.
 *
 * node:test and Bun aren't covered by either shared helper yet, so they keep the
 * simpler literal-name matching used before (bare `it`/`test`/`specify`, or
 * `.only`/`.skip` on top of one of those names).
 *
 * None of these helpers resolve namespace-style access (`import * as ns from
 * '...'; ns.it(...)` or `const ns = require('...'); ns.it(...)`): that's a
 * pre-existing gap in the shared FQN resolution these helpers build on, also
 * present in the other rules that already rely on them, not specific to this one.
 */
function isRecognizedTestCall(
  context: Rule.RuleContext,
  call: estree.CallExpression,
  framework: Framework,
): boolean {
  switch (framework) {
    case 'mocha':
    case 'vitest':
      return isMochaTestConstruct(context, call, TEST_FUNCTION_NAMES);
    case 'playwright': {
      const qualifiers = getPlaywrightTestQualifiers(context, call.callee);
      return (
        qualifiers !== undefined &&
        qualifiers.every(
          qualifier => qualifier === 'skip' || PLAYWRIGHT_TEST_MODIFIERS.has(qualifier),
        )
      );
    }
    case 'nodeTest':
    case 'bun':
      return isTestCase(call);
  }
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

/**
 * Builds the `suggest` fixes for the diagnostic, or undefined when the callback's shape
 * doesn't give the fix a safe place to call the framework's skip mechanism from. Each
 * framework's fix mirrors the compliant example documented in the RSPEC:
 * - Playwright's `test.skip(condition)` is always safe to insert: it doesn't depend on
 *   the callback's signature at all.
 * - node:test and Vitest's fixes call `skip()` on the callback's own test-context
 *   parameter; when the callback doesn't already declare one, there's nothing to call
 *   `skip()` on, and introducing a new parameter is left to the developer.
 * - Bun has no in-body skip call at all: the only fix is to move the condition to
 *   `test.skipIf(condition)`, which is only offered for a bare `test`/`it` call (no
 *   `.only`-style modifier chain to reconcile) whose callback takes no parameters, so
 *   the condition can't be referring to state that only exists once the test starts
 *   running (see the RSPEC's "How to fix it in Bun" section).
 * - Mocha's `this.skip()` relies on the Mocha test context, which is only bound when the
 *   callback is declared with the `function` keyword; an arrow function callback has no
 *   fix to offer.
 */
function buildSuggestions(
  context: Rule.RuleContext,
  framework: Framework,
  call: estree.CallExpression,
  callback: estree.Function,
  guard: estree.IfStatement,
): Rule.SuggestionReportDescriptor[] | undefined {
  const condition = context.sourceCode.getText(guard.test);
  switch (framework) {
    case 'playwright': {
      const { base } = collectMemberChain(call.callee);
      const calleeName = context.sourceCode.getText(base);
      return [
        {
          messageId: 'suggestPlaywrightSkip',
          fix: fixer => fixer.replaceText(guard, `${calleeName}.skip(${condition});`),
        },
      ];
    }
    case 'nodeTest': {
      const contextParamName = getFirstIdentifierParamName(callback);
      if (!contextParamName) {
        return undefined;
      }
      return [
        {
          messageId: 'suggestNodeTestSkip',
          fix: fixer =>
            fixer.replaceText(guard.consequent, `{ ${contextParamName}.skip(); return; }`),
        },
      ];
    }
    case 'vitest': {
      const skipAccessor = getVitestSkipAccessor(callback);
      if (!skipAccessor) {
        return undefined;
      }
      return [
        {
          messageId: 'suggestVitestSkip',
          fix: fixer => fixer.replaceText(guard.consequent, `{ ${skipAccessor}(); }`),
        },
      ];
    }
    case 'bun': {
      if (call.callee.type !== 'Identifier' || callback.params.length > 0) {
        return undefined;
      }
      const calleeName = call.callee.name;
      return [
        {
          messageId: 'suggestBunSkipIf',
          fix: fixer => [
            fixer.replaceText(call.callee, `${calleeName}.skipIf(${condition})`),
            removeLines(context, fixer, guard),
          ],
        },
      ];
    }
    case 'mocha': {
      if (callback.type !== 'FunctionExpression') {
        return undefined;
      }
      return [
        {
          messageId: 'suggestMochaSkip',
          fix: fixer => fixer.replaceText(guard.consequent, `{ this.skip(); }`),
        },
      ];
    }
  }
}

/**
 * Removes the whole lines a node occupies, including its leading indentation and
 * trailing newline. A plain `fixer.remove(node)` would only remove the node's own
 * range, leaving an empty (whitespace-only) line behind; this only reads correctly
 * for a statement that is the sole content of the line(s) it occupies, which is the
 * case for the `if` guard this is used on.
 */
function removeLines(
  context: Rule.RuleContext,
  fixer: Rule.RuleFixer,
  node: estree.Node,
): Rule.Fix {
  const sourceCode = context.sourceCode;
  const lineStart = sourceCode.getIndexFromLoc({ line: node.loc!.start.line, column: 0 });
  const nodeEnd = node.range![1];
  const trailingNewline = /^\r?\n/.exec(sourceCode.text.slice(nodeEnd));
  const end = nodeEnd + (trailingNewline ? trailingNewline[0].length : 0);
  return fixer.removeRange([lineStart, end]);
}

/**
 * The callback's first parameter name, when it's a plain identifier (e.g. node:test's
 * `t` in `test('...', t => { ... })`). Any other shape (no parameter, destructured,
 * default value, rest element) has no single name to call `.skip()` on.
 */
function getFirstIdentifierParamName(callback: estree.Function): string | undefined {
  const [firstParam] = callback.params;
  return firstParam?.type === 'Identifier' ? firstParam.name : undefined;
}

/**
 * An expression that evaluates to Vitest's test-context `skip` function, or undefined
 * when the callback's first parameter doesn't already expose one:
 * - `({ skip }) => {}` or `({ skip: renamed }) => {}`: the destructured local binding.
 * - `(ctx) => {}`: `ctx.skip`.
 * A parameter that doesn't grant access to `skip` (no parameter, or a destructuring
 * pattern without a `skip` property) is left alone rather than rewriting the callback's
 * signature to add one.
 */
function getVitestSkipAccessor(callback: estree.Function): string | undefined {
  const [firstParam] = callback.params;
  if (!firstParam) {
    return undefined;
  }
  if (firstParam.type === 'Identifier') {
    return `${firstParam.name}.skip`;
  }
  if (firstParam.type === 'ObjectPattern') {
    for (const property of firstParam.properties) {
      if (
        property.type === 'Property' &&
        !property.computed &&
        isIdentifier(property.key, 'skip') &&
        property.value.type === 'Identifier'
      ) {
        return property.value.name;
      }
    }
  }
  return undefined;
}
