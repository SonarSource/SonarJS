/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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

describe('S3696', () => {
  it('S3696', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run(`Decorated rule should provide suggestion`, rule, {
      valid: [
        {
          code: `{ throw new Error('foo'); }`,
        },
      ],
      invalid: [
        {
          code: `{ throw 'foo'; }`,
          errors: [
            {
              message: 'Expected an error object to be thrown.',
              suggestions: [
                { output: `{ throw new Error('foo'); }`, desc: 'Throw an error object' },
              ],
            },
          ],
        },
        {
          code: `{ throw 'foo' + bar(); }`,
          errors: [
            {
              message: 'Expected an error object to be thrown.',
              suggestions: [
                { output: `{ throw new Error('foo' + bar()); }`, desc: 'Throw an error object' },
              ],
            },
          ],
        },
        {
          code: `{ throw foo() + 'bar'; }`,
          errors: [
            {
              message: 'Expected an error object to be thrown.',
              suggestions: [
                { output: `{ throw new Error(foo() + 'bar'); }`, desc: 'Throw an error object' },
              ],
            },
          ],
        },
        {
          code: `{ throw 1; }`,
          errors: [{ message: 'Expected an error object to be thrown.', suggestions: [] }],
        },
        {
          code: `{ throw undefined; }`,
          errors: [{ message: 'Do not throw undefined.', suggestions: [] }],
        },
        {
          code: `{ throw 1 + 2; }`,
          errors: [{ message: 'Expected an error object to be thrown.', suggestions: [] }],
        },
      ],
    });
  });
});
