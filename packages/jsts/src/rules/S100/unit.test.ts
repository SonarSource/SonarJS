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
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { fileURLToPath } from 'node:url';

const ruleTester = new NodeRuleTester({
  parser: fileURLToPath(import.meta.resolve('@typescript-eslint/parser')),
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
