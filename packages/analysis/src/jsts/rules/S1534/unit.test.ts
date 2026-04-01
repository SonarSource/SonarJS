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
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';
import { describe, it } from 'node:test';

describe('S1534', () => {
  it('S1534', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(`Decorated rule should provide suggestion`, rule, {
      valid: [
        {
          code: `let x = { a: 42, b: 42 }`,
        },
      ],
      invalid: [
        {
          code: `let x = { a: 42, a: 42 }`,
          errors: [
            {
              message: "Duplicate name 'a'.",
              suggestions: [
                { output: `let x = { a: 42 }`, desc: 'Remove this duplicate property' },
              ],
            },
          ],
        },
        {
          code: `let x = { a: 42, a: 42, b: 42 }`,
          errors: [
            {
              message: "Duplicate name 'a'.",
              suggestions: [
                { output: `let x = { a: 42, b: 42 }`, desc: 'Remove this duplicate property' },
              ],
            },
          ],
        },
        {
          code: `let x = { a: 42, b: 42, a: 42, }`,
          errors: [
            {
              message: "Duplicate name 'a'.",
              suggestions: [
                { output: `let x = { a: 42, b: 42, }`, desc: 'Remove this duplicate property' },
              ],
            },
          ],
        },
        {
          code: `
let x = { 
  a: 42,
  a: 42
}`,
          errors: [
            {
              message: "Duplicate name 'a'.",
              suggestions: [
                {
                  output: `
let x = { 
  a: 42
}`,
                  desc: 'Remove this duplicate property',
                },
              ],
            },
          ],
        },
        {
          code: `
let x = { 
  a: 42,
  get a() {
    return 42;
  },
}`,
          errors: [
            {
              message: "Duplicate name 'a'.",
              suggestions: [
                {
                  output: `
let x = { 
  a: 42,
}`,
                  desc: 'Remove this duplicate property',
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
