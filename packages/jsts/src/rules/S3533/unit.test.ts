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
import { TypeScriptRuleTester } from '../../../tests/tools/index.js';
import { rule } from './index.js';

const ruleTesterJs = new NodeRuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
});
ruleTesterJs.run('No require or define import [js]', rule, {
  valid: [],
  invalid: [
    {
      code: `const circle = require('./circle.js');`,
      errors: 1,
    },
  ],
});

const ruleTesterTs = new TypeScriptRuleTester();
ruleTesterTs.run('No require or define import [ts]', rule, {
  valid: [
    {
      code: `
            require = 42;
            if (isArray(require)) {
              // ...
            }
            `,
    },
    {
      code: `
            exports.area = function (r) {
              return PI * r * r;
            };
            `,
    },
    {
      code: `
            module.exports = function(a) {
              return a * a;
            }
            `,
    },
    {
      code: `
            import A from "ModuleName";
            `,
    },
    {
      code: `
            import { member as alias } from "module-name";
            `,
    },
    {
      code: `
            if (cond) {
              require('./module.js'); // Ignore non global "imports"
            }
            `,
    },
    {
      code: `
            define(1, 2); // OK, last argument is not function
            `,
    },
    {
      code: `
            define(function()  {
              // ...
            }); // OK, only 1 argument
            `,
    },
    {
      code: `
            unknown.define("hello", function()  {
              // ...
            }); // OK, unknown object
            `,
    },
    {
      code: `
            require(1);  // not string argument
            `,
    },
  ],
  invalid: [
    {
      code: `
            define(["./cart", "./horse"], function(cart, horse) {
              // ...
            });
            `,
      errors: [
        {
          message: `Use a standard "import" statement instead of \"define\".`,
          line: 2,
          endLine: 2,
          column: 13,
          endColumn: 19,
        },
      ],
    },
    {
      code: `
            require(["./m1", "./m2"], function(m1, m2) {
              // ...
            });
            `,
      errors: [
        {
          message: `Use a standard "import" statement instead of \"require\".`,
          line: 2,
          endLine: 2,
          column: 13,
          endColumn: 20,
        },
      ],
    },
    {
      code: `
            define("ModuleName", [], function(){
              // ...
            });
            `,
      errors: 1,
    },
    {
      code: `
            define("ModuleName", [], (a) => {return a});
            `,
      errors: 1,
    },
    {
      code: `
            function foo(){
              // ...
            }
            define("ModuleName", [], foo);
            `,
      errors: 1,
    },
    {
      code: `
            const circle = require('./circle.js');
            `,
      errors: 1,
    },
    {
      code: `
            const square = require('./squire.js');
            `,
      errors: 1,
    },
    {
      code: `
            let str = './squire.js';
            const square = require(str);
            `,
      errors: 1,
    },
  ],
});
