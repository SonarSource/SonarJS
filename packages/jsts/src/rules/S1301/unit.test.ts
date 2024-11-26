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
import { rule } from './rule.js';
import { JavaScriptRuleTester } from '../../../tests/tools/index.js';

const ruleTester = new JavaScriptRuleTester();

ruleTester.run('"if" statements should be preferred over "switch" when simpler', rule, {
  valid: [
    { code: 'switch (a) { case 1: case 2: break; default: doSomething(); break; }' },
    { code: 'switch (a) { case 1: break; default: doSomething(); break; case 2: }' },
    { code: 'switch (a) { case 1: break; case 2: }' },
  ],
  invalid: [
    {
      code: 'switch (a) { case 1: doSomething(); break; default: doSomething(); }',
      errors: [
        {
          messageId: 'replaceSwitch',
          column: 1,
          endColumn: 7,
        },
      ],
    },
    {
      code: 'switch (a) { case 1: break; }',
      errors: [
        {
          messageId: 'replaceSwitch',
          column: 1,
          endColumn: 7,
        },
      ],
    },
    {
      code: 'switch (a) {}',
      errors: [
        {
          messageId: 'replaceSwitch',
          column: 1,
          endColumn: 7,
        },
      ],
    },
  ],
});
