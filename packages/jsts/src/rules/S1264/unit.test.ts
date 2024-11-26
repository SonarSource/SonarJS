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

const message = 'replaceForWithWhileLoop';

ruleTester.run('prefer-while', rule, {
  valid: [
    { code: 'for(var i = 0; condition;) { }' },
    { code: 'for(var i = 0; condition; i++) { }' },
    { code: 'for(var i = 0;; i++) { }' },
    { code: 'for (i; condition; ) { }' },
    { code: 'for ( ; i < length; i++ ) { }' },
    { code: 'while (i < length) { }' },
    { code: 'for (a in b) { }' },
    { code: 'for (a of b) { }' },
    { code: 'for(;;) {}' },
  ],
  invalid: [
    {
      code: 'for(;condition;) {}',
      errors: [{ messageId: message, line: 1, column: 1, endColumn: 4 }],
      output: 'while (condition) {}',
    },
    {
      code: 'for (;condition; ) foo();',
      errors: [{ messageId: message }],
      output: 'while (condition) foo();',
    },
    {
      code: `
        for(;i < 10;)
          doSomething();`,
      errors: [{ messageId: message }],
      output: `
        while (i < 10)
          doSomething();`,
    },
  ],
});
