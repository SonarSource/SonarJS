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

import { rule } from 'rules/no-return-in-setter';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });

ruleTester.run('Setters should not return values', rule, {
  valid: [
    {
      code: `
      var person = {
        set other(other) {
          this.other = other;
          return;
        },
        set other2(other2) {
          this.other2 = other2;
        },
        get name() {
        return 42;  
        },
        x: function() {
          return 42;
        }
      }
            `,
    },
  ],
  invalid: [
    {
      code: `
      var person = {
        set name(name) {
          this.name = name;
          return 42;  // Noncompliant {{Consider removing this return statement; it will be ignored.}}
      //  ^^^^^^^^^^
        }
      }
            `,
      errors: [
        {
          message: 'Consider removing this return statement; it will be ignored.',
          line: 5,
          endLine: 5,
          column: 11,
          endColumn: 21,
        },
      ],
    },
  ],
});
