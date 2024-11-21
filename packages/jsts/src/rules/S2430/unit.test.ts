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

ruleTester.run(`A constructor name should not start with a lowercase letter`, rule, {
  valid: [
    {
      code: `let x = new Thing();`,
    },
    {
      code: `
        let ctor = condition ? Foo : Bar;
        let item = new ctor();
      `,
    },
  ],
  invalid: [
    {
      code: `
        function thing(){}
        let x = new thing();
    `,
      errors: 1,
    },
    {
      code: `
      let obj = condition ? {ctor: Foo} : {ctor: Bar};
      let item = new obj.ctor();
    `,
      errors: 1,
    },
  ],
});
