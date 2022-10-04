/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import { eslintRules } from 'linting/eslint/rules/core';
import { JavaScriptRuleTester } from '../../../tools';
import { decorateSemi } from 'linting/eslint/rules/decorators/semi-decorator';

const rule = decorateSemi(eslintRules['semi']);
const ruleTester = new JavaScriptRuleTester();

ruleTester.run(`An open curly brace should be located at the end of a line`, rule, {
  valid: [
    {
      code: `
        var name = "ESLint";

        object.method = function() {
            // ...
        };
        
        class Foo {
            bar = 1;
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
function f() {
    if (cond()) {
        return foo()
    } else {
        return bar();
    }
}
      `,
      errors: [
        {
          line: 4,
          endLine: 4,
          column: 21,
          endColumn: 21,
        },
      ],
      output: `
function f() {
    if (cond()) {
        return foo();
    } else {
        return bar();
    }
}
      `,
    },
    {
      code: `
        var name = "ESLint"
        
        object.method = function() {
            // ...
        }
        
        class Foo {
            bar = 1
        }
      `,
      errors: [
        {
          line: 2,
          endLine: 2,
          column: 28,
          endColumn: 28,
        },
        {
          line: 6,
          endLine: 6,
          column: 10,
          endColumn: 10,
        },
        {
          line: 9,
          endLine: 9,
          column: 20,
          endColumn: 20,
        },
      ],
      output: `
        var name = "ESLint";
        
        object.method = function() {
            // ...
        };
        
        class Foo {
            bar = 1;
        }
      `,
    },
  ],
});
