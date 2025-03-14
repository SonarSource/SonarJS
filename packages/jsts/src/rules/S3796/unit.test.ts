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
import { DefaultParserRuleTester, RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S3796', () => {
  it('S3796', () => {
    const typeScriptRuleTester = new RuleTester();
    typeScriptRuleTester.run(
      'Callbacks of array methods should have return statements [w types]',
      rule,
      {
        valid: [
          {
            code: `
      const arr = [];
      arr.map(x => x*2)`,
          },
          {
            code: `
      const obj = {};
      obj.map(function () {})`,
          },
          {
            code: `
      const arr = [];
      arr.forEach(function () {});
      `,
          },
          {
            code: `
      const arr = [];
      const mapper = someVar ? function () {} : function (x) {return x + 1};
      arr.map(mapper)`,
          },
          {
            code: `
      var myArray = [1, 2];

      var result = myArray.map(async (element) => { await doSomething(element); });
      var result = myArray.map(async function(element) { await doSomething(element); });

      var asyncFunc = async (element) => { await doSomething(element); }
      async function anotherAsyncFunc (element) { await doSomething(element); }

      var result = myArray.map(asyncFunc);
      var result = myArray.map(anotherAsyncFunc);`,
          },
          {
            code: `
      Array.from(a);
      Array.from(a, b);
      Array.from(a, function(){return 42;});

      Array.isArray(function(){});
      Array.isArray(a, function(){});`,
          },
          {
            code: `
      const arr = []
      arr["foo"](function() {})`,
          },
          {
            code: `
      function someFunc(callback) {
        callback();
      }
      const arr = [someFunc];
      const some = 0;
      arr[some](function() {console.log("hello there!")});`,
          },
        ],
        invalid: [
          {
            code: `
      const arr = [];
      arr.map(function(x) { x*2 })`,
            errors: [
              {
                message: `Add a "return" statement to this callback.`,
                line: 3,
                endLine: 3,
                column: 15,
                endColumn: 23,
              },
            ],
          },
          {
            code: `
      const myArray = [];
      myArray.every(function(){}); // Noncompliant
      myArray.filter(function(){}); // Noncompliant
      myArray.find(function(){}); // Noncompliant
      myArray.findIndex(function(){}); // Noncompliant
      myArray.map(function(){}); // Noncompliant
      myArray.reduce(function(){}); // Noncompliant
      myArray.reduceRight(function(){}); // Noncompliant
      myArray.some(function(){}); // Noncompliant
      myArray.sort(function(){}); // Noncompliant
      `,
            errors: 9,
          },
          {
            code: `
      const arr = [];
      const mapper = function () {};
      arr.map(mapper)`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 4,
                endLine: 4,
                column: 15,
                endColumn: 21,
              },
            ],
          },
          {
            code: `
      var myArray = [1, 2];

      var obj = {
        badCallback : function() {},
        goodCallback : function() { return something; }
      };

      myArray.map(obj.goodCallback);
      myArray.map(obj.badCallback);`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 10,
              },
            ],
          },
          {
            code: `
      var myArray = [1, 2];

      var callbackProvider = function() {
        return function() {};
      };

      myArray.map(callbackProvider);  // OK

      myArray.map(callbackProvider());`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 10,
              },
            ],
          },
          {
            code: `
      Array.from(a, () => {}); // Noncompliant`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 2,
                endLine: 2,
                column: 24,
                endColumn: 26,
              },
            ],
          },
          {
            code: `
      var myArray = [1, 2];
      myArray.findLast(x => {}); // Noncompliant`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 3,
                endLine: 3,
                column: 26,
                endColumn: 28,
              },
            ],
          },
          {
            code: `
      var myArray = [1, 2];
      myArray.findLastIndex(x => {}); // Noncompliant`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 3,
                endLine: 3,
                column: 31,
                endColumn: 33,
              },
            ],
          },
          {
            code: `
      var myArray = [1, 2];
      myArray.toSorted(x => {}); // Noncompliant`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 3,
                endLine: 3,
                column: 26,
                endColumn: 28,
              },
            ],
          },
          {
            code: `
      var myArray = [1, 2];
      myArray.flatMap(x => {}); // Noncompliant`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 3,
                endLine: 3,
                column: 25,
                endColumn: 27,
              },
            ],
          },
          {
            code: `
      var myArray = new Int8Array([1, 2]);
      myArray.every(x => {}); // Noncompliant`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 3,
                endLine: 3,
                column: 23,
                endColumn: 25,
              },
            ],
          },
          {
            code: `
      var myArray = new Uint8Array([1, 2]);
      myArray.every(x => {}); // Noncompliant`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 3,
                endLine: 3,
                column: 23,
                endColumn: 25,
              },
            ],
          },
          {
            code: `
      var myArray = new Uint8ClampedArray([1, 2]);
      myArray.every(x => {}); // Noncompliant`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 3,
                endLine: 3,
                column: 23,
                endColumn: 25,
              },
            ],
          },
          {
            code: `
      var myArray = new Int16Array([1, 2]);
      myArray.every(x => {}); // Noncompliant`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 3,
                endLine: 3,
                column: 23,
                endColumn: 25,
              },
            ],
          },
          {
            code: `
      var myArray = new Uint16Array([1, 2]);
      myArray.every(x => {}); // Noncompliant`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 3,
                endLine: 3,
                column: 23,
                endColumn: 25,
              },
            ],
          },
          {
            code: `
      var myArray = new Int32Array([1, 2]);
      myArray.every(x => {}); // Noncompliant`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 3,
                endLine: 3,
                column: 23,
                endColumn: 25,
              },
            ],
          },
          {
            code: `
      var myArray = new Uint32Array([1, 2]);
      myArray.every(x => {}); // Noncompliant`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 3,
                endLine: 3,
                column: 23,
                endColumn: 25,
              },
            ],
          },
          {
            code: `
      var myArray = new Float32Array([1, 2]);
      myArray.every(x => {}); // Noncompliant`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 3,
                endLine: 3,
                column: 23,
                endColumn: 25,
              },
            ],
          },
          {
            code: `
      var myArray = new Float64Array([1, 2]);
      myArray.every(x => {}); // Noncompliant`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 3,
                endLine: 3,
                column: 23,
                endColumn: 25,
              },
            ],
          },
          {
            code: `
      var myArray = new BigInt64Array([1n, 2n]);
      myArray.every(x => {}); // Noncompliant`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 3,
                endLine: 3,
                column: 23,
                endColumn: 25,
              },
            ],
          },
          {
            code: `
      var myArray = new BigUint64Array([1n, 2n]);
      myArray.every(x => {}); // Noncompliant`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 3,
                endLine: 3,
                column: 23,
                endColumn: 25,
              },
            ],
          },
          {
            code: `
      var myArray = [1, 2];
      myArray["every"](x => {}); // Noncompliant`,
            errors: [
              {
                message: 'Add a "return" statement to this callback.',
                line: 3,
                endLine: 3,
                column: 26,
                endColumn: 28,
              },
            ],
          },
        ],
      },
    );

    const eslintRuleTester = new DefaultParserRuleTester();
    eslintRuleTester.run(
      'Callbacks of array methods should have return statements [w/o types]',
      rule,
      {
        valid: [
          {
            code: `
      let arr = [];
      arr.map(x => x + 1);`,
          },
          {
            code: `
      let arr = [];
      arr.map(x => { x + 1;})`, // issue not raised because no types are available
          },
        ],
        invalid: [],
      },
    );
  });
});
