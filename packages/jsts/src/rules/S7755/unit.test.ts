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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S7755', () => {
  it('S7755', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('Redundant React fragments should be removed', rule, {
      valid: [
        {
          code: `
function getLastNode() {
    const items = document.querySelectorAll(".someClass"); // not an array
    return items[items.length - 1];
}`,
        },
      ],
      invalid: [
        {
          code: `
const string = "Hello world!";
foo = string.charAt(string.length - 5);
const array = ["a", "b", "c"];
foo = array[array.length - 1];
foo = array.slice(-1)[0];
foo = array.slice(-1).pop();
foo = array.slice(-1).shift();
foo = lodash.last(array);
`,
          output: `
const string = "Hello world!";
foo = string.charAt(string.length - 5);
const array = ["a", "b", "c"];
foo = array.at(-1);
foo = array.at(-1);
foo = array.at(-1);
foo = array.at(-1);
foo = array.at(-1);
`,
          errors: [
            {
              messageId: 'string-char-at-negative',
              suggestions: [
                {
                  desc: 'Use `.at(…)`.',
                  output: `
const string = "Hello world!";
foo = string.at(- 5);
const array = ["a", "b", "c"];
foo = array[array.length - 1];
foo = array.slice(-1)[0];
foo = array.slice(-1).pop();
foo = array.slice(-1).shift();
foo = lodash.last(array);
`,
                },
              ],
            },
            {
              messageId: 'negative-index',
            },
            {
              messageId: 'slice',
            },
            {
              messageId: 'slice',
            },
            {
              messageId: 'slice',
            },
            {
              messageId: 'get-last-function',
            },
          ],
        },
      ],
    });
  });
});
