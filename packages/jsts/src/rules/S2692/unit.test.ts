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
ruleTester.run(`"indexOf" checks should not be for positive numbers`, rule, {
  valid: [
    {
      code: `a.indexOf("str", 1) > 0;`,
    },
    {
      code: `a.indexOf("str") > -1;`,
    },
    {
      code: `"str".indexOf("str") > 0;`,
    },
    {
      code: `[].indexOf(a) >= 0;`,
    },
    {
      code: `(new Array()).indexOf(a) >= 0;`,
    },
  ],
  invalid: [
    {
      code: `[].indexOf("str") > 0;`,
      errors: [
        {
          message:
            "This check ignores index 0; consider using 'includes' method to make this check safe and explicit.",
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 22,
        },
      ],
    },
    {
      code: `[].indexOf(a) > 0;`,
      errors: 1,
    },
    {
      code: `(new Array()).indexOf(a) > 0;`,
      errors: 1,
    },
  ],
});
