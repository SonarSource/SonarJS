/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S2187', () => {
  it('S2187', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Test files should contain at least one test case', rule, {
      valid: [
        {
          code: `/* empty main file */`,
          filename: 'foo.js',
        },
        {
          code: `
        /* a test file using 'it' */
        it('1 + 2 should give 3', () => {
            expect(1 + 2).toBe(3)
        });`,
          filename: 'foo.test.js',
        },
        {
          code: `
        /* a test file using 'it.only' */
        it.only('1 + 2 should give 3', () => {
            expect(1 + 2).toBe(3)
        });`,
          filename: 'foo.test.js',
        },
        {
          code: `
        /* a test file using 'test' */
        test('1 + 2 should give 3', () => {
            expect(1 + 2).toBe(3)
        });`,
          filename: 'foo.test.js',
        },
        {
          code: `
        /* a test file using 'test.only' */
        test.only('1 + 2 should give 3', () => {
            expect(1 + 2).toBe(3)
        });`,
          filename: 'foo.test.js',
        },
        {
          code: `
        /* a spec file using 'it' */
        it('1 + 2 should give 3', () => {
            expect(1 + 2).toBe(3)
        });`,
          filename: 'foo.spec.js',
        },
        {
          code: `test.for([
          [1, 1, 2],
          [1, 2, 3],
          [2, 1, 3],
        ])('add(%i, %i) -> %i', ([a, b, expected]) => {
          expect(a + b).toBe(expected)
        })`,
          filename: 'foo.spec.js',
        },
        {
          code: `
        const ruleTester = new NoTypeCheckingRuleTester();
        ruleTester.run('Sections of code should not be commented out', rule, {
          valid: [
            {}
          ],
        });`,
          filename: 'unit.test.ts',
        },
        {
          code: `
        /* a test file using 'it.each' with tagged template literals */
                it.each\`
            text          | expected
            ${'00003000'} | ${'3000'}
            ${'00003030'} | ${'3030'}
        \`('it should do something: $text', ({ text, expected }) => {
            const result = TextUtils.doSomething(text);
            expect(result).toStrictEqual(expected);
        });
        
        test.each\`
          a    | b    | expected
          ${1} | ${1} | ${2}
          ${1} | ${2} | ${3}
          ${2} | ${1} | ${3}
        \`('returns $expected when $a is added to $b', ({a, b, expected}) => {
          expect(a + b).toBe(expected);
        });`,
          filename: 'foo.test.js',
        },
      ],
      invalid: [
        {
          code: `/* empty test file */`,
          filename: 'foo.test.js',
          errors: [
            {
              message: 'Add some tests to this file or delete it.',
              line: 0,
              column: 1,
            },
          ],
        },
        {
          code: `/* empty spec file */`,
          filename: 'foo.spec.js',
          errors: 1,
        },
        {
          code: `it['coverage']();`,
          filename: 'foo.spec.js',
          errors: 1,
        },
      ],
    });
  });
});
