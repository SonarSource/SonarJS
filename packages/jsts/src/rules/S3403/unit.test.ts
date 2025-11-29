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

describe('S3403', () => {
  it('S3403', () => {
    const ruleTesterJs = new DefaultParserRuleTester();
    ruleTesterJs.run(
      'Strict equality operators should not be used with dissimilar types  [js]',
      rule,
      {
        valid: [
          {
            code: `'str' === false; // not reported without type information`,
          },
        ],
        invalid: [],
      },
    );

    const ruleTesterTs = new RuleTester();
    ruleTesterTs.run(
      `Strict equality operators should not be used with dissimilar types [ts]`,
      rule,
      {
        valid: [
          {
            code: `
        let str = 'str', num = 5;
        str == num;`,
          },
          {
            code: `
        let str = 'str', num = 5;
        str != num;`,
          },
          {
            code: `
        let n = 4, m = 5;
        n === m;`,
          },
          {
            code: `
        let n = 4, m = 5;
        n !== m;`,
          },
          {
            code: `
        let s = 'hello', t = 'world';
        s === t;`,
          },
          {
            code: `
        let s = 'hello', t = 'world';
        s !== t;`,
          },
          {
            code: `
        let b = true, v = false;
        b === v;`,
          },
          {
            code: `
        let b = true, v = false;
        b !== v;`,
          },
          {
            code: `
        let o = {}, p = { prop: 1 };
        o === p;`,
          },
          {
            code: `
        let o = {}, p = { prop: 1 };
        o !== p;`,
          },
          {
            code: `
        let whatever, anything;
        whatever === anything;`,
          },
          {
            code: `
        let whatever, anything;
        whatever !== anything;`,
          },
          {
            code: `
        let str = 'str';
        str === any;`,
          },
          {
            code: `
        let str = 'str';
        str !== any;`,
          },
          {
            code: `
        let str = 'str', nulll = null;
        str === nulll;`,
          },
          {
            code: `
        let str = 'str', undefinedd = undefed;
        str !== undefinedd;`,
          },
          {
            code: `
        let union: (string|boolean);
        let str: string;
        union === str;`,
          },
          {
            code: `
        let union: (string|boolean);
        let str: string;
        str === union;`,
          },
          {
            code: `
        class MyClass {
          m() {
            let that = new MyClass();
            return this === that;
          }
        }`,
          },
          {
            code: `
        let str = 'str', obj = {};
        str === obj;`,
          },
          {
            code: `
        let str = 'str', obj = {};
        str !== obj;`,
          },
          {
            code: `
      const foo = Symbol('foo');
      const symbols = [ foo ];
      symbols.filter(symbol => symbol !== foo);
      `,
          },
          {
            code: `
      // FP: comparing unknown type with string
      let x: unknown;
      x === 'foo';
      `,
          },
          {
            code: `
      // False positive scenario: comparing unknown type with string literal
      // This should NOT raise an issue because unknown can be compared with any type
      class Foo<T extends Record<string, unknown>> {
        constructor(private readonly foo: T) {}

        reproduction<Key extends keyof T>(key: Key) {
          return this.foo[key] === 'foo';
        }
      }
      `,
          },
        ],
        invalid: [
          {
            code: `
        let str = 'str', num = 5;
        str === num;`,
            errors: [
              {
                message: JSON.stringify({
                  message: `Remove this "===" check; it will always be false. Did you mean to use "=="?`,
                  secondaryLocations: [
                    {
                      column: 8,
                      line: 3,
                      endColumn: 11,
                      endLine: 3,
                    },
                    {
                      column: 16,
                      line: 3,
                      endColumn: 19,
                      endLine: 3,
                    },
                  ],
                }),
                line: 3,
                column: 13,
                endLine: 3,
                endColumn: 16,
                suggestions: [
                  {
                    desc: 'Replace "===" with "=="',
                    output: `
        let str = 'str', num = 5;
        str == num;`,
                  },
                ],
              },
            ],
            settings: { sonarRuntime: true },
          },
          {
            code: `
        let str = 'str', num = 5;
        str !== num;`,
            errors: 1,
          },
          {
            code: `
        let str = 'str', bool = false;
        str === bool;`,
            errors: 1,
          },
          {
            code: `
        let str = 'str', bool = false;
        str !== bool;`,
            errors: 1,
          },
          {
            code: `'foo' !== {};`,
            errors: [
              {
                message:
                  'Remove this "!==" check; it will always be true. Did you mean to use "!="?',
                suggestions: [
                  {
                    desc: 'Replace "!==" with "!="',
                    output: `'foo' != {};`,
                  },
                ],
              },
            ],
          },
        ],
      },
    );
  });
});
