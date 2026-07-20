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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { describe, it } from 'node:test';
import path from 'node:path';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';

const messageId = 'emptyDataset';

describe('S8998', () => {
  it('reports runnable Jest and Vitest parameterized declarations with empty datasets', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    const jestFixture = path.join(import.meta.dirname, 'fixtures', 'jest', 'test.js');

    ruleTester.run('Parameterized tests should not have empty datasets', rule, {
      valid: [
        {
          code: "import { test } from '@jest/globals';\ntest.each([[1]])('case %i', value => expect(value).toBe(1));",
        },
        {
          code: "import { suite } from 'vitest';\nconst cases: number[] = [[1]];\nsuite.each(cases)('case %i', () => {});",
        },
        {
          code: "import { test } from 'vitest';\nconst cases: number[] = [];\ncases.push(1);\ntest.each(cases)('case %i', () => {});",
        },
        { code: "import { test } from 'vitest';\ntest.skip.each([])('case %i', () => {});" },
        { code: "import { test } from 'vitest';\ntest.each(getCases())('case %i', () => {});" },
        {
          code: "import { test } from 'vitest';\ntest.each(getCases() as unknown[])('case %i', () => {});",
        },
        {
          code: "import { test } from 'vitest';\nconst cases = [];\nconst alias = cases;\ntest.each(alias)('case %i', () => {});",
        },
        {
          code: "import { test } from 'vitest';\nconst cases = [];\ntest.todo.each(cases)('case %i', () => {});",
        },
        { code: "import { test } from 'vitest';\ntest.each([])();" },
        {
          code: "import { test } from 'vitest';\nfunction f() {\n  const test = { each: () => () => {} };\n  test.each([])('case %i', () => {});\n}",
        },
        { code: "import { it } from 'mocha';\nit.each([])('case %i', () => {});" },
        {
          code: "import { test } from 'vitest';\nfunction f() {\n  const cases: number[] = [];\n  return () => test.each(cases)('case %i', () => {});\n}\nf();",
        },
        {
          code: "import { test } from 'vitest';\nconst cases = [];\npopulate();\ntest.each(cases)('case %i', () => {});\nfunction populate() { cases.push([1]); }",
        },
        {
          code: "import { test } from 'vitest';\nlet body = () => {};\nbody = getBody();\ntest.each([])('case %i', body);",
        },
      ],
      invalid: [
        {
          code: "import { test } from 'vitest';\ntest.each([] as const)('case %i', () => {});",
          errors: [{ messageId }],
        },
        {
          code: "import { test } from 'vitest';\ntest.each([] satisfies unknown[])('case %i', () => {});",
          errors: [{ messageId }],
        },
        {
          code: "import { test } from '@jest/globals';\nfunction body() {}\ntest.each([])('case %i', body);",
          errors: [{ messageId }],
        },
        {
          code: "import { test } from 'vitest';\nconst body = () => {};\ntest.each([])('case %i', body);",
          errors: [{ messageId }],
        },
        {
          code: "import { test } from 'bun:test';\nconst body = function () {};\ntest.each([])('case %i', body);",
          errors: [{ messageId }],
        },
        {
          code: "import { describe, test } from 'bun:test';\ntest.each([])('case %i', () => {});\ndescribe.each([])('case %i', () => {});",
          errors: [{ messageId }, { messageId }],
        },
        {
          code: "import { test as bunTest } from 'bun:test';\nconst cases = [];\nbunTest.each(cases)('case %i', () => {});\ncases.push(1);",
          errors: [{ messageId }],
        },
        {
          code: "test.each([])('case %i', () => {});",
          filename: jestFixture,
          errors: [{ messageId }],
        },
        {
          code: "import { test } from '@jest/globals';\ntest.each([])('case %i', () => {});",
          errors: [{ messageId }],
        },
        {
          code: "import { it } from 'vitest';\nit.each([])('case %i', () => {});",
          errors: [{ messageId }],
        },
        {
          code: "import { describe } from 'vitest';\ndescribe.each([])('case %i', () => {});",
          errors: [{ messageId }],
        },
        {
          code: "import { test as check } from '@jest/globals';\ncheck.failing.each([])('case %i', () => {});",
          errors: [{ messageId }],
        },
        {
          code: "const { test } = require('@jest/globals');\ntest.each([])('case %i', () => {});",
          errors: [{ messageId }],
        },
        {
          code: "import { describe } from 'vitest';\ndescribe.concurrent.each([])('case %i', () => {});\ndescribe.sequential.each([])('case %i', () => {});",
          errors: [{ messageId }, { messageId }],
        },
        {
          code: "import { suite } from 'vitest';\nconst cases: number[] = [];\nsuite.each(cases)('case %i', () => {});\ncases.push(1);",
          errors: [{ messageId }],
        },
        {
          code: "import { test } from 'vitest';\nlet cases = [];\ntest.each(cases)('case %i', () => {});\ncases = [[1]];",
          errors: [{ messageId }],
        },
        {
          code: "import { test } from 'vitest';\n{\n  const cases = [];\n  {\n    const marker = 1;\n    test.each(cases)('case %i', () => marker);\n  }\n}",
          errors: [{ messageId }],
        },
        {
          code: "import { test } from 'vitest';\ntest.only.each([])('case %i', () => {});\ntest.concurrent.each([])('case %i', () => {});\ntest.fails.each([])('case %i', () => {});\ntest.sequential.each([])('case %i', () => {});",
          errors: [{ messageId }, { messageId }, { messageId }, { messageId }],
        },
      ],
    });
  });
});
