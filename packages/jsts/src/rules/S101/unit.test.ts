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
//import * as path from 'path'

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2018 },
});

const DEFAULT_FORMAT = '^[A-Z][a-zA-Z0-9]*$';
const CUSTOM_FORMAT = '^[_A-Z][a-zA-Z0-9]*$';

ruleTester.run('Class and interface names should comply with a naming convention', rule, {
  valid: [
    {
      code: `
      class MyClass {}
      var x = class y {} // Compliant, rule doesn't check class expressions
      interface MyInterface {}
      `,
      options: [{ format: DEFAULT_FORMAT }],
    },
    {
      code: `
      class  MyClass {}
      class _MyClass {}
      interface _MyInterface {}
      `,
      options: [{ format: CUSTOM_FORMAT }],
    },
  ],
  invalid: [
    {
      code: `class my_class {}`,
      options: [{ format: DEFAULT_FORMAT }],
      errors: [
        {
          message: `Rename class "my_class" to match the regular expression ${DEFAULT_FORMAT}.`,
          line: 1,
          endLine: 1,
          column: 7,
          endColumn: 15,
        },
      ],
    },
    {
      code: `interface my_interface {}`,
      options: [{ format: DEFAULT_FORMAT }],
      errors: [
        {
          message: `Rename interface "my_interface" to match the regular expression ${DEFAULT_FORMAT}.`,
        },
      ],
    },
    {
      code: `class __MyClass {}`,
      options: [{ format: CUSTOM_FORMAT }],
      errors: [
        { message: `Rename class "__MyClass" to match the regular expression ${CUSTOM_FORMAT}.` },
      ],
    },
    {
      code: `interface __MyInterface {}`,
      options: [{ format: CUSTOM_FORMAT }],
      errors: [
        {
          message: `Rename interface "__MyInterface" to match the regular expression ${CUSTOM_FORMAT}.`,
        },
      ],
    },
  ],
});
