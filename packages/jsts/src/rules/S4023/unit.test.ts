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
import { rule } from './index.js';
import { TypeScriptRuleTester } from '../../../tests/tools/index.js';

const ruleTester = new TypeScriptRuleTester();
ruleTester.run(`Decorated rule should provide suggestion`, rule, {
  valid: [
    {
      code: 'interface A { x: string }',
    },
    {
      code: 'interface A { x: string, y: string }; interface B extends Pick<A, "x"> {}',
    },
  ],
  invalid: [
    {
      code: 'interface A {}',
      errors: 1,
    },
    {
      code: 'interface A extends "foo" {}',
      errors: 1,
      output: 'type A = "foo"',
    },
    {
      code: 'interface A extends Z {}',
      errors: 1,
      output: 'type A = Z',
    },
  ],
});
