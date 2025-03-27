/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S4275', () => {
  it('S4275', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    function missingReturn(...codes: string[]) {
      return codes.map(code => ({
        code,
        errors: ['{"message":"Refactor this getter to return a value.","secondaryLocations":[]}'],
        settings: { sonarRuntime: true },
      }));
    }

    function missingAlwaysReturn(...codes: string[]) {
      return codes.map(code => ({
        code,
        errors: [
          '{"message":"Refactor this getter to always return a value.","secondaryLocations":[]}',
        ],
        settings: { sonarRuntime: true },
      }));
    }

    ruleTester.run('Getters and setters should access the expected fields', rule, {
      valid: [
        {
          code: `
        class OK {
          private x: string;
          private _y = "hello";

          constructor(private z: number) {

          }

          public getX(): string {
            return this.x;
          }

          public get y(): string {
            return this._y;
          }

          public set y(y: string) {
            this._y = y;
          }

          public getY(): string {
            return this._y;
          }

          public getZ() {
            return this.z;
          }

          public setX(x: string) {
            this.x = x;
          }
        }`,
        },
        {
          code: `
        class Exceptions1 {
          private x: string;
          private y = "hello";

          constructor(private z: number, private _v: number, private [a, b], w: number) {

          }

          public getW(): string { // Compliant, w does not exist
            return this.x;
          }

          private GetY(): number { // Compliant, private method
            return this.z;
          }

          public setW(w: string) { // Compliant, w does not exist as a field, only a parameter of the constructor
            this.x = w;
          }

          public getY(someParam: number) { // Compliant, not a zero-parameters getter
            return 3;
          }

          public setZ(y: string, someParam: number) { // Compliant, not a one-parameters setter
            this.z = 3;
          }

          public setY(x: string) // Compliant, overload
          public setY(y: string) {
            this.y = y;
          }

          public getZ() { // Compliant, does not match "return this.?;" pattern
            this.setZ("",1);
          }

          public abstract GetZ(): string; // Compliant, abstract method with no body

          public set v(z:number) { // Compliant, does not match "this.? =" pattern
            this.x;
          }

          public get v() { // Compliant, not a single return statement
            if (this.z) {
              return 1;
            } else {
              return this.z;
            }
          }

          public getV() { // Compliant
            return \`v is \${this.z}\`;
          }
        }`,
        },
        {
          code: `
        class Exceptions2 {
          private x: string;
          private y = "hello";

          public GetY(): number { // Compliant, multiple statements
            const val = doSomething();
            return this.z;
          }

          public getY(someParam: number) { // Compliant, not a zero-parameters getter
            return 3;
          }

          public get ["i" + "2"]() { // FN - we do not handle computed properties
            return this.x;
          }
        }`,
        },
        {
          code: `
        export const ObjectLiteral = {
          w_: "blah",
          _x: "blah",
          _experiments: "blah",
          'z': 3,

          getExperiments(): string {
            return this._experiments;
          },

          get X() {
            return this._x;
          },

          set x(newX) {
            this._x = newX;
          },

          get z() {
            return this.z;
          },

          setZ(x: number) {
            this.z = x;
          },

          set w(x: number) {
            this.w_ = x;
          },

          get myVal() {
            return this.myVal_;
          },

          set myVal(v) {
            this.myVal_ = v;
          },

          ...theRest
        };`,
        },
        { code: 'Object.defineProperty()' },
        { code: 'Object.defineProperty(o)' },
        { code: 'Object.defineProperty(o, "b")' },
        { code: 'Object.defineProperty(o, "b", props)' },
        { code: 'Object.defineProperty(o, "b", { get() { return a; } })' },
        { code: 'let _b = 0, _c = 0; Object.defineProperty(o, "b", { get() { return _b; } })' },
        { code: 'Reflect.defineProperty()' },
        { code: 'Reflect.defineProperty(o)' },
        { code: 'Reflect.defineProperty(o, "b")' },
        { code: 'Reflect.defineProperty(o, "b", props)' },
        { code: 'Reflect.defineProperty(o, "b", { get() { return a; } })' },
        { code: 'Object.defineProperties()' },
        { code: 'Object.defineProperties(o)' },
        { code: 'Object.defineProperties(o, props)' },
        { code: 'Object.defineProperties(o, { b: { get() { return a; } } })' },
        { code: 'Object.create()' },
        { code: 'Object.create(o)' },
        { code: 'Object.create(o, props)' },
        { code: 'Object.create(o, { b: { get() { return a; } } })' },
      ],
      invalid: [
        {
          code: `
      class A {
        _x: number = 0;
        _y: number = 0;
  
        getY() {
          // Noncompliant: field 'y' is not used in the return value
        }
      }
        `,
          errors: 1,
        },
        {
          code: `
      let a = 0;
      Object.defineProperty(obj, 'a', { get() {} });
      `,
          errors: 1,
        },
        {
          code: `
      class NOK_CheckLocation {
        private x: string;
        private _y = "hello";

        public setY(y: number) {}   // Noncompliant

        public get X(): string {   // Noncompliant
            return this._y;
        }
      }`,
          errors: [
            {
              message: JSON.stringify({
                message: "Refactor this setter so that it actually refers to the property '_y'.",
                secondaryLocations: [
                  {
                    message: 'Property which should be referred.',
                    column: 8,
                    line: 4,
                    endColumn: 29,
                    endLine: 4,
                  },
                ],
              }),
              line: 6,
              column: 16,
              endLine: 6,
              endColumn: 20,
            },
            {
              message: JSON.stringify({
                message: "Refactor this getter so that it actually refers to the property 'x'.",
                secondaryLocations: [
                  {
                    message: 'Property which should be referred.',
                    column: 8,
                    line: 3,
                    endColumn: 26,
                    endLine: 3,
                  },
                ],
              }),
              line: 8,
              column: 20,
              endLine: 8,
              endColumn: 21,
            },
          ],
          settings: { sonarRuntime: true },
        },
        {
          code: `
      class NOK {
        static _filter: string = '';
        private _filter: string = '';

        private _x: number = 2;
        static _x: number = 1;

        private _y: number = 2; // Secondary
        static _y: number = 1;

        public get filter(): string {
          return this._filter; // OK
        }

        public get x(): number {
          return Issue476._x;
        }

        public get y(): number { return this._x; }  // Noncompliant
      }`,
          errors: [
            {
              message: JSON.stringify({
                message: "Refactor this getter so that it actually refers to the property '_y'.",
                secondaryLocations: [
                  {
                    message: 'Property which should be referred.',
                    column: 8,
                    line: 9,
                    endColumn: 31,
                    endLine: 9,
                  },
                ],
              }),
              line: 20,
              column: 20,
              endLine: 20,
              endColumn: 21,
            },
          ],
          settings: { sonarRuntime: true },
        },
        {
          code: `const foo = {
        _bar: 0,
        get bar() {
        }
      };`,
          errors: [
            {
              message: JSON.stringify({
                message: "Refactor this getter so that it actually refers to the property '_bar'.",
                secondaryLocations: [
                  {
                    message: 'Property which should be referred.',
                    column: 8,
                    line: 2,
                    endColumn: 15,
                    endLine: 2,
                  },
                ],
              }),
              line: 3,
              column: 13,
              endLine: 3,
              endColumn: 16,
            },
          ],
          settings: { sonarRuntime: true },
        },
        {
          code: `class foo {
        _bar = 0;
        get bar() {
        }
      }`,
          errors: [
            {
              message: JSON.stringify({
                message: "Refactor this getter so that it actually refers to the property '_bar'.",
                secondaryLocations: [
                  {
                    message: 'Property which should be referred.',
                    column: 8,
                    line: 2,
                    endColumn: 17,
                    endLine: 2,
                  },
                ],
              }),
              line: 3,
              column: 13,
              endLine: 3,
              endColumn: 16,
            },
          ],
          settings: { sonarRuntime: true },
        },
        {
          code: `
      let bar = 0;
      Object.defineProperty(obj, 'bar', { get() {} });
      `,
          errors: [
            {
              message: JSON.stringify({
                message: "Refactor this getter so that it actually refers to the variable 'bar'.",
                secondaryLocations: [
                  {
                    message: 'Variable which should be referred.',
                    column: 10,
                    line: 2,
                    endColumn: 17,
                    endLine: 2,
                  },
                ],
              }),
              line: 3,
              column: 43,
              endLine: 3,
              endColumn: 46,
            },
          ],
          settings: { sonarRuntime: true },
        },
        {
          code: `
      function foo(bar) {
        Object.defineProperties(obj, { bar: { get() {} } });
      }
      `,
          errors: [
            {
              message: JSON.stringify({
                message: "Refactor this getter so that it actually refers to the variable 'bar'.",
                secondaryLocations: [
                  {
                    message: 'Variable which should be referred.',
                    column: 6,
                    line: 2,
                    endColumn: 7,
                    endLine: 4,
                  },
                ],
              }),
              line: 3,
              column: 47,
              endLine: 3,
              endColumn: 50,
            },
          ],
          settings: { sonarRuntime: true },
        },
        {
          code: `class foo {
        #bar = 0;
        get bar() {
        }
      }`,
          errors: [
            {
              message: JSON.stringify({
                message: "Refactor this getter so that it actually refers to the property 'bar'.",
                secondaryLocations: [
                  {
                    message: 'Property which should be referred.',
                    column: 8,
                    line: 2,
                    endColumn: 17,
                    endLine: 2,
                  },
                ],
              }),
              line: 3,
              column: 13,
              endLine: 3,
              endColumn: 16,
            },
          ],
          settings: { sonarRuntime: true },
        },
        {
          code: `const foo = {
        get bar() {
        }
      };`,
          errors: [
            {
              message: JSON.stringify({
                message: 'Refactor this getter to return a value.',
                secondaryLocations: [],
              }),
              line: 2,
              column: 9,
              endLine: 2,
              endColumn: 16,
            },
          ],
          settings: { sonarRuntime: true },
        },
        {
          code: `class Foo {
        get bar(): string {}
      }`,
          errors: [
            {
              message: JSON.stringify({
                message: 'Refactor this getter to return a value.',
                secondaryLocations: [],
              }),
              line: 2,
              column: 9,
              endLine: 2,
              endColumn: 16,
            },
          ],
          settings: { sonarRuntime: true },
        },
        {
          code: `
        let b = 42;
        let c = 38;
        Object.defineProperty(o, "b", {
          get() {
            return c;
          },
          set(newValue) {
            c = newValue;
          },
          enumerable: true,
          configurable: true,
        });
      `,
          errors: [
            {
              message: JSON.stringify({
                message: "Refactor this getter so that it actually refers to the variable 'b'.",
                secondaryLocations: [
                  {
                    message: 'Variable which should be referred.',
                    column: 12,
                    line: 2,
                    endColumn: 18,
                    endLine: 2,
                  },
                ],
              }),
              line: 5,
              column: 11,
              endLine: 5,
              endColumn: 14,
            },
            {
              message: JSON.stringify({
                message: "Refactor this setter so that it actually refers to the variable 'b'.",
                secondaryLocations: [
                  {
                    message: 'Variable which should be referred.',
                    column: 12,
                    line: 2,
                    endColumn: 18,
                    endLine: 2,
                  },
                ],
              }),
              line: 8,
              column: 11,
              endLine: 8,
              endColumn: 14,
            },
          ],
          settings: { sonarRuntime: true },
        },
        {
          code: `
        let b = 42;
        let c = 38;
        Reflect.defineProperty(o, "b", {
          get() {
            return c;
          },
          set(newValue) {
            c = newValue;
          },
          enumerable: true,
          configurable: true,
        });
      `,
          errors: 2,
        },
        {
          code: `
        let b = 42;
        let c = 38;
        Reflect.defineProperty(o, "b", {
          get() {
            return b;
          },
          set(newValue) {
          },
          enumerable: true,
          configurable: true,
        });
      `,
          errors: [
            {
              message: JSON.stringify({
                message: "Refactor this setter so that it actually refers to the variable 'b'.",
                secondaryLocations: [
                  {
                    message: 'Variable which should be referred.',
                    column: 12,
                    line: 2,
                    endColumn: 18,
                    endLine: 2,
                  },
                ],
              }),
              line: 8,
              column: 11,
              endLine: 8,
              endColumn: 14,
            },
          ],
          settings: { sonarRuntime: true },
        },
        {
          code: `
        let b = 42;
        let c = 38;
        let d = 46;
        Object.defineProperties(foo, {
          b: {
            get() {
              return c;
            },
            set(newValue) {
              c = newValue;
            },
            enumerable: true,
            configurable: true,
           },
          c: {
            get() {
              return c;
            },
            set(newValue) {
            },
            enumerable: true,
            configurable: true,
           },
          ['d']: {
            get() {
              return c;
            },
            set(newValue) {
              c = newValue;
            },
            enumerable: true,
            configurable: true,
           }
         }
       );
      `,
          errors: [
            {
              message: JSON.stringify({
                message: "Refactor this getter so that it actually refers to the variable 'b'.",
                secondaryLocations: [
                  {
                    message: 'Variable which should be referred.',
                    column: 12,
                    line: 2,
                    endColumn: 18,
                    endLine: 2,
                  },
                ],
              }),
              line: 7,
              column: 13,
              endLine: 7,
              endColumn: 16,
            },
            {
              message: JSON.stringify({
                message: "Refactor this setter so that it actually refers to the variable 'b'.",
                secondaryLocations: [
                  {
                    message: 'Variable which should be referred.',
                    column: 12,
                    line: 2,
                    endColumn: 18,
                    endLine: 2,
                  },
                ],
              }),
              line: 10,
              column: 13,
              endLine: 10,
              endColumn: 16,
            },
            {
              message: JSON.stringify({
                message: "Refactor this setter so that it actually refers to the variable 'c'.",
                secondaryLocations: [
                  {
                    message: 'Variable which should be referred.',
                    column: 12,
                    line: 3,
                    endColumn: 18,
                    endLine: 3,
                  },
                ],
              }),
              line: 20,
              column: 13,
              endLine: 20,
              endColumn: 16,
            },
            {
              message: JSON.stringify({
                message: "Refactor this getter so that it actually refers to the variable 'd'.",
                secondaryLocations: [
                  {
                    message: 'Variable which should be referred.',
                    column: 12,
                    line: 4,
                    endColumn: 18,
                    endLine: 4,
                  },
                ],
              }),
              line: 26,
              column: 13,
              endLine: 26,
              endColumn: 16,
            },
            {
              message: JSON.stringify({
                message: "Refactor this setter so that it actually refers to the variable 'd'.",
                secondaryLocations: [
                  {
                    message: 'Variable which should be referred.',
                    column: 12,
                    line: 4,
                    endColumn: 18,
                    endLine: 4,
                  },
                ],
              }),
              line: 29,
              column: 13,
              endLine: 29,
              endColumn: 16,
            },
          ],
          settings: { sonarRuntime: true },
        },
        {
          code: `
        let b = 42;
        let c = 38;
        let d = 46;
        Object.create(foo, {
          b: {
            get() {
              return c;
            },
            set(newValue) {
              c = newValue;
            },
            enumerable: true,
            configurable: true,
           },
          c: {
            get() {
              return c;
            },
            set(newValue) {
            },
            enumerable: true,
            configurable: true,
           },
          ['d']: {
            get() {
              return c;
            },
            set(newValue) {
              c = newValue;
            },
            enumerable: true,
            configurable: true,
           }
         }
       );
      `,
          errors: 5,
        },
        ...missingReturn(
          'var foo = { get bar() { return; } };',
          'class foo { get bar(){} }',
          'var foo = class {\n  static get\nbar(){} }',
          "Object.defineProperty(foo, 'bar', { get: function(){}});",
          "Object.defineProperty(foo, 'bar', { get: function getfoo (){}});",
          "Object.defineProperty(foo, 'bar', { get(){} });",
          "Object.defineProperty(foo, 'bar', { get: () => {}});",
          "Reflect.defineProperty(foo, 'bar', { get: function (){}});",
          'Object.create(foo, { bar: { get: function() {} } })',
          'Object.create(foo, { bar: { get() {} } })',
          'Object.create(foo, { bar: { get: () => {} } })',
        ),
        ...missingAlwaysReturn(
          'var foo = { get bar(){if(baz) {return true;}} };',
          'class foo { get bar(){ if (baz) { return true; }}}',
          'Object.defineProperty(foo, "bar", { get: function (){if(bar) {return true;}}});',
        ),
        {
          code: `
    class NOK {
      private x: string;
      private _y = "hello";
      private z = 0;

      constructor(private w: number, readonly ro: number) {

      }

      public setX(x: number) {} // Noncompliant

      public GetX(): string { // Noncompliant
        return this._y;
      }

      public get y(): number { // Noncompliant
        return this.z;
      }

      public set y(y: number) {} // Noncompliant

      public getY(): number { // Noncompliant
        return this.z;
      }

      public SetZ(z: string) { // Noncompliant
        this.x = z;
      }

      public setW(x: string) { // Noncompliant
        this.x = x;
      }

      public setRO(ro: number) { // Noncompliant
        this.z = ro;
      }
    }`,
          errors: [
            {
              message:
                '{"message":"Refactor this setter so that it actually refers to the property \'x\'.","secondaryLocations":[{"message":"Property which should be referred.","column":6,"line":3,"endColumn":24,"endLine":3}]}',
            },
            {
              message:
                '{"message":"Refactor this getter so that it actually refers to the property \'x\'.","secondaryLocations":[{"message":"Property which should be referred.","column":6,"line":3,"endColumn":24,"endLine":3}]}',
            },
            {
              message:
                '{"message":"Refactor this getter so that it actually refers to the property \'_y\'.","secondaryLocations":[{"message":"Property which should be referred.","column":6,"line":4,"endColumn":27,"endLine":4}]}',
            },
            {
              message:
                '{"message":"Refactor this setter so that it actually refers to the property \'_y\'.","secondaryLocations":[{"message":"Property which should be referred.","column":6,"line":4,"endColumn":27,"endLine":4}]}',
            },
            {
              message:
                '{"message":"Refactor this getter so that it actually refers to the property \'_y\'.","secondaryLocations":[{"message":"Property which should be referred.","column":6,"line":4,"endColumn":27,"endLine":4}]}',
            },
            {
              message:
                '{"message":"Refactor this setter so that it actually refers to the property \'z\'.","secondaryLocations":[{"message":"Property which should be referred.","column":6,"line":5,"endColumn":20,"endLine":5}]}',
            },
            {
              message:
                '{"message":"Refactor this setter so that it actually refers to the property \'w\'.","secondaryLocations":[{"message":"Property which should be referred.","column":18,"line":7,"endColumn":35,"endLine":7}]}',
            },
            {
              message:
                '{"message":"Refactor this setter so that it actually refers to the property \'ro\'.","secondaryLocations":[{"message":"Property which should be referred.","column":37,"line":7,"endColumn":56,"endLine":7}]}',
            },
          ],
          settings: { sonarRuntime: true },
        },
        {
          code: `
    const nokObj = {
      w_: 0,
      x : 3,
      _y : 1,
      'z': 2,
      ["a" + 1]: 1,

      get w() { // Noncompliant
        return this.x;
      },

      get y() { // Noncompliant
        return this.w_;
      },

      setX(x: number) { // Noncompliant
        this._y = x;
      },

      get z() { // Noncompliant
        return this.x;
      },

      setZ(x: number) { // Noncompliant
        this.y = x;
      },

      get a1() { // FN - cannot determine computed field a1 existence
        return this.x;
      },
    }`,
          errors: [
            {
              message:
                '{"message":"Refactor this getter so that it actually refers to the property \'w_\'.","secondaryLocations":[{"message":"Property which should be referred.","column":6,"line":3,"endColumn":11,"endLine":3}]}',
            },
            {
              message:
                '{"message":"Refactor this getter so that it actually refers to the property \'_y\'.","secondaryLocations":[{"message":"Property which should be referred.","column":6,"line":5,"endColumn":12,"endLine":5}]}',
            },
            {
              message:
                '{"message":"Refactor this setter so that it actually refers to the property \'x\'.","secondaryLocations":[{"message":"Property which should be referred.","column":6,"line":4,"endColumn":11,"endLine":4}]}',
            },
            {
              message:
                '{"message":"Refactor this getter so that it actually refers to the property \'z\'.","secondaryLocations":[{"message":"Property which should be referred.","column":6,"line":6,"endColumn":12,"endLine":6}]}',
            },
            {
              message:
                '{"message":"Refactor this setter so that it actually refers to the property \'z\'.","secondaryLocations":[{"message":"Property which should be referred.","column":6,"line":6,"endColumn":12,"endLine":6}]}',
            },
          ],
          settings: { sonarRuntime: true },
        },
        {
          code: 'let _b = 0, _c = 0; Object.defineProperty(o, "b", { get() { return _c; } })',
          errors: 1,
        },
      ],
    });
  });
});
