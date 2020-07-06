/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { Rule, RuleTester } from 'eslint';
import { interceptReport } from '../../src/utils/decorators';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2018 },
});

/**
 * Checks that a decorated rule behaves exactly as the original
 * if we do not modify the `report` invocations.
 */
function runWithInterceptReportDecorator(
  name: string,
  rule: Rule.RuleModule,
  tests: {
    valid?: RuleTester.ValidTestCase[];
    invalid?: RuleTester.InvalidTestCase[];
  },
) {
  ruleTester.run(name + ' (without decorator)', rule, tests);
  ruleTester.run(
    name + ' (with decorator)',
    interceptReport(rule, (ctx, descr) => ctx.report(descr)),
    tests,
  );
}

// Covers `getDeclaredVariables`, `getScope`, `getSourceCode`.
import { rule as noParameterReassignment } from '../../src/rules/no-parameter-reassignment';
runWithInterceptReportDecorator('No parameter reassignment', noParameterReassignment, {
  valid: [{ code: 'function foo(p) { const q = 42; }' }],
  invalid: [{ code: 'function foo(p) { p = 42; }', errors: 1 }],
});

// Covers `getFilename`
import { rule as noImplicitDependencies } from '../../src/rules/no-implicit-dependencies';
import * as path from 'path';
const filename = path.join(__dirname, '../fixtures/package-json-project/file.js');
runWithInterceptReportDecorator('Dependencies should be explicit', noImplicitDependencies, {
  valid: [{ code: `const fs = require("fs");`, filename }],
  invalid: [{ code: `import "foo/bar";`, filename, errors: 1 }],
});

// Covers `markVariableAsUsed`
import { Linter } from 'eslint';
const linter = new Linter();
const noUnusedVars = linter.getRules().get('no-unused-vars');
runWithInterceptReportDecorator('No unused vars', noUnusedVars, {
  valid: [{ code: `var x = 42; console.log(x);` }],
  invalid: [{ code: `var x = 42;`, filename, errors: 1 }],
});
