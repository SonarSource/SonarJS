/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import path from 'path';

process.chdir(import.meta.dirname); // change current working dir to avoid the package.json lookup to up in the tree
const ruleTester = new NodeRuleTester({ parserOptions: { ecmaVersion: 2018 } });

ruleTester.run('Object spread syntax should be used instead of "Object.assign"', rule, {
  valid: [
    {
      code: `Object.assign(foo, bar);`,
    },
  ],
  invalid: [
    {
      code: `const a = Object.assign({}, foo);`,
      output: `const a = { ...foo};`,
      errors: [
        {
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
          line: 1,
          endLine: 1,
          column: 11,
          endColumn: 24,
        },
      ],
    },
    {
      code: `
var assign = Object.assign;
const b = assign({}, foo, bar);`,
      output: `
var assign = Object.assign;
const b = { ...foo, ...bar};`,
      errors: [
        {
          line: 3,
          endLine: 3,
          column: 11,
          endColumn: 17,
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
