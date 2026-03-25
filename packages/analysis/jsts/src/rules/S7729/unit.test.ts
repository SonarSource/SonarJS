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
import { rule } from './index.js';
import { DefaultParserRuleTester, RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S7729', () => {
  it('S7729', () => {
    const noTypeCheckingRuleTester = new DefaultParserRuleTester();

    noTypeCheckingRuleTester.run(`Doesn't raise without type information`, rule, {
      valid: [
        {
          code: `const foo = bar.find(element => isUnicorn(element), baz);`,
        },
      ],
      invalid: [],
    });

    const ruleTester = new RuleTester();
    ruleTester.run('Do not use the `this` argument in Array methods.', rule, {
      valid: [
        {
          code: `
class SomeClass {
    filter(param1: string, param2: number) {
        return null;
    }

    something(param: string) {
        return this.filter(param, 1);
    }
}`,
        },
        {
          code: `
const foo = bar.find(element => isUnicorn(element));
`,
        },
        {
          code: `
const foo = bar.map(function (element) {
  return baz.unicorn(element);
});
`,
        },
      ],
      invalid: [
        {
          code: `
const bar = [1, 2, 3];
const foo = bar.find(element => isUnicorn(element), baz);
`,
          output: `
const bar = [1, 2, 3];
const foo = bar.find(element => isUnicorn(element));
`,
          errors: 1,
        },
        {
          code: `
const bar = [1, 2, 3];
const foo = Array.from(bar, element => isUnicorn(element), baz);
`,
          output: `
const bar = [1, 2, 3];
const foo = Array.from(bar, element => isUnicorn(element));
`,
          errors: 1,
        },
        {
          code: `
const bar = [1, 2, 3];
const foo = bar.map(function (element) {
  return this.unicorn(element);
}, baz);
`,
          errors: 1,
        },
      ],
    });
  });
});
