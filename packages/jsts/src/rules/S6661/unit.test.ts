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
import { RuleTester } from 'eslint';
import { rule } from './/index.ts';
import { clearPackageJsons, loadPackageJsons } from '../helpers/package-json.ts';
import path from 'path';

clearPackageJsons();

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

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

clearPackageJsons();
const project = path.join(__dirname, 'fixtures', 'unsupported-node');
loadPackageJsons(project, []);
const filename = path.join(project, 'file.js');

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
