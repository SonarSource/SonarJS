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
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

const ruleTester = new NoTypeCheckingRuleTester();

describe('S3799', () => {
  it('should allow empty object patterns as function parameters', () => {
    ruleTester.run('S3799 allows empty object patterns as parameters', rule, {
      valid: [
        {
          code: `test('example', async ({}, testInfo) => { console.log(testInfo); });`,
          options: [{ allowObjectPatternsAsParameters: true }],
        },
        {
          code: `test('example', async ({ }, testInfo) => { console.log(testInfo); });`,
          options: [{ allowObjectPatternsAsParameters: true }],
        },
        {
          code: `const _test = base.extend({ browser: async ({}, use, testInfo) => { await use(testInfo); } });`,
          options: [{ allowObjectPatternsAsParameters: true }],
        },
        {
          code: `function foo({}) {}`,
          options: [{ allowObjectPatternsAsParameters: true }],
        },
        {
          code: `const fn = ({}) => {};`,
          options: [{ allowObjectPatternsAsParameters: true }],
        },
        {
          code: `const fn = ({} = {}) => {};`,
          options: [{ allowObjectPatternsAsParameters: true }],
        },
      ],
      invalid: [],
    });
  });

  it('should still report empty patterns in non-parameter positions', () => {
    ruleTester.run('S3799 still reports non-parameter empty patterns', rule, {
      valid: [],
      invalid: [
        {
          code: `let {a: {}} = myObj;`,
          options: [{ allowObjectPatternsAsParameters: true }],
          errors: [{ messageId: 'unexpected' }],
        },
        {
          code: `let {a: []} = myObj;`,
          options: [{ allowObjectPatternsAsParameters: true }],
          errors: [{ messageId: 'unexpected' }],
        },
        {
          code: `let {} = myObj;`,
          options: [{ allowObjectPatternsAsParameters: true }],
          errors: [{ messageId: 'unexpected' }],
        },
        {
          code: `let [] = myArr;`,
          options: [{ allowObjectPatternsAsParameters: true }],
          errors: [{ messageId: 'unexpected' }],
        },
      ],
    });
  });

  it('should still report empty array patterns as function parameters', () => {
    ruleTester.run('S3799 still reports empty array patterns as parameters', rule, {
      valid: [],
      invalid: [
        {
          code: `function foo([]) {}`,
          options: [{ allowObjectPatternsAsParameters: true }],
          errors: [{ messageId: 'unexpected' }],
        },
        {
          code: `function foo({p: []}) {}`,
          options: [{ allowObjectPatternsAsParameters: true }],
          errors: [{ messageId: 'unexpected' }],
        },
      ],
    });
  });
});
