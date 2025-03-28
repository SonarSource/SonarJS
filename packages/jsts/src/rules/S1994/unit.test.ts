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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S1994', () => {
  it('S1994', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('Loop counter', rule, {
      valid: [
        {
          code: `
      var i, j, k;
      for (i = 0; i < 3; i++) {}
      for (i = 0; i < 3; i+=1) {}
      for (i = 0; i < 3; j++, i++) {}
      for (i = 0; i < 3; update()) {}
      for (i = 0; condition(i); i++) {}
      for (i = 0; x.y.condition(); x.y.update()) {}
      for (i = 0; x.y.condition(); x.z.update()) {}
      for (i = 0; this.i < 3; this.i++) {}
      for (i = 0; x.y.condition(i); i++) {}
      for (i = 0; x.y.condition[i]; i++) {}
      for (i = 0; x.y < 3; x = x.next) {}
      for (i = 0; x < 3; {x} = obj) {}
      for (i = 0; x < 3; {y: x} = obj) {}
      for (i = 0; x < 3; {y: x = 42 } = obj) {}
      for (i = 0; x < 3; [x] = obj) {}
      for (i = 0; i < 3; ) {}
      for (i = 0; ; i++) {}      
      `,
        },
      ],
      invalid: [
        {
          code: `
      var i, j; 
      for (i = 0; i < 3; j++) {} // Noncompliant`,
          errors: [
            {
              message: `This loop's stop condition tests "i" but the incrementer updates "j".`,
              line: 3,
              endLine: 3,
              column: 7,
              endColumn: 10,
            },
          ],
        },
        {
          code: `
      var i, j, k;
      for (i = 0; i < 3; j+=1) {}
      for (i = 0; i < 3 && j < 4; k++) {}
      for (i = 0; condition(); i++) {}
      for (i = 0; x.y.condition(); z.y.update()) {}
      for (i = 0; this.i < 3; this.j++) {}
      for (i = 0; i < 3; j = -i) {}
      for (i = 0; i < 3; {x} = obj) {}
      for (i = 0; i < 3; {y: x} = obj) {}
      for (i = 0; i < 3; {y: x = 42 } = obj) {}
      for (i = 0; i < 3; { x = 42 } = obj) {}
      for (i = 0; i < 3; [x] = obj) {}`,
          errors: [
            {
              line: 3,
              message: `This loop's stop condition tests "i" but the incrementer updates "j".`,
            },
            {
              line: 4,
              message: `This loop's stop condition tests "i, j" but the incrementer updates "k".`,
            },
            {
              line: 5,
              message: `This loop's stop condition tests "condition" but the incrementer updates "i".`,
            },
            {
              line: 6,
              message: `This loop's stop condition tests "x" but the incrementer updates "z".`,
            },
            {
              line: 7,
              message: `This loop's stop condition tests "this.i" but the incrementer updates "this.j".`,
            },
            {
              line: 8,
              message: `This loop's stop condition tests "i" but the incrementer updates "j".`,
            },
            {
              line: 9,
              message: `This loop's stop condition tests "i" but the incrementer updates "x".`,
            },
            {
              line: 10,
              message: `This loop's stop condition tests "i" but the incrementer updates "x".`,
            },
            {
              line: 11,
              message: `This loop's stop condition tests "i" but the incrementer updates "x".`,
            },
            {
              line: 12,
              message: `This loop's stop condition tests "i" but the incrementer updates "x".`,
            },
            {
              line: 13,
              message: `This loop's stop condition tests "i" but the incrementer updates "x".`,
            },
          ],
        },
      ],
    });
  });
});
