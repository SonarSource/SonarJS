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
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  DefaultParserRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';

const fixtureFile = path.join(import.meta.dirname, 'fixtures', 'index.ts');
const ruleTester = new RuleTester({
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
  },
});

describe('S9072', () => {
  it('reports non-callable values and explicit async callbacks', () => {
    ruleTester.run('S9072', rule, {
      valid: [
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            function makeCallback(): () => void { return () => {}; }
            expect(makeCallback()).toThrow();
          `,
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            const value: any = 42;
            expect(value).toThrow();
          `,
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            const value: unknown = 42;
            expect(value).toThrow();
          `,
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            function check<T>(value: T) { expect(value).toThrow(); }
          `,
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            expect(Promise.resolve(42)).rejects.toThrow();
          `,
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            expect(Promise.resolve(42)).rejects.not.toThrow();
          `,
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            declare const value: (() => void) | string;
            expect(value).toThrow();
          `,
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            declare const value: object;
            expect(value).custom.toThrow();
          `,
        },
        {
          filename: fixtureFile,
          code: `
            import type { expect } from 'vitest';
            declare const value: object;
            expect(value).toThrow();
          `,
        },
        {
          filename: fixtureFile,
          code: `
            declare const value: object;
            expect(value).toThrow();
          `,
        },
        {
          filename: fixtureFile,
          code: `
            import { expect as importedExpect } from 'vitest';
            function expect(value: object) { return { toThrow() {} }; }
            expect({}).toThrow();
          `,
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            declare const value: object;
            expect(() => value).toThrowError();
          `,
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            declare const value: object;
            expect(value)['toThrow']();
          `,
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            expect(async function* stream() { yield 1; }).toThrow();
          `,
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            declare const value: object;
            expect(value).toThrow().foo();
          `,
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            declare const value: object;
            expect(value).not().toThrow();
          `,
        },
      ],
      invalid: [
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            declare const value: object;
            expect(value, 'must throw').toThrow();
          `,
          errors: [{ messageId: 'nonCallable', suggestions: [] }],
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            function parseConfig(input: string): object { return {}; }
            expect(parseConfig('input')).toThrow(SyntaxError);
          `,
          errors: [
            {
              messageId: 'nonCallable',
              suggestions: [
                {
                  messageId: 'wrapInCallback',
                  output: `
            import { expect } from 'vitest';
            function parseConfig(input: string): object { return {}; }
            expect(() => parseConfig('input')).toThrow(SyntaxError);
          `,
                },
              ],
            },
          ],
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            function parseConfig(input: string): object { return {}; }
            expect(parseConfig('input')).toThrowError(SyntaxError);
          `,
          errors: [
            {
              messageId: 'nonCallable',
              suggestions: [
                {
                  messageId: 'wrapInCallback',
                  output: `
            import { expect } from 'vitest';
            function parseConfig(input: string): object { return {}; }
            expect(() => parseConfig('input')).toThrowError(SyntaxError);
          `,
                },
              ],
            },
          ],
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'bun:test';
            function parseConfig(input: string): object { return {}; }
            expect(parseConfig('input')).toThrowError(SyntaxError);
          `,
          errors: [
            {
              messageId: 'nonCallable',
              suggestions: [
                {
                  messageId: 'wrapInCallback',
                  output: `
            import { expect } from 'bun:test';
            function parseConfig(input: string): object { return {}; }
            expect(() => parseConfig('input')).toThrowError(SyntaxError);
          `,
                },
              ],
            },
          ],
        },
        {
          filename: fixtureFile,
          code: `
            import { expect as check } from 'vitest';
            function parseConfig(): object { return {}; }
            check(parseConfig()).toThrow();
          `,
          errors: [
            {
              messageId: 'nonCallable',
              suggestions: [
                {
                  messageId: 'wrapInCallback',
                  output: `
            import { expect as check } from 'vitest';
            function parseConfig(): object { return {}; }
            check(() => parseConfig()).toThrow();
          `,
                },
              ],
            },
          ],
        },
        {
          filename: fixtureFile,
          code: `
            import * as vitest from 'vitest';
            declare const value: object;
            vitest.expect(value).toThrow();
          `,
          errors: [{ messageId: 'nonCallable', suggestions: [] }],
        },
        {
          filename: fixtureFile,
          code: `
            const { expect } = require('vitest');
            declare const value: object;
            expect(value).toThrow();
          `,
          errors: [{ messageId: 'nonCallable', suggestions: [] }],
        },
        {
          filename: fixtureFile,
          code: `
            declare const value: object;
            require('vitest').expect(value).toThrow();
          `,
          errors: [{ messageId: 'nonCallable', suggestions: [] }],
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            function parseConfig(): string | number { return ''; }
            expect(parseConfig()).toThrow();
          `,
          errors: [
            {
              messageId: 'nonCallable',
              suggestions: [
                {
                  messageId: 'wrapInCallback',
                  output: `
            import { expect } from 'vitest';
            function parseConfig(): string | number { return ''; }
            expect(() => parseConfig()).toThrow();
          `,
                },
              ],
            },
          ],
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            function loadUser(): Promise<void> { return Promise.resolve(); }
            expect(loadUser()).toThrow();
          `,
          errors: [
            {
              messageId: 'nonCallable',
              suggestions: [],
            },
          ],
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            function loadUser(): Promise<void> | object { return Promise.resolve(); }
            expect(loadUser()).toThrow();
          `,
          errors: [{ messageId: 'nonCallable', suggestions: [] }],
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            function parseConfig(input: string): object { return {}; }
            expect(parseConfig('input')).not.toThrow();
          `,
          errors: [
            {
              messageId: 'nonCallable',
              suggestions: [
                {
                  messageId: 'wrapInCallback',
                  output: `
            import { expect } from 'vitest';
            function parseConfig(input: string): object { return {}; }
            expect(() => parseConfig('input')).not.toThrow();
          `,
                },
              ],
            },
          ],
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'vitest';
            class Config {}
            expect(new Config()).toThrow();
          `,
          errors: [
            {
              messageId: 'nonCallable',
              suggestions: [
                {
                  messageId: 'wrapInCallback',
                  output: `
            import { expect } from 'vitest';
            class Config {}
            expect(() => new Config()).toThrow();
          `,
                },
              ],
            },
          ],
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'bun:test';
            expect(async () => { throw new Error('failure'); }).toThrow();
          `,
          errors: [
            {
              messageId: 'asyncCallback',
              suggestions: [],
            },
          ],
        },
        {
          filename: fixtureFile,
          code: `
            import { expect, test } from 'vitest';
            test('rejects', async () => {
              expect(async () => { throw new Error('failure'); }).toThrow('failure');
            });
          `,
          errors: [
            {
              messageId: 'asyncCallback',
              suggestions: [
                {
                  messageId: 'useRejectionAssertion',
                  output: `
            import { expect, test } from 'vitest';
            test('rejects', async () => {
              await expect((async () => { throw new Error('failure'); })()).rejects.toThrow('failure');
            });
          `,
                },
              ],
            },
          ],
        },
        {
          filename: fixtureFile,
          code: `
            import { expect, test } from 'vitest';
            test('rejects', async () => {
              expect(async () => { throw new Error('failure'); }).toThrowError('failure');
            });
          `,
          errors: [
            {
              messageId: 'asyncCallback',
              suggestions: [
                {
                  messageId: 'useRejectionAssertion',
                  output: `
            import { expect, test } from 'vitest';
            test('rejects', async () => {
              await expect((async () => { throw new Error('failure'); })()).rejects.toThrowError('failure');
            });
          `,
                },
              ],
            },
          ],
        },
        {
          filename: fixtureFile,
          code: `
            import { expect, test } from '@jest/globals';
            test('rejects', async () => {
              expect(async () => { throw new Error('failure'); }).not.toThrow(Error);
            });
          `,
          errors: [
            {
              messageId: 'asyncCallback',
              suggestions: [
                {
                  messageId: 'useRejectionAssertion',
                  output: `
            import { expect, test } from '@jest/globals';
            test('rejects', async () => {
              await expect((async () => { throw new Error('failure'); })()).rejects.not.toThrow(Error);
            });
          `,
                },
              ],
            },
          ],
        },
        {
          filename: fixtureFile,
          code: `
            import { beforeEach, expect } from 'bun:test';
            beforeEach(async () => {
              expect(async function loadUser() { throw new Error('failure'); }).not.toThrow(Error);
            });
          `,
          errors: [
            {
              messageId: 'asyncCallback',
              suggestions: [
                {
                  messageId: 'useRejectionAssertion',
                  output: `
            import { beforeEach, expect } from 'bun:test';
            beforeEach(async () => {
              await expect((async function loadUser() { throw new Error('failure'); })()).rejects.not.toThrow(Error);
            });
          `,
                },
              ],
            },
          ],
        },
        {
          filename: fixtureFile,
          code: `
            import { expect, test } from 'vitest';
            test('rejects', async () => {
              function check() {
                expect(async () => { throw new Error('failure'); }).toThrow();
              }
              check();
            });
          `,
          errors: [
            {
              messageId: 'asyncCallback',
              suggestions: [],
            },
          ],
        },
        {
          filename: fixtureFile,
          code: `
            import { expect, test } from 'vitest';
            test('rejects', () => {
              expect(async () => { throw new Error('failure'); }).toThrow();
            });
          `,
          errors: [
            {
              messageId: 'asyncCallback',
              suggestions: [],
            },
          ],
        },
        {
          filename: fixtureFile,
          code: `
            import { expect } from 'bun:test';
            function test(name: string, callback: () => Promise<void>) {
              callback();
            }
            test('rejects', async () => {
              expect(async () => { throw new Error('failure'); }).toThrow();
            });
          `,
          errors: [
            {
              messageId: 'asyncCallback',
              suggestions: [],
            },
          ],
        },
      ],
    });
  });

  it('does not report without type information', () => {
    const noTypeRuleTester = new DefaultParserRuleTester();
    noTypeRuleTester.run('S9072', rule, {
      valid: [
        {
          code: `
            import { expect } from 'vitest';
            expect(parseConfig()).toThrow();
          `,
        },
      ],
      invalid: [],
    });
  });
});
