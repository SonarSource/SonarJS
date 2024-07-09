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
import { rule } from './rule';
import { RuleTester } from 'eslint';
import path from 'path';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    project: `./tsconfig.json`,
    tsconfigRootDir: path.join(__dirname, 'fixtures'),
  },
});

ruleTester.run('S6606', rule, {
  valid: [
    {
      code: `
  function foo(value: string) {
    return value || 'default';
  }
  `,
      filename: path.join(__dirname, 'fixtures/index.ts'),
    },
    {
      code: `
  function foo(value: string | number) {
    return value || 'default';
  }
  `,
      filename: path.join(__dirname, 'fixtures/index.ts'),
    },
    {
      code: `
  function foo(value: boolean | null) {
    return value || 'default';
  }
  `,
      filename: path.join(__dirname, 'fixtures/index.ts'),
    },
    {
      code: `
  function foo(value: { baz: number } | null) {
    return value || 'default';
  }
  `,
      filename: path.join(__dirname, 'fixtures/index.ts'),
    },
    {
      code: `
  function foo(value: Date | null) {
    return value || 'default';
  }
  `,
      filename: path.join(__dirname, 'fixtures/index.ts'),
    },
  ],
  invalid: [
    {
      code: `
  function foo(value: string | null) {
    return value || 'default';
  }
  `,
      filename: path.join(__dirname, 'fixtures/index.ts'),
      errors: 1,
    },
    {
      code: `
  function foo(value: number | null) {
    return value || 'default';
  }
  `,
      filename: path.join(__dirname, 'fixtures/index.ts'),
      errors: 1,
    },
    {
      code: `
  function foo(value: bigint | null) {
    return value || 'default';
  }
  `,
      filename: path.join(__dirname, 'fixtures/index.ts'),
      errors: 1,
    },
  ],
});
