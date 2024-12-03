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
import { fileURLToPath } from 'node:url';

const ruleTester = new NodeRuleTester({
  parser: fileURLToPath(import.meta.resolve('@typescript-eslint/parser')),
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
});

const options = [{ passwordWords: ['password', 'pwd', 'passwd'] }];

ruleTester.run('Hard-coded passwords should be avoided', rule, {
  valid: [
    {
      code: `let password = ""`,
      options,
    },
    {
      code: `let password = 'foo';`,
      filename: path.join('some', 'L10n', 'path', 'file.js'),
      options,
    },
  ],
  invalid: [
    {
      code: `let password = "foo";`,
      options,
      errors: [
        {
          message: 'Review this potentially hard-coded password.',
          line: 1,
          endLine: 1,
          column: 16,
          endColumn: 21,
        },
      ],
    },
    {
      code: `let password = 'foo';`,
      options,
      errors: 1,
    },
    {
      code: `
      let my_pwd;
      my_pwd = "foo";
      `,
      options,
      errors: 1,
    },
    {
      code: `let passwords = { user: "foo", passwd: "bar" };`,
      options,
      errors: 1,
    },
    {
      code: `let url = "https://example.com?password=hl2OAIXXZ60";`,
      options,
      errors: 1,
    },
    {
      code: `let secret = "foo"`,
      options: [{ passwordWords: ['secret'] }],
      errors: 1,
    },
    {
      code: `let url = "https://example.com?token=hl2OAIXXZ60";`,
      options: [{ passwordWords: ['token'] }],
      errors: 1,
    },
    {
      code: `let password = 'foo';`,
      filename: path.join('some', 'random', 'path', 'file.js'),
      options,
      errors: 1,
    },
  ],
});
