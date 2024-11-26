/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { rule } from './rule.js';
import { JavaScriptRuleTester } from '../../../tests/tools/index.js';

const ruleTester = new JavaScriptRuleTester();

ruleTester.run('prefer-literal', rule, {
  valid: [
    {
      code: `var x = {a: 2}`,
    },
    {
      code: `
      function Foo(a) {
        this.a = a;
      };
      var x = new Foo(2);`,
    },
    {
      code: `
      var x = {a: 2};
      y = "foo";`,
    },
    // FN
    {
      code: `
      var x;
      x = {};
      x.a = 2`,
    },
    // FN
    {
      code: `var x = {a: 2}; doSomething(); x.b = 3;`,
    },
    {
      code: `
      function foo() {
        var x = {a: 2};
        doSomething();
      }`,
    },
    {
      code: `var x = {}; x["a"] = 2;`,
    },
    // No issue on multiline expressions, may be done for readability
    {
      code: `
      var x = {};
      x.foo = function () {
        doSomething();
      }
      var y = {};
      y.prop = {
        a: 1,
        b: 2
      }`,
    },
    // OK, report only when empty object
    {
      code: `var x = {a: 2}; x.b = 5;`,
    },
    {
      code: `
      const O = {};
      O.self = O;`,
    },
  ],
  invalid: [
    {
      code: `var x = {}; x.a = 2;`,
      errors: [
        {
          messageId: 'declarePropertiesInsideObject',
          line: 1,
          endLine: 1,
          column: 5,
          endColumn: 11,
        },
      ],
    },
    {
      code: `
        var x = {},
            y = "hello";
        x.a = 2;`,
      errors: [
        {
          messageId: 'declarePropertiesInsideObject',
          line: 2,
          endLine: 2,
          column: 13,
          endColumn: 19,
        },
      ],
    },
    {
      code: `var x = {}; x.a = 2; x.b = 3`,
      errors: [
        {
          messageId: 'declarePropertiesInsideObject',
          line: 1,
          endLine: 1,
          column: 5,
          endColumn: 11,
        },
      ],
    },
    {
      code: `let x = {}; x.a = 2;`,
      errors: [
        {
          messageId: 'declarePropertiesInsideObject',
          line: 1,
          endLine: 1,
          column: 5,
          endColumn: 11,
        },
      ],
    },
    {
      code: `const x = {}; x.a = 2;`,
      errors: [
        {
          messageId: 'declarePropertiesInsideObject',
          line: 1,
          endLine: 1,
          column: 7,
          endColumn: 13,
        },
      ],
    },
    {
      code: `{ var x = {}; x.a = 2; }`,
      errors: [
        {
          messageId: 'declarePropertiesInsideObject',
          line: 1,
          endLine: 1,
          column: 7,
          endColumn: 13,
        },
      ],
    },
    {
      code: `if (a) { var x = {}; x.a = 2; }`,
      errors: [
        {
          messageId: 'declarePropertiesInsideObject',
          line: 1,
          endLine: 1,
          column: 14,
          endColumn: 20,
        },
      ],
    },
    {
      code: `function foo() {
        var x = {};
        x.a = 2;
      }`,
      errors: [
        {
          messageId: 'declarePropertiesInsideObject',
          line: 2,
          endLine: 2,
          column: 13,
          endColumn: 19,
        },
      ],
    },
  ],
});
