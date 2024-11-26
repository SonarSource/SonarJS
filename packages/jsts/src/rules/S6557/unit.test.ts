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
import { JavaScriptRuleTester } from '../../../tests/tools/index.js';

const ruleTester = new JavaScriptRuleTester();

ruleTester.run(`Decorated rule should provide suggestion with proper message`, rule, {
  valid: [
    {
      code: `'abc'.starsWith('a');`,
    },
  ],
  invalid: [
    {
      code: `'abc'[0] === 'a';`,
      errors: [
        {
          messageId: 'preferStartsWith',
          suggestions: [
            {
              desc: "Use 'String#startsWith' method instead.",
              output: `'abc'.startsWith('a');`,
            },
          ],
        },
      ],
    },
    {
      code: `'abc'['abc'.length - 1] === 'c';`,
      errors: [
        {
          messageId: 'preferEndsWith',
          suggestions: [
            {
              desc: "Use the 'String#endsWith' method instead.",
              output: `'abc'.endsWith('c');`,
            },
          ],
        },
      ],
    },
  ],
});
