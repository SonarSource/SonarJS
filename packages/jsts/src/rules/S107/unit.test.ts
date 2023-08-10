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
import { rule } from './';
import { TypeScriptRuleTester } from '../tools';

const MAX_PARAMS_3 = 3;
const MAX_PARAMS_5 = 5;

const ruleTester = new TypeScriptRuleTester();
ruleTester.run(``, rule, {
  valid: [
    {
      code: `function f(a, b) {}`,
      options: [MAX_PARAMS_5],
    },
    {
      code: `function f(a, b, c, d, e) {}`,
      options: [MAX_PARAMS_5],
    },
    {
      code: `function f(a: any, b: any): any;`,
      options: [MAX_PARAMS_5],
    },
    {
      code: `function f(a: any, b: any, c: any, d: any, e: any): any;`,
      options: [MAX_PARAMS_5],
    },
    {
      code: `class C { m(a: any, b: any): any; }`,
      options: [MAX_PARAMS_5],
    },
    {
      code: `class C { constructor(private a: any, public b: any) {} }`,
      options: [MAX_PARAMS_5],
    },
    {
      code: `
      import { Component } from '@angular/core';
      @Component({/* ... */})
      class AppComponent {
        constructor(a, b, c, d, e, f) {}
      }
      `,
      options: [MAX_PARAMS_3],
    },
  ],
  invalid: [
    {
      code: `function f(a, b, c, d, e) {}`,
      options: [MAX_PARAMS_3],
      errors: [
        {
          message: "Function 'f' has too many parameters (5). Maximum allowed is 3.",
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 11,
        },
      ],
    },
    {
      code: `function f(a: any, b: any, c: any, d: any, e: any): any;`,
      options: [MAX_PARAMS_3],
      errors: [
        {
          message: "Function declaration 'f' has too many parameters (5). Maximum allowed is 3.",
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 11,
        },
      ],
    },
    {
      code: `class C { m(a: any, b: any, c: any, d: any, e: any): any; }`,
      options: [MAX_PARAMS_3],
      errors: [
        {
          message: "Empty function 'm' has too many parameters (5). Maximum allowed is 3.",
          line: 1,
          column: 11,
          endLine: 1,
          endColumn: 12,
        },
      ],
    },
    {
      code: `class C { constructor(a: any, b: any, c: any, d: any, e: any); }`,
      options: [MAX_PARAMS_3],
      errors: [
        {
          message:
            "Empty function 'constructor' has too many parameters (5). Maximum allowed is 3.",
          line: 1,
          column: 11,
          endLine: 1,
          endColumn: 22,
        },
      ],
    },
    {
      code: `class C { constructor(private a: any, b: any, c: any, d: any, e: any) {} }`,
      options: [MAX_PARAMS_3],
      errors: [
        {
          message: 'Constructor has too many parameters (5). Maximum allowed is 3.',
          line: 1,
          column: 11,
          endLine: 1,
          endColumn: 22,
        },
      ],
    },
    {
      code: `
      import { NotComponent } from '@angular/core';
      import { Component } from 'not-angular-core';

      @NotComponent({/* ... */})
      class C1 {
        constructor(a, b, c, d, e, f) {}
      }

      @Component({/* ... */})
      class C2 {
        constructor(a, b, c, d, e, f) {}
      }

      @DoesNotExist({/* ... */})
      class C3 {
        constructor(a, b, c, d, e, f) {}
      }

      class C4 {
        constructor(a, b, c, d, e, f) {}
      }
      `,
      options: [MAX_PARAMS_3],
      errors: 4,
    },
  ],
});
