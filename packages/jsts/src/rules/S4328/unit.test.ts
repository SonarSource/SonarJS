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
import path from 'node:path';
import { NoTypeCheckingRuleTester, RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import parser from '@typescript-eslint/parser';
import { describe, it } from 'node:test';

describe('S4328', () => {
  it('S4328', () => {
    const fixtures = path.join(import.meta.dirname, 'fixtures');
    const filename = path.join(fixtures, 'package-json-project/file.js');

    const options = [
      {
        whitelist: [],
      },
    ];
    const ruleTester = new NoTypeCheckingRuleTester();

    const filenameNestedPackage = path.join(fixtures, 'nested-package-json-project/dir/file.js');

    ruleTester.run('Dependencies should be explicit', rule, {
      valid: [
        {
          code: `import fs from "fs";`,
          filename,
          options,
        },
        {
          code: `import ts from "devDependency";`,
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
          code: `import "optionalDependency";`,
          filename,
          options,
        },
        {
          code: `import "moduleAlias/bla";`,
          filename,
          options,
        },
        {
          code: `import "project1";`,
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
          options: [{ whitelist: ['whitelist'] }],
        },
        {
          code: `import "@whitelist/dependency";`,
          filename,
          options: [{ whitelist: ['@whitelist/dependency'] }],
        },
        {
          code: `import "./relative";`,
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
          filename: path.join(fixtures, 'bom-package-json-project/file.js'),
          options,
        },
        {
          code: `const fs = require("node:fs/promises");`,
          filename,
          options,
        },
        {
          code: `import fs from 'node:fs/promises';`,
          filename,
          options,
        },
        {
          code: `import 'data:text/javascript,console.log("hello, world!");';`,
          filename,
          options,
        },
        {
          code: `import 'file:/some/file.js'`,
          filename,
          options,
        },
        {
          code: `
        import { f as f1 } from 'top-dependency';
        import { f as f2 } from 'nested-dependency';
        import { f as f2 } from 'local-dependency';
      `,
          filename: filenameNestedPackage,
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
          filename: path.join(fixtures, 'empty-package-json-project/file.js'),
          options,
          errors: 1,
        },
        {
          code: `import "foo";`,
          filename: path.join(fixtures, 'package-json-project/dir/subdir/file.js'),
          options,
          errors: 1,
        },
        {
          code: `import "foo";`,
          filename: '/file.js',
          options,
          errors: 1,
        },
        {
          code: `
        import { f as f1 } from 'nonexistent';
      `,
          filename: filenameNestedPackage,
          options,
          errors: 1,
        },
      ],
    });

    const ruleTesterForPathMappings = new RuleTester({
      parser,
      ecmaVersion: 2018,
      sourceType: 'module',
      parserOptions: {
        tsconfigRootDir: path.join(fixtures, 'ts-project-with-path-aliases'),
        project: './tsconfig.json',
      },
    });

    const filenameForFileWithPathMappings = path.join(
      fixtures,
      'ts-project-with-path-aliases/file.ts',
    );

    ruleTesterForPathMappings.run('Path aliases should be exempt', rule, {
      valid: [
        {
          code: `
        import { f as f1 } from '$b/c/d.e';
        import { f as f2 } from '@b/c/d.e';
        import { f as f3 } from 'b/c/d.e';
        import { f as f4 } from 'foo/bar/c/d.e';
        import { f as f5 } from 'concrete';
        let f6 = require("foo/bar/c/d.e").f;
        import { f as f7 } from 'p/refixc/d.esuffi/x';
        import { f as f8 } from 'yoda/c/d.e/path';
        import { f as f9 } from 'dependency-in-package-json';
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

    const ruleTesterForBaseUrl = new RuleTester({
      parser,
      ecmaVersion: 2018,
      sourceType: 'module',
      parserOptions: {
        tsconfigRootDir: path.join(fixtures, 'ts-project-with-base-url'),
        project: './tsconfig.json',
      },
    });

    const filenameForBaseUrl = path.join(fixtures, 'ts-project-with-base-url/nested/file.ts');

    ruleTesterForBaseUrl.run('Imports based on baseUrl should be accepted', rule, {
      valid: [
        {
          code: `
        import { f as f1 } from 'dependency-in-package-json';
        import { f as f2 } from 'dir';
        import { f as f3 } from 'a';
        import { f as f3 } from 'c';
        import { f as f4 } from 'dir/b';
      `,
          filename: filenameForBaseUrl,
          options,
        },
      ],
      invalid: [
        {
          code: `
        import { f as f1 } from 'nonexistent';
        import { f as f1 } from 'dir/nonexistent';
      `,
          filename: filenameForBaseUrl,
          options,
          errors: 2,
        },
      ],
    });
  });
});
