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
import { rule } from './index.js';
import { TypeScriptRuleTester } from '../../../tests/tools/index.js';

const MAX_PARAMS_3 = 3;
const MAX_PARAMS_5 = 5;

const createOptions = (max: number) => {
  return [{ max }];
};

const ruleTester = new TypeScriptRuleTester();
ruleTester.run(``, rule, {
  valid: [
    {
      code: `function f(a, b) {}`,
      options: createOptions(MAX_PARAMS_5),
    },
    {
      code: `function f(a, b, c, d, e) {}`,
      options: createOptions(MAX_PARAMS_5),
    },
    {
      code: `function f(a: any, b: any): any;`,
      options: createOptions(MAX_PARAMS_5),
    },
    {
      code: `function f(a: any, b: any, c: any, d: any, e: any): any;`,
      options: createOptions(MAX_PARAMS_5),
    },
    {
      code: `class C { m(a: any, b: any): any; }`,
      options: createOptions(MAX_PARAMS_5),
    },
    {
      code: `class C { constructor(private a: any, public b: any) {} }`,
      options: createOptions(MAX_PARAMS_5),
    },
    {
      code: `
      import { Component } from '@angular/core';
      @Component({/* ... */})
      class AppComponent {
        constructor(a, b, c, d, e, f) {}
      }
      `,
      options: createOptions(MAX_PARAMS_3),
    },
    {
      code: `class C { constructor(private a: any, b: any, c: any, d: any) {} }`,
      options: createOptions(MAX_PARAMS_3),
    },
  ],
  invalid: [
    {
      code: `function f(a, b, c, d, e) {}`,
      options: createOptions(MAX_PARAMS_3),
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
      options: createOptions(MAX_PARAMS_3),
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
      options: createOptions(MAX_PARAMS_3),
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
      options: createOptions(MAX_PARAMS_3),
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
      options: createOptions(MAX_PARAMS_3),
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
      options: createOptions(MAX_PARAMS_3),
      errors: 4,
    },
    {
      code: `class C { constructor(private a: any, b: any, c: any, d: any, e: any) {} }`,
      options: createOptions(MAX_PARAMS_3),
      errors: 1,
    },
  ],
});
