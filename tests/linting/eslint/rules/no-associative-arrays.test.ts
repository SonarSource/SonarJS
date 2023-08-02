/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { TypeScriptRuleTester } from '../../../tools';

const ruleTesterTs = new TypeScriptRuleTester();
const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });

import { rule } from '@sonar/jsts/rules/no-associative-arrays';

ruleTesterTs.run('Array indexes should be numeric [TS]', rule, {
  valid: [
    {
      code: `
      const arr = [];
      arr[0] = 'a';`,
    },
    {
      code: `
      const car = {
        type : "Fiat",
        model : "500",
        color : "white"
      }; 
      car["type"] = "BMW"; // OK`,
    },
    {
      code: `
      let person = new Object();
      person["lastname"] = "Ben"`,
    },
  ],
  invalid: [
    {
      code: `
      const arr = [];
      arr['name'] = 'bob'`,
      errors: [
        {
          message: `Make it an object if it must have named properties; otherwise, use a numeric index here.`,
          line: 3,
          column: 7,
          endLine: 3,
          endColumn: 26,
        },
      ],
    },
    {
      code: `
      const arr = [];
      const strVar = 'foo';
      arr[strVar] = 42`,
      errors: 1,
    },
    {
      code: `
      const arr = new Array();
      arr["foo"] = 42`,
      errors: 1,
    },
    {
      code: `
      const fn = () => [1, 2, 3];
      fn()["foo"] = 42`,
      errors: 1,
    },
  ],
});

ruleTesterJs.run('Array indexes should be numeric [JS]', rule, {
  valid: [
    {
      code: `
      let arr = [];
      arr[0] = 'a';`,
    },
    {
      code: `
      let arr = [];
      arr['name'] = 'bob'`, // issue not raised because no types are available
    },
  ],
  invalid: [],
});
