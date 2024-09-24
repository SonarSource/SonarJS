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
import { rule } from './rule.ts';
import { JavaScriptRuleTester } from '../../../tests/tools/index.ts';

const ruleTester = new JavaScriptRuleTester();

ruleTester.run('Empty collections should not be accessed or iterated', rule, {
  valid: [
    {
      code: `function okForNotEmptyInit() {
              const nonEmptyArray = [1, 2, 3];
              foo(nonEmptyArray[2]); // OK
              nonEmptyArray.forEach(item => console.log()); // OK
              for (const _ of nonEmptyArray) { console.log(); } // OK
            }`,
    },
    {
      code: `function okLatelyWritten() {
              const okLatelyWritten: number[] = [];
              okLatelyWritten.push(1);
              okLatelyWritten.forEach(item => console.log()); // OK
            }`,
    },
    {
      code: `function testCollectionContructors(){
              const notEmptyarrayConstructor = new Array(1, 2, 3);
              notEmptyarrayConstructor.forEach(item => console.log()); // Ok
            }`,
    },
    {
      code: `function parametersAreIgnore(parameterArray: number[]) {
              foo(parameterArray[1]);
            }`,
    },
    {
      code: `class MyClass {
              myArray: string [] = [];
              propertiesAreIgnored() {
                foo(this.myArray[1]); // OK
              }
            }`,
    },
    {
      code: `function arrayUsedAsArgument() {
              const array: number[] = [];
              foo(array);
              const copy = new Array(...array);
              copy.push(42);
              foo(array[1]); // OK

              return copy;
            }`,
    },
    {
      code: `function reassignment() {
              let overwrittenArray = [];
              const otherArray = [1,2,3,4];
              overwrittenArray = otherArray;
              foo(overwrittenArray[1]); // OK

              const arrayWrittenInsideArrow: number[] = [];
              foo((n: number) => arrayWrittenInsideArrow.push(n));
              foo(arrayWrittenInsideArrow[1]);  // OK

              let arrayWrittenInsideArrow2: number[] = [];
              foo((n: number) => arrayWrittenInsideArrow2 = otherArray);
              foo(arrayWrittenInsideArrow2[1]); // OK
            }`,
    },
    {
      code: `// Interface Declaration
              interface Array<T> {
                equals(array: Array<T>): boolean // OK, symbol Array is an interface declaration
              }

              // Type Alias Declaration
              type MyArrayTypeAlias = T[];
              // OK, symbol MyArrayTypeAlias is a TypeAliasDeclaration
              function isMyArrayTypeAlias(value: MyArrayTypeAlias | number): value is MyArrayTypeAlias {
                return !!(value as any).length;
              }`,
    },
    {
      code: `function arrayUsedInPropertyDeclaration() {
              const emptyArray: number[] = [];
              return {
                a: emptyArray // OK, emptyArray is used in a property declaration
              };
            }

            function arrayUsedInReturnStatement() {
              const emptyArray: number[] = [];
              return emptyArray; // OK, emptyArray is used in a return statement
            }`,
    },
    {
      code: `function writeOnAliasVariable() {
              const reassignedArray: number[] = [];
              const aliasArray = reassignedArray;
              aliasArray.push(1);

              foo(aliasArray[0]); // OK
              foo(reassignedArray[0]); // OK
            }`,
    },
    {
      code: `function assignmentEmptyArray() {
              const assignmentEmptyArray: number[] = [];
              assignmentEmptyArray[1] = 42; // ok
            }`,
    },
    {
      code: `function arrayNotInitialized() {
              let notInitializedArray!: number[];
              foo(notInitializedArray[0]); // Not reported
            }`,
    },
    {
      code: `function arrayInitializedByFunctionCall(init: () => number[]) {
                const externalInitializedArray: number[] = init();
                foo(externalInitializedArray[0]); // OK
              }`,
    },
    {
      code: `function arrayUsedInORExpression(otherArray: number[]) {
                const emptyArray: number[] = [];
                console.log(otherArray || emptyArray); // OK used in OR expression
              }`,
    },
    {
      code: `function writeWithTernaryOperator(flag: boolean) {
              const potentiallyNonEmptyArray1 : number [] = [];
              const potentiallyNonEmptyArray2: number[] = [];
              (flag ? potentiallyNonEmptyArray1 : potentiallyNonEmptyArray2).push(1);

              foo(potentiallyNonEmptyArray1[0]); // OK
              foo(potentiallyNonEmptyArray2[0]); // OK
            }`,
    },
    {
      code: `function destructuringAssignmentEmptyArray() {
              const destructuringAssignmentEmptyArray: number[] = [];
              [ , destructuringAssignmentEmptyArray[1]] = [42, 42]; // ok
              foo(destructuringAssignmentEmptyArray[1]);
            }`,
    },
    {
      code: `import { IMPORTED_ARRAY } from "./dep";
            foo(IMPORTED_ARRAY[1]); // OK`,
    },
    {
      code: `function indexWriteInInnerFunction() {
        let a = [];
        innerFunction();
        a.indexOf('x');

        function innerFunction() {
          a[0] = 42;
        }
      }`,
    },
    {
      code: `function overwritingCollectionInInnerFunction() {
        let a = [];
        innerFunction();
        a.indexOf('x');

        function innerFunction() {
          a = unknownFunction();
        }
      }`,
    },
    {
      code: `
      // Since issue-1974, order of occurrences is ignored, and parameters
      // are considered potentially nonempty, thus all reading occurrences
      // are considered meaningful.
      function parametersAreIgnored(parameterArray: number[]) {
        foo(parameterArray[1]);
        parameterArray = [];
        foo(parameterArray[1]); // FN introduced with issue-1974 to avoid FPs.
      }`,
    },
    {
      code: `
      // Analogous to parametersAreIgnored
      import {c} from 'nonemptyCollections';
      c = [];
      console.log(c[0]); // FN introduced with issue-1974 to avoid FPs
      `,
    },
    {
      code: `
      function argumentsAreNonempty() {
        console.log(arguments[0]);
      }`,
    },
  ],
  invalid: [
    {
      code: `const array : number[] = [];
              export function testElementAccessRead() {
                console.log(array[2]);
              }`,
      errors: [
        {
          messageId: 'reviewUsageOfIdentifier',
          data: {
            identifierName: 'array',
          },
          line: 3,
          endLine: 3,
          column: 29,
          endColumn: 34,
        },
      ],
    },
    {
      code: `function testAccessorMethodsRead(otherArray: number[]) {
              const initialArray: number[] = [];
              return initialArray.concat(otherArray); // Noncompliant
            }`,
      errors: [
        {
          messageId: 'reviewUsageOfIdentifier',
          data: {
            identifierName: 'initialArray',
          },
        },
      ],
    },
    {
      code: `const array : number[] = [];
            export function testElementAccessRead() {
              console.log(array[2]);
              console.log(array[2]);
              console.log(array[2]);
              console.log(array[2]);
            }`,
      errors: [
        {
          messageId: 'reviewUsageOfIdentifier',
          data: {
            identifierName: 'array',
          },
        },
        {
          messageId: 'reviewUsageOfIdentifier',
          data: {
            identifierName: 'array',
          },
        },
        {
          messageId: 'reviewUsageOfIdentifier',
          data: {
            identifierName: 'array',
          },
        },
        {
          messageId: 'reviewUsageOfIdentifier',
          data: {
            identifierName: 'array',
          },
        },
      ],
    },
    {
      code: `const array : number[] = [];
            function testLoopRead() {
              for (const _ of array) { // Noncompliant
              }
              for (const _ in array) { // Noncompliant
              }
            }
            function testIterationMethodsRead() {
              array.forEach(item => console.log()); // Noncompliant
              array[Symbol.iterator](); // Noncompliant
            }
            `,
      errors: [
        {
          messageId: 'reviewUsageOfIdentifier',
          data: {
            identifierName: 'array',
          },
        },
        {
          messageId: 'reviewUsageOfIdentifier',
          data: {
            identifierName: 'array',
          },
        },
        {
          messageId: 'reviewUsageOfIdentifier',
          data: {
            identifierName: 'array',
          },
        },
        {
          messageId: 'reviewUsageOfIdentifier',
          data: {
            identifierName: 'array',
          },
        },
      ],
    },
    {
      code: `function testCollectionContructors(){
              const arrayConstructor = new Array();
              arrayConstructor.forEach(item => console.log()); // Noncompliant

              const arrayWithoutNew = Array();
              arrayWithoutNew.map(item => console.log()); // Noncompliant

              const myMap = new Map();
              myMap.get(1); // Noncompliant

              const mySet = new Set();
              mySet.has(1); // Noncompliant
            }`,
      errors: [
        {
          messageId: 'reviewUsageOfIdentifier',
          data: {
            identifierName: 'arrayConstructor',
          },
        },
        {
          messageId: 'reviewUsageOfIdentifier',
          data: {
            identifierName: 'arrayWithoutNew',
          },
        },
        {
          messageId: 'reviewUsageOfIdentifier',
          data: {
            identifierName: 'myMap',
          },
        },
        {
          messageId: 'reviewUsageOfIdentifier',
          data: {
            identifierName: 'mySet',
          },
        },
      ],
    },
    {
      code: `function compoundAssignmentEmptyArray() {
              const compoundAssignmentEmptyArray: number[] = [];
              compoundAssignmentEmptyArray[1] += 42; // Noncompliant
            }`,
      errors: [
        {
          messageId: 'reviewUsageOfIdentifier',
          data: {
            identifierName: 'compoundAssignmentEmptyArray',
          },
        },
      ],
    },
    {
      code: `function elementAccessWithoutAssignment() {
              const elementAccessWithoutAssignment: number[] = [];
              foo(elementAccessWithoutAssignment[1]); // Noncompliant
            }`,
      errors: [
        {
          messageId: 'reviewUsageOfIdentifier',
          data: {
            identifierName: 'elementAccessWithoutAssignment',
          },
        },
      ],
    },
    {
      code: `function okLatelyInitialized() {
              let arrayLatelyInitialized: number[];
              arrayLatelyInitialized = [];
              arrayLatelyInitialized.forEach(item => console.log()); // Noncompliant
            }`,
      errors: [
        {
          messageId: 'reviewUsageOfIdentifier',
          data: {
            identifierName: 'arrayLatelyInitialized',
          },
        },
      ],
    },
    {
      code: `export let exportedArray: number[] = [];
            foo(exportedArray[1]); // Can be a FP, but it's a corner case`,
      errors: [
        {
          messageId: 'reviewUsageOfIdentifier',
          data: {
            identifierName: 'exportedArray',
          },
        },
      ],
    },
  ],
});
