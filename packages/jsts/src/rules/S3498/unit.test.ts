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
import { fileURLToPath } from 'node:url';

const ruleTester = new NodeRuleTester({
  parser: fileURLToPath(import.meta.resolve('@typescript-eslint/parser')),
  parserOptions: { ecmaVersion: 2018, ecmaFeatures: { jsx: true } },
});

ruleTester.run(`Object literal shorthand syntax should be used`, rule, {
  valid: [
    {
      code: `const obj = { foo };`,
    },
    {
      code: `
      ({
        foo: function(component, event, helper) {}
      });
      `,
    },
  ],
  invalid: [
    {
      code: `const obj = { foo: foo };`,
      output: `const obj = { foo };`,
      errors: [
        {
          line: 1,
          column: 15,
          endLine: 1,
          endColumn: 18,
        },
      ],
    },
    {
      code: `({ foo: foo });`,
      output: `({ foo });`,
      errors: 1,
    },
  ],
});
