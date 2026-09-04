/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { rule } from './rule.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const MAX_PARAMS_3 = 3;
const MAX_PARAMS_5 = 5;

const createOptions = (max: number) => {
  return [{ max }];
};

describe('S107', () => {
  it('S107', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
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
        {
          // JS-2373: AMD/UI5 factory callback parameters are injected module dependencies, not a hand-written signature
          code: `
      sap.ui.define([
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox",
        "sap/ui/core/routing/History"
      ], function (Controller, JSONModel, MessageBox, History) {});
      `,
          options: createOptions(MAX_PARAMS_3),
        },
        {
          // JS-2373: same carve-out applies to the bare AMD 'define' loader function
          code: `define(["a", "b", "c", "d"], function (a, b, c, d) {});`,
          options: createOptions(MAX_PARAMS_3),
        },
        {
          // JS-2373: same carve-out applies to the bare AMD 'require' loader function
          code: `require(["a", "b", "c", "d"], function (a, b, c, d) {});`,
          options: createOptions(MAX_PARAMS_3),
        },
        {
          // JS-2373: same carve-out applies to the UI5 asynchronous loader 'sap.ui.require'
          code: `sap.ui.require(["a", "b", "c", "d"], function (a, b, c, d) {});`,
          options: createOptions(MAX_PARAMS_3),
        },
        {
          // JS-2373: in the RequireJS 'require([deps], factory, errback)' form the factory is
          // not the last argument, yet its parameters are still injected dependencies
          code: `require(["a", "b", "c", "d"], function (a, b, c, d) {}, function (err) {});`,
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
              message: "Function 'f' has too many parameters (5). Maximum allowed is 3.",
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
          // JS-2373: the AMD factory-callback carve-out must not extend to unrelated calls that
          // merely happen to have an array literal preceding a function argument
          code: `foo(["a", "b", "c", "d", "e"], function (a, b, c, d, e) {});`,
          options: createOptions(MAX_PARAMS_3),
          errors: [
            {
              message: 'Function has too many parameters (5). Maximum allowed is 3.',
              line: 1,
              column: 32,
              endLine: 1,
              endColumn: 41,
            },
          ],
        },
        {
          // JS-2373: the AMD factory-callback carve-out must not apply when 'define'/'require'
          // is shadowed by a local binding unrelated to the AMD loader
          code: `
      function define(factory) { return factory; }
      define(["a", "b", "c", "d", "e"], function (a, b, c, d, e) {});
      `,
          options: createOptions(MAX_PARAMS_3),
          errors: 1,
        },
        {
          // JS-2373: only the parameters injected by the loader are exempted; a factory declaring
          // more parameters than the dependency array provides is still hand-written
          code: `define(["a", "b", "c", "d"], function (a, b, c, d, e) {});`,
          options: createOptions(MAX_PARAMS_3),
          errors: 1,
        },
      ],
    });
  });
});
