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
import { Rule } from 'eslint';
import { NoTypeCheckingRuleTester, Tests } from '../../../tools/testers/rule-tester.js';
import { interceptReport } from '../../../../../src/jsts/rules/helpers/decorators/interceptor.js';
// Covers `getDeclaredVariables`, `getScope`, `getSourceCode`.
import { rule as noParameterReassignment } from '../../../../../src/jsts/rules/S1226/rule.js';
// Covers `getFilename`
import { rule as noImplicitDependencies } from '../../../../../src/jsts/rules/S4328/rule.js';
import path from 'node:path';
import { describe } from 'node:test';

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
  tests: Tests,
) {
  const ruleTester = new NoTypeCheckingRuleTester();

  ruleTester.run(name + ' (without decorator)', rule, tests);
  ruleTester.run(
    name + ' (with decorator)',
    interceptReport(rule, (ctx, descr) => ctx.report(descr)),
    tests,
  );
}
