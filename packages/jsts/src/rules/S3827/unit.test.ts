/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { RuleTester } from 'eslint';
import { rule } from './';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run('Variables should be defined before being used', rule, {
  valid: [
    {
      code: `
      function foo() {}
      var a1;
      foo(a1);
            `,
    },
    {
      code: `
      function foo() {}
      foo(a2);
      var a2;
            `,
    },
    {
      code: `
      function foo() {}
      a3 = "";
      foo(a3);
      foo(a3.xxx);
            `,
    },
    {
      code: `
      {xxx: "property value"};
            `,
    },
    {
      code: `
      typeof x3;
            `,
    },
    {
      code: `
      function foo() {}
      if (typeof x5 !== undefined) {
        foo(x5);
      }
            `,
    },
  ],
  invalid: [
    {
      code: `
      function foo() {}
      foo(x1);
            `,
      errors: [
        {
          message: JSON.stringify({
            message:
              '"x1" does not exist. Change its name or declare it so that its usage doesn\'t result in a "ReferenceError".',
            secondaryLocations: [],
          }),
          line: 3,
          endLine: 3,
          column: 11,
          endColumn: 13,
        },
      ],
    },
    {
      code: `
      var a1 = 1;
      a1 + x2;
            `,
      errors: 1,
    },
    {
      code: `
      typeof x4.x;
            `,
      errors: 1,
    },
    {
      code: `
      function foo() {}
      foo(let1);
      if (true) {
        let let1 = 42;
        foo(let1);
      }
      foo(let1);
            `,
      errors: [
        {
          message: JSON.stringify({
            message:
              '"let1" does not exist. Change its name or declare it so that its usage doesn\'t result in a "ReferenceError".',
            secondaryLocations: [{ column: 10, line: 8, endColumn: 14, endLine: 8 }],
          }),
          line: 3,
          endLine: 3,
          column: 11,
          endColumn: 15,
        },
      ],
    },
    {
      code: `
      foo(let2);
      let let2 = 1;
            `,
      errors: 1,
    },
    {
      // even if we report on `_` in unit test here, in real analysis it should not happen as `_` is set as a default global
      code: `_.foo();`,
      errors: 1,
    },
  ],
});

const ruleTesterScript = new RuleTester({ parserOptions: { sourceType: 'script' } });
ruleTesterScript.run('No issues within with statements', rule, {
  valid: [
    {
      code: `
      with (something) {
        foo(bar);
      }
            `,
    },
  ],
  invalid: [],
});
