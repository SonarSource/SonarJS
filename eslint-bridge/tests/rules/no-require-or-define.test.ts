/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import { RuleTesterTs } from '../RuleTesterTs';
import { rule } from 'rules/no-require-or-define';

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
const ruleTesterTs = new RuleTesterTs(false);

const testCases = {
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
            require(1);  // FP, not string argument (requires type inference)
            `,
      errors: 1,
    },
  ],
};

ruleTesterJs.run('No require or define import JS', rule, testCases);
testCases.valid.push({
  code: `
        import pluralize = require('pluralize');
        `,
});
ruleTesterTs.run('No require or define import TS', rule, testCases);
