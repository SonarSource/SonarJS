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
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import Module from 'node:module';
const require = Module.createRequire(import.meta.url);

const ruleTester = new NodeRuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2018, ecmaFeatures: { jsx: true } },
});

const DEFAULT_FORMAT = '^[_a-z][a-zA-Z0-9]*$';
const ALLOW_UPPERCASE = '^[A-Z][a-zA-Z0-9]*$';

ruleTester.run('Function names should comply with a naming convention', rule, {
  valid: [
    {
      code: `
        function doSomething(){}
        function _doSomething(){}
        function* doSomething(){}
        
        let doSomething = function Object () {}
        `,
      options: [{ format: DEFAULT_FORMAT }],
    },
    {
      code: `
      class C {
        doSomething(){ }
        * doSomething (){}
     }
      `,
      options: [{ format: DEFAULT_FORMAT }],
    },
    {
      code: `
        function DoSomething() {}
      `,
      options: [{ format: ALLOW_UPPERCASE }],
    },
    {
      code: `
      function Welcome() {
        const greeting = 'Hello, world!';

        return <h1>{greeting}</h1>
      }`,
      options: [{ format: DEFAULT_FORMAT }],
    },
    {
      code: `
      const Welcome = () => {
        const greeting = 'Hello, world!';

        return <h1>{greeting}</h1>
      }`,
      options: [{ format: DEFAULT_FORMAT }],
    },
    {
      code: `
      const Welcome = function() {
        const greeting = 'Hello, world!';

        return (
          <>
            <h1>{greeting}</h1>
          </>
        )
      }`,
      options: [{ format: DEFAULT_FORMAT }],
    },
  ],
  invalid: [
    {
      code: `
        function DoSomething(){}
        `,
      options: [{ format: DEFAULT_FORMAT }],
      errors: [
        {
          message: `Rename this 'DoSomething' function to match the regular expression '${DEFAULT_FORMAT}'.`,
          line: 2,
          endLine: 2,
          column: 18,
          endColumn: 29,
        },
      ],
    },
    {
      code: `
        function do_something(){}
        function* DoSomething(){}   
        `,
      options: [{ format: DEFAULT_FORMAT }],
      errors: [
        {
          line: 2,
        },
        {
          line: 3,
        },
      ],
    },
    {
      code: `
        class C {
          DoSomething(){}
          * DoSomething (){}
        }
      `,
      options: [{ format: DEFAULT_FORMAT }],
      errors: [{ line: 3 }, { line: 4 }],
    },
    {
      code: `
      var MyObj1 = function Object () {
          this.a = 1;
      };
      `,
      options: [{ format: DEFAULT_FORMAT }],
      errors: [
        {
          line: 2,
        },
      ],
    },
    {
      code: `
      var MyObj1 = () => {
          this.a = 1;
      };
      `,
      options: [{ format: DEFAULT_FORMAT }],
      errors: [
        {
          line: 2,
        },
      ],
    },
    {
      code: `
     var myObj = {
        Method1() {},
        Method2: function() {},
        Method3: function * () {},
        Method4: (a, b) => { foo(a + b) },
        ["Method5"] : function() {              // OK - not handled by the check
        },    
        set my_field (val) {                    
            this.my_field = val;
        },
        get my_field() {                        
          return 0;
        }
      };
      `,
      options: [{ format: DEFAULT_FORMAT }],
      errors: [3, 4, 5, 6, 9, 12].map(line => {
        return { line };
      }),
    },
  ],
});
