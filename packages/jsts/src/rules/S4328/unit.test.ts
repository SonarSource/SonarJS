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
import { rule } from './';
import path from 'path';
import { clearPackageJsons, loadPackageJsons } from '../helpers';

//reset and search package.json files in rule dir
clearPackageJsons();
loadPackageJsons(__dirname, []);

const fixtures = path.join(__dirname, 'fixtures');
const options = [
  {
    whitelist: [],
  },
];

const ruleTesterForPathMappings = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    tsconfigRootDir: path.join(fixtures, 'ts-project-with-path-aliases'),
    project: './tsconfig.json',
  },
});

const filenameForFileWithPathMappings = path.join(fixtures, 'ts-project-with-path-aliases/file.ts');

ruleTesterForPathMappings.run('Path aliases should be exempt', rule, {
  valid: [
    {
      code: `
        import { f as f1 } from '$b/c/d.e';
      `,
      filename: filenameForFileWithPathMappings,
      options,
    },
  ],
  invalid: [
    {
      code: `
        import { f as f1 } from '$invalid/c/d.e';
        import { f as f2 } from '@invalid/c/d.e';
        import { f as f3 } from 'invalid/c/d.e';
        import { f as f4 } from 'nonexistent';
        import "foo";
        import "foo/baz/something";
        require("this/doesnt/exist").f;
        import { f as f8 } from 'p/refixc/d.e/suffi/x2';
        import { f as f9 } from 'yoda/c/d.e/paths';
        import { f as fA } from 'dependency-not-in-package-json';
      `,
      filename: filenameForFileWithPathMappings,
      options,
      errors: 10,
    },
  ],
});
