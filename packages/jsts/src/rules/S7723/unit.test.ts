/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S7723', () => {
  it('S7723', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run(
      `Built-in constructors should be called consistently with or without "new"`,
      rule,
      {
        valid: [
          {
            // Object(value) is type coercion, not object creation
            code: `var obj = Object(value);`,
          },
          {
            // Defensive coercion in utility function
            code: `
function conformsTo(object, props) {
  object = Object(object);
  return props.every(key => key in object);
}`,
          },
          {
            // Object(value) nested in Object.values()
            code: `Object.values(Object(templates)).length > 0;`,
          },
          {
            // Object(value) as return value
            code: `function toObject(val) { return Object(val); }`,
          },
          {
            // Object() with multiple arguments
            code: `var result = Object(a, b);`,
          },
          {
            // Object(this) in polyfill pattern
            code: `let O = Object(this);`,
          },
          {
            // Object(value) with 'in' operator for safe property checking
            code: `var length = 'length' in Object(obj) && obj.length;`,
          },
          {
            // Object(value) in for...in for safe iteration
            code: `for (var key in Object(object)) {}`,
          },
          {
            code: `var obj = new Object();`,
          },
          {
            code: `var arr = new Array(10);`,
          },
          {
            // Array(n) pre-sizing idiom
            code: `var arr = Array(10);`,
          },
          {
            // Array(n).fill()
            code: `var arr = Array(count).fill(0);`,
          },
          {
            // Array(n).join() string repetition
            code: `var spaces = Array(width + 1).join(' ');`,
          },
          {
            // Array(n) chained with fill and map
            code: `var grid = Array(rows).fill(null).map(() => Array(cols).fill(0));`,
          },
          {
            // Array.from(Array(n)) indexed iteration
            code: `var items = Array.from(Array(MAX_ITEMS)).map((_, i) => i);`,
          },
          {
            // Array(n) pre-allocation
            code: `var result = Array(set.size);`,
          },
        ],
        invalid: [
          {
            // Object() without arguments is still non-compliant
            code: `var obj = Object();`,
            output: `var obj = new Object();`,
            errors: 1,
          },
          {
            // Array() without arguments
            code: `var arr = Array();`,
            output: `var arr = new Array();`,
            errors: 1,
          },
          {
            // Array with multiple arguments
            code: `var arr = Array(1, 2, 3);`,
            output: `var arr = new Array(1, 2, 3);`,
            errors: 1,
          },
          {
            code: `throw Error("something went wrong");`,
            output: `throw new Error("something went wrong");`,
            errors: 1,
          },
          {
            code: `var re = RegExp("^test");`,
            output: `var re = new RegExp("^test");`,
            errors: 1,
          },
        ],
      },
    );
  });
});
