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
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import path from 'node:path';
import { describe, it } from 'node:test';

describe('S6661', () => {
  it('S6661', () => {
    process.chdir(import.meta.dirname); // change current working dir to avoid the package.json lookup to up in the tree
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('Object spread syntax should be used instead of "Object.assign"', rule, {
      valid: [
        {
          code: `Object.assign(foo, bar);`,
        },
        {
          // False positive scenario (JS-1155): Aliased Object.assign should NOT be flagged
          // This is a common pattern in bundled/minified code (e.g., React Native) where
          // Object.assign is aliased to a local variable. The rule should only flag explicit
          // Object.assign() member expressions, not identifier calls.
          // Pattern from: simple-examples.json
          code: `
var assign = Object.assign;
const props = { configurable: true, enumerable: true, writable: true };
const result = assign({}, props, { value: console.log });`,
        },
        {
          // False positive scenario (JS-1155): Custom assign function (not Object.assign)
          // This pattern appears in React Native bundles where a custom assign
          // function is used, not the built-in Object.assign.
          code: `
function assign(target, ...sources) {
  return Object.assign(target, ...sources);
}
const props = { configurable: true, enumerable: true, writable: true };
const result = assign({}, props, { value: console.log });`,
        },
      ],
      invalid: [
        {
          code: `const a = Object.assign({}, foo);`,
          output: `const a = { ...foo};`,
          errors: [
            {
              messageId: 'useSpreadMessage',
              line: 1,
              endLine: 1,
              column: 11,
              endColumn: 24,
            },
          ],
        },
        {
          code: `const b = Object.assign({}, foo, bar);`,
          output: `const b = { ...foo, ...bar};`,
          errors: [
            {
              messageId: 'useSpreadMessage',
              line: 1,
              endLine: 1,
              column: 11,
              endColumn: 24,
            },
          ],
        },
      ],
    });

    const filename = path.join(import.meta.dirname, 'fixtures', 'unsupported-node', 'file.js');

    ruleTester.run(
      'When the project does not support the object spread syntax, the rule should be ignored',
      rule,
      {
        valid: [
          {
            code: `Object.assign({}, bar);`,
            filename,
          },
        ],
        invalid: [],
      },
    );
  });
});
