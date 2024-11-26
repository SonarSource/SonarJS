/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { Rule } from 'eslint';
import { NodeRuleTester } from '../../../../tests/tools/testers/rule-tester.js';
import { interceptReport } from '../../../../src/rules/index.js';
// Covers `getDeclaredVariables`, `getScope`, `getSourceCode`.
import { rule as noParameterReassignment } from '../../../../src/rules/S1226/index.js';
// Covers `getFilename`
import { rule as noImplicitDependencies } from '../../../../src/rules/S4328/index.js';
import path from 'path';
import { describe } from 'node:test';
import { fileURLToPath } from 'node:url';

describe('interceptReport', () => {
  assertThatInterceptReportDecoratorForwardsCalls(
    'No parameter reassignment',
    noParameterReassignment,
    {
      valid: [{ code: 'function foo(p) { const q = 42; }' }],
      invalid: [{ code: 'function foo(p) { p = 42; }', errors: 1 }],
    },
  );

  const filename = path.join(import.meta.dirname, 'fixtures', 'file.js');
  assertThatInterceptReportDecoratorForwardsCalls(
    'Dependencies should be explicit',
    noImplicitDependencies,
    {
      valid: [{ code: `const fs = require("fs");`, filename }],
      invalid: [{ code: `import "foo/bar";`, filename, errors: 1 }],
    },
  );
});

function assertThatInterceptReportDecoratorForwardsCalls(
  name: string,
  rule: Rule.RuleModule,
  tests: {
    valid?: NodeRuleTester.ValidTestCase[];
    invalid?: NodeRuleTester.InvalidTestCase[];
  },
) {
  const ruleTester = new NodeRuleTester({
    parser: fileURLToPath(import.meta.resolve('@typescript-eslint/parser')),
    parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
  });

  ruleTester.run(name + ' (without decorator)', rule, tests);
  ruleTester.run(
    name + ' (with decorator)',
    interceptReport(rule, (ctx, descr) => ctx.report(descr)),
    tests,
  );
}
