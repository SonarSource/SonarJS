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
import { TypeScriptRuleTester } from '../../../tests/tools/index.js';
import { rule } from './index.js';

const ruleTester = new TypeScriptRuleTester();

ruleTester.run(`Variables and functions should not be redeclared`, rule, {
  valid: [
    {
      code: `
      export const FOO = 'FOO';
      export type FOO = typeof FOO;`,
    },
    {
      code: `
      import FOO from "foo";
      export type FOO = 'F' | 'O' | 'O';
      `,
    },
  ],
  invalid: [
    {
      code: `var a = 42; var a = 0;`,
      errors: 1,
    },
    {
      code: `
      export var FOO = 'FOO';
      export var FOO = typeof FOO;`,
      errors: 1,
    },
  ],
});
