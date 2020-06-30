/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import { rule } from '../../src/rules/no-implicit-dependencies';
import * as path from 'path';

const filename = path.join(__dirname, '../fixtures/package-json-project/file.js');
const options = [];

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
});

ruleTester.run('Dependencies should be explicit', rule, {
  valid: [
    {
      code: `import * as fs from "fs";`,
      filename,
      options,
    },
    {
      code: `import * as ts from "devDependency";`,
      filename,
      options,
    },
    {
      code: `import "peerDependency";`,
      filename,
      options,
    },
    {
      code: `import "dependency";`,
      filename,
      options,
    },
    {
      code: `import "@namespaced/dependency";`,
      filename,
      options,
    },
    {
      code: `import "typed-dependency";`,
      filename,
      options,
    },
    {
      code: `import "whitelist";`,
      filename,
      options: ['whitelist'],
    },
    {
      code: `import "@whitelist/dependency";`,
      filename,
      options: ['@whitelist/dependency'],
    },
    {
      code: `import "./relative";`,
      filename,
      options,
    },
    {
      code: `import * as n from 1;`,
      filename,
      options,
    },

    {
      code: `const fs = require("fs");`,
      filename,
      options,
    },
    {
      code: `const foo = require("foo", "bar");`,
      filename,
      options,
    },
    {
      code: `import "dependency";`,
      filename: path.join(__dirname, '../fixtures/bom-package-json-project/file.js'),
      options,
    },
  ],
  invalid: [
    {
      code: `import "foo";`,
      filename,
      options,
      errors: [
        {
          message: 'Either remove this import or add it as a dependency.',
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 7,
        },
      ],
    },
    {
      code: `let foo = require("foo");`,
      filename,
      options,
      errors: [
        {
          message: 'Either remove this import or add it as a dependency.',
          line: 1,
          endLine: 1,
          column: 11,
          endColumn: 18,
        },
      ],
    },
    {
      code: `import "foo/bar";`,
      filename,
      options,
      errors: 1,
    },
    {
      code: `import "foo";`,
      filename: path.join(__dirname, '../fixtures/empty-package-json-project/file.js'),
      options,
      errors: 1,
    },
    {
      code: `import "foo";`,
      filename: path.join(__dirname, '../fixtures/package-json-project/dir/subdir/file.js'),
      options,
      errors: 1,
    },
    {
      code: `import "foo";`,
      filename: '/',
      options,
      errors: 1,
    },
  ],
});

// Refer to
// https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/parser/README.md#configuration
// especially for the description of `tsconfigRootDir` + `project` and the `createDefaultProgram`-option.
const ruleTesterForPathMappings = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    tsconfigRootDir: './tests/fixtures/ts-project-with-path-aliases',
    project: './tsconfig.json',
    createDefaultProgram: true,
  },
});

const filenameForFileWithPathMappings = path.join(
  __dirname,
  '../fixtures/ts-project-with-path-aliases/file.ts',
);

ruleTesterForPathMappings.run('Path aliases should be exempt.', rule, {
  valid: [
    {
      code: `import { f } from '$core/services/configuration.service';`,
      filename: filenameForFileWithPathMappings,
    },
    {
      code: `import { f } from '@core/services/configuration.service';`,
      filename: filenameForFileWithPathMappings,
    },
    {
      code: `import { f } from 'core/services/configuration.service';`,
      filename: filenameForFileWithPathMappings,
    },
    {
      code: `import { f } from 'foo/bar/services/configuration.service';`,
      filename: filenameForFileWithPathMappings,
    },
    {
      code: `import { f } from 'concrete';`,
      filename: filenameForFileWithPathMappings,
    },
    {
      code: `let f = require("foo/bar/services/configuration.service").f;`,
      filename: filenameForFileWithPathMappings,
      options,
    },
  ],
  invalid: [
    {
      code: `import { f } from '$invalid/services/configuration.service';`,
      filename: filenameForFileWithPathMappings,
      errors: 1,
    },
    {
      code: `import { f } from '@invalid/services/configuration.service';`,
      filename: filenameForFileWithPathMappings,
      errors: 1,
    },
    {
      code: `import { f } from 'invalid/services/configuration.service';`,
      filename: filenameForFileWithPathMappings,
      errors: 1,
    },
    {
      code: `import { f } from 'nonexistent';`,
      filename: filenameForFileWithPathMappings,
      errors: 1,
    },
    {
      code: `import "foo";`,
      filename: filenameForFileWithPathMappings,
      options,
      errors: 1,
    },
    {
      code: `import "foo/baz/something";`,
      filename: filenameForFileWithPathMappings,
      options,
      errors: 1,
    },
    {
      code: `let f = require("this/doesnt/exist").f;`,
      filename: filenameForFileWithPathMappings,
      options,
      errors: 1,
    },
  ],
});

const ruleTesterForWildcardExample = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    tsconfigRootDir: './tests/fixtures/ts-project-with-wildcard-path-alias',
    project: './tsconfig.json',
    createDefaultProgram: true,
  },
});

const filenameWildcardExample = path.join(
  __dirname,
  '../fixtures/ts-project-with-wildcard-path-alias/file.ts',
);

ruleTesterForWildcardExample.run(
  'Avoid FPs for projects with an unconstrained wildcard mapping',
  rule,
  {
    valid: [
      {
        code: `import { f } from '$core/services/configuration.service';`,
        filename: filenameWildcardExample,
      },
      {
        code: `import { f } from 'concretegenerated';`,
        filename: filenameWildcardExample,
      },
      {
        code: `let f = require("this/might/be/generated").f;`,
        filename,
        options,
      },
    ],
    invalid: [],
  },
);
