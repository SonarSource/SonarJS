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
import { rule } from './index.js';

const ruleTesterJS = new RuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
});

ruleTesterJS.run('Wildcard imports should not be used', rule, {
  valid: [
    {
      code: ` 
      import a from 'aa'; // ImportDefaultSpecifier
      import { b } from 'bb'; // ImportSpecifier
      import { c, d } from 'cd'; // ImportSpecifier
      import { e as f } from 'e'; // ImportSpecifier`,
    },
    {
      code: `export { m } from "module-name";`,
    },
  ],
  invalid: [
    {
      code: `
      import * as name1 from "module-name";
      import defaultMember, * as name2 from "module-name";
      `,
      errors: [
        {
          message: `Explicitly import the specific member needed.`,
          line: 2,
          endLine: 2,
          column: 14,
          endColumn: 24,
        },
        {
          message: `Explicitly import the specific member needed.`,
          line: 3,
          endLine: 3,
          column: 29,
          endColumn: 39,
        },
      ],
    },
    {
      code: `export * from "module-name";`,
      errors: [
        {
          message: `Explicitly export the specific member needed.`,
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 29,
        },
      ],
    },
  ],
});
