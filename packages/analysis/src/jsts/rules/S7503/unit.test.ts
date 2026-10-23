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
import { rule } from './index.js';
import { RuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

import path from 'node:path';
import parser from '@typescript-eslint/parser';

describe('S7503', () => {
  it('S7503', () => {
    const ruleTester = new RuleTester({
      parser,
      parserOptions: {
        project: `./tsconfig.json`,
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });

    ruleTester.run('S7503', rule, {
      valid: [
        {
          code: `
async function foo() {
  await bar();
}
`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
async function empty() {}
`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
async function* generator() {
  yield Promise.resolve(1);
}
`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
async function withAwaitUsing() {
  await using resource = getDisposable();
}
declare function getDisposable(): AsyncDisposable;
`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
type Data = { id: number };
function init(loader: () => Promise<Data | null> = async () => null) {}
`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
type Loader = () => PromiseLike<string>;
function init(loader: Loader = async function () { return 'x'; }) {}
`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
class Service {
  constructor(private readonly loader: (() => Promise<void>) | undefined = async () => {}) {}
  run(handler: (id: number) => Promise<number> = async id => id) {}
}
`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
      ],
      invalid: [
        {
          code: `
async function foo() {
  bar();
}
`,
          errors: 1,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
class Service {
  @decorator()
  async handle() {
    return computeSync();
  }
}
declare function decorator(): MethodDecorator;
declare function computeSync(): number;
`,
          errors: 1,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
function init(loader = async () => null) {}
`,
          errors: 1,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
function init(loader: () => number | Promise<number> = async () => 1) {}
`,
          errors: 1,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
function init(loader: Function = async () => null) {}
`,
          errors: 1,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
const loader: () => Promise<null> = async () => null;
`,
          errors: 1,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
      ],
    });
  });
});
