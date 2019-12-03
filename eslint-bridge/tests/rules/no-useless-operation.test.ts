/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import { RuleTesterTs } from "../RuleTesterTs";
import { rule } from "../../src/rules/no-useless-operation";

const ruleTester = new RuleTesterTs();
ruleTester.run(`JavaScript: Results of operations on strings should not be ignored`, rule, {
  valid: [
    {
      code: `var var1 = "abc".toUpperCase();`,
    },
    {
      code: `unknown.toUpperCase();`,
    },
    {
      code: `var str = "abcd"; 
             str.replace("oldsubstr", foo);
             str.replace("oldsubstr", unknown);
             str.replace("oldsubstr", function() {});`,
    },
  ],
  invalid: [
    {
      code: `var str = "abcd"; 
             str.toUpperCase();
             "abc".toUpperCase();
             str.substring(1,2);
             str.replace("oldsubstr", "newsubstr");
             str.replace("oldsubstr", str);`,
      errors: [
        {
          message:
            "str is an immutable object; you must either store or return the result of the operation.",
          line: 2,
          column: 14,
          endLine: 2,
          endColumn: 32,
        },
        {
          message:
            '"abc" is an immutable object; you must either store or return the result of the operation.',
          line: 3,
          column: 14,
          endLine: 3,
          endColumn: 34,
        },
        {
          line: 4,
        },
        {
          line: 5,
        },
        {
          line: 6,
        },
      ],
    },
    {
      code: `"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam".toUpperCase();`,
      errors: [
        {
          message: `String is an immutable object; you must either store or return the result of the operation.`,
        },
      ],
    },
    {
      code: `var x = "abc";
             x = something();
             x.toUpperCase(); // FP, other rules (using typechecker) are also affected.`,
      errors: 1,
    },
  ],
});
