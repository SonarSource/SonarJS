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

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run(
  'Shorthand object properties should be grouped at the beginning or end of an object declaration',
  rule,
  {
    valid: [
      {
        code: `
            let obj2 = {
                foo,
                color,
                judyGarland,
                a: 1,
                b: 2
            }
            
            let obj3 = {
                a: 1,
                b: 2,
                foo,
                color,
                judyGarland
            }
            
            let obj4 = {
                a: 1,
                bar() {},
                b: 2,
                foo,
                color,
                judyGarland
            }
            
            var obj = {
                ...otherObj,
                prop1,    // we can't move shorthand properties as they might overwrite values in "otherObj"
                prop2,
                prop3 : value3
            }`,
      },
    ],
    invalid: [
      {
        code: `let obj1 = {  // Main location
            foo, // Secondary location
            a: 1,
            color, // Secondary location
            b: 2,
            judyGarland // Secondary location
        }`,
        errors: [
          {
            message: `{\"message\":\"Group all shorthand properties at either the beginning or end of this object declaration.\",\"secondaryLocations\":[{\"message\":\"Move to either the beginning or end\",\"column\":12,\"line\":2,\"endColumn\":15,\"endLine\":2},{\"message\":\"Move to either the beginning or end\",\"column\":12,\"line\":4,\"endColumn\":17,\"endLine\":4},{\"message\":\"Move to either the beginning or end\",\"column\":12,\"line\":6,\"endColumn\":23,\"endLine\":6}]}`,
            line: 1,
            endLine: 1,
            column: 12,
            endColumn: 13,
          },
        ],
      },
      {
        code: `let obj1 = { // Main location
                    foo,
                    color,
                    a: 1,
                    c, // Secondary location
                    b: 2,
                    judyGarland // Secondary location
                }`,
        errors: [
          {
            message: `{\"message\":\"Group all shorthand properties at the beginning of this object declaration.\",\"secondaryLocations\":[{\"message\":\"Move to the beginning\",\"column\":20,\"line\":5,\"endColumn\":21,\"endLine\":5},{\"message\":\"Move to the beginning\",\"column\":20,\"line\":7,\"endColumn\":31,\"endLine\":7}]}`,
            line: 1,
            endLine: 1,
            column: 12,
            endColumn: 13,
          },
        ],
      },
      {
        code: `let obj6 = { // Main location
                    a: 1,
                    foo, // Secondary location
                    color, // Secondary location
                    b: 2,
                    c,
                    judyGarland
                }`,
        errors: [
          {
            message: `{"message":"Group all shorthand properties at the end of this object declaration.","secondaryLocations":[{"message":"Move to the end","column":20,"line":3,"endColumn":23,"endLine":3},{"message":"Move to the end","column":20,"line":4,"endColumn":25,"endLine":4}]}`,
            line: 1,
            endLine: 1,
            column: 12,
            endColumn: 13,
          },
        ],
      },
    ],
  },
);
