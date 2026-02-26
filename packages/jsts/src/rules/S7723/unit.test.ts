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
          { code: `var obj = Object(value);` }, // type coercion
          { code: `let O = Object(this);` }, // polyfill pattern
          { code: `var arr = Array(10);` }, // pre-sized array
          { code: `var arr = Array(count).fill(0);` },
          { code: `var spaces = Array(width + 1).join(' ');` },
          { code: `var result = Array(set.size);` },
        ],
        invalid: [
          {
            code: `var obj = Object();`,
            output: `var obj = new Object();`,
            errors: 1,
          },
          {
            code: `var arr = Array();`,
            output: `var arr = new Array();`,
            errors: 1,
          },
          {
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
