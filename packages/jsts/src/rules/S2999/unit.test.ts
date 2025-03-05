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
import { rule } from './index.js';
import { DefaultParserRuleTester, RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S2999', () => {
  it('S2999', () => {
    const ruleTesterJs = new DefaultParserRuleTester();
    ruleTesterJs.run('"new" operators should be used with functions [js]', rule, {
      valid: [
        {
          code: `new 'str'; // not reported without type information`,
          options: [{ considerJSDoc: false }],
        },
      ],
      invalid: [],
    });

    const ruleTester = new RuleTester();
    ruleTester.run(`"new" operators should be used with functions [ts]`, rule, {
      valid: [
        {
          code: `new Promise(function (resolve, reject) {});`,
          options: [{ considerJSDoc: false }],
        },
        {
          code: `new Error('Whoops!')`,
          options: [{ considerJSDoc: false }],
        },
        {
          code: `
        class MyClass {}
        new MyClass();
      `,
          options: [{ considerJSDoc: false }],
        },
        {
          code: `
        class MyClass {
          static createInstance() {
            return new this();
          }
        }
        `,
          options: [{ considerJSDoc: false }],
        },
        {
          code: `
        class A {}
        class B {}
        let klass: {new(): A}|{new(): B};
        new klass;
      `,
          options: [{ considerJSDoc: false }],
        },
        {
          code: `
        function MyClass() {}
        new MyClass();
      `,
          options: [{ considerJSDoc: false }],
        },
        {
          code: `
        function MyClass() {}
        var MyClass1 = MyClass;
        new MyClass1();
      `,
          options: [{ considerJSDoc: false }],
        },
        {
          code: `
        /**
         * @constructor
         */
        function MyClass() {}
        new MyClass();
      `,
          options: [{ considerJSDoc: false }],
        },
        {
          code: `
        /**
         * @class
         */
        function MyClass() {}
        new MyClass();
      `,
          options: [{ considerJSDoc: false }],
        },
        {
          code: `
        /**
         * @class
         */
        function MyClass() {}
        new MyClass();
      `,
          options: [{ considerJSDoc: true }],
        },
        {
          code: `
        let Str: new (s: string) => string;
        new Str('hello')
      `,
          options: [{ considerJSDoc: false }],
        },
        {
          code: `new any;`,
          options: [{ considerJSDoc: false }],
        },
      ],
      invalid: [
        {
          code: `
        var numeric = 1;
        new numeric;
      `,
          errors: [
            {
              message: `{\"message\":\"Replace numeric with a constructor function.\",\"secondaryLocations\":[{\"column\":8,\"line\":3,\"endColumn\":11,\"endLine\":3}]}`,
              line: 3,
              column: 13,
              endLine: 3,
              endColumn: 20,
            },
          ],
          options: [{ considerJSDoc: false }],
          settings: { sonarRuntime: true },
        },
        {
          code: `
        var boolean = true;
        new boolean;
      `,
          errors: 1,
          options: [{ considerJSDoc: false }],
        },
        {
          code: `
        var string = 'str';
        new string;
      `,
          errors: 1,
          options: [{ considerJSDoc: false }],
        },
        {
          code: `
        var object = { a:1 };
        new object;
      `,
          errors: 1,
          options: [{ considerJSDoc: false }],
        },
        {
          code: `
        function MyClass() {}
        new MyClass();
      `,
          errors: 1,
          options: [{ considerJSDoc: true }],
        },
        {
          code: `new function(){ return 5; };`,
          errors: [
            {
              message: `{\"message\":\"Replace this function with a constructor function.\",\"secondaryLocations\":[{\"column\":0,\"line\":1,\"endColumn\":3,\"endLine\":1}]}`,
              line: 1,
              column: 5,
              endLine: 1,
              endColumn: 13,
            },
          ],
          options: [{ considerJSDoc: true }],
          settings: { sonarRuntime: true },
        },
      ],
    });
  });
});
