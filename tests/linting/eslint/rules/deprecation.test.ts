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
import { rule } from '@sonar/jsts/rules/deprecation';
import { RuleTester } from 'eslint';
import { TypeScriptRuleTester } from '../../../tools';

function invalid(code: string) {
  const errors: RuleTester.TestCaseError[] = [];
  const lines = code.split('\n');
  for (let i = 1; i <= lines.length; i++) {
    const line = lines[i - 1];
    if (line.includes('// Noncompliant') && !line.trim().startsWith('//')) {
      const issue = {
        line: i,
        endLine: i,
      };
      errors.push(issue);
      if (line.includes('x2')) {
        errors.push(issue);
      }
    }
  }
  return {
    code: code,
    errors,
  };
}

const fixtures = '../../../../linting/eslint/rules/fixtures/deprecation';
const ruleTester = new TypeScriptRuleTester();
ruleTester.run('should report usages of deprecated', rule, {
  valid: [
    {
      code: `
  function foo(strings: TemplateStringsArray, ...values: string[]): string;
  function foo(strings: TemplateStringsArray, ...values: number[]): string;
  /** @deprecated */
  function foo(strings: TemplateStringsArray, ...values: any[]): string;
  function foo(strings: TemplateStringsArray, ...values: any[]): string {
    return "result";
  }

  foo\`\`;
  foo\`${'foo'}\`;
  foo\`${42}\`;
  foo\`${[1, 2, 3]}\`; // FN Noncompliant, for some reason not resolved properly `,
    },
    {
      code: `
      module.exports = {
        foo: {
          [bar]: {
            baz
          }
        }
      }
      `,
    },
  ],
  invalid: [
    {
      code: `
  interface X {
    /** @deprecated use bar instead*/
    foo(pp: string): number;
  }
  function bar(x: X, p: string) {
    x.foo(p); // Noncompliant
  }`,
      errors: [
        { message: "'foo' is deprecated. use bar instead", line: 7, column: 7, endColumn: 10 },
      ],
    },

    invalid(`
  export class A {
    foo(e: KeyboardEvent) {
      return e.which; // Noncompliant
    }
  }`),

    invalid(`
  declare interface D {
      /** @deprecated */ m: () => void;
  }
  declare let d: D;
  d.m(); // Noncompliant
    `),

    invalid(`
  /**
   * @someTag
   * @deprecated since version 42
   */
  export class MyClass {
      /** @deprecated */ 
      deprecatedProperty: any;
      /** @deprecated with message */ oneMoreDeprecated: any;
      notDeprecated;
  }
  
  let myObj = new MyClass(); // Noncompliant
  let fromDeprecatedProp = myObj.deprecatedProperty; // Noncompliant
  foo(myObj.oneMoreDeprecated); // Noncompliant
  foo(fromDeprecatedProp);
  foo(myObj.notDeprecated);
  
  interface MyInterface extends MyClass {} // Noncompliant
  let myInterface: MyInterface;
  foo(myInterface.deprecatedProperty); // Noncompliant
  foo(myInterface.notDeprecated); 

  (function ({deprecatedProperty, notDeprecated, oneMoreDeprecated: tmp}: MyInterface) {})  // Noncompliant x2
  (function ({foo: {deprecatedProperty, notDeprecated}}: {foo: MyInterface}) {}) // Noncompliant

  let {deprecatedProperty, notDeprecated, oneMoreDeprecated} = myObj; // Noncompliant x2
  ({deprecatedProperty, notDeprecated, oneMoreDeprecated} = myObj); // Noncompliant x2
  
  ({deprecatedProperty: notDeprecated, notDeprecated: oneMoreDeprecated, oneMoreDeprecated: deprecatedProperty} = myObj); // Noncompliant x2
  let obj = { deprecatedProperty: 42, notDeprecated };
  
  /** @deprecated */
  let deprecatedVar; 
  ({deprecatedProperty: deprecatedVar} = myObj);  // Noncompliant x2 `),

    invalid(`
  /** @deprecated */
  const const1 = 1,
        const2 = 2;
  
  foo(const1 + const2); // Noncompliant
  export default const1;// Noncompliant
    `),

    invalid(`
  function fn<T>(): T;
  /** @deprecated */
  function fn(bar: any): any;
  function fn() { }
  
  fn<number>();
  fn(1); // Noncompliant
  foo(fn); // Noncompliant
    `),

    invalid(`
  class MyClass {
    /** @deprecated */
    static method(): void;
    static method(param): void;
    static method(param?): void {}
  }
  
  new MyClass();
  MyClass.method(); // Noncompliant
  MyClass.method(1);
    `),

    invalid(`
  interface MyInterface {
    /** @deprecated */
    method(): void;
    method(param): void;
  }
  let myInterface: MyInterface;
  myInterface.method(); // Noncompliant
  myInterface.method(1);
    `),

    invalid(`
  let callSignature: {
    /** @deprecated */
    (): void;
    (param): void;
  }
  callSignature(); // Noncompliant
  callSignature(42);

  /** @deprecated */
  let deprecatedCallSignature: {
    (): void;
  }
  deprecatedCallSignature(); // Noncompliant
  
  /** @deprecated */
  let deprecatedCallSignature2: () => void;
  deprecatedCallSignature2(); // Noncompliant`),

    invalid(`
  import * as allDeprecations from '${fixtures}/deprecations';
  foo(allDeprecations.deprecatedFunction);// Noncompliant

  import defaultImport, {deprecatedFunction, anotherDeprecatedFunction as aliasForDeprecated, notDeprecated1, notDeprecated2} from '${fixtures}/deprecations';
  defaultImport(); // Noncompliant
  deprecatedFunction(); // Noncompliant
  deprecatedFunction(1);
  aliasForDeprecated(); // Noncompliant
  noDeprecated1(); // OK
  noDeprecated2(); // OK

  import * as deprecationsExport from '${fixtures}/deprecationsExport';
  foo(deprecationsExport); // Noncompliant
  
  import {DeprecatedClass, ClassWithDeprecatedConstructor, ClassWithOneDeprecatedConstructor} from "${fixtures}/deprecations"
  const myObj: DeprecatedClass = new DeprecatedClass();  // Noncompliant x2
  const myObj1: DeprecatedConstructorClass = new ClassWithDeprecatedConstructor(); // Noncompliant
  new ClassWithOneDeprecatedConstructor();
  new ClassWithOneDeprecatedConstructor(1); // Noncompliant
  `),
  ],
});
