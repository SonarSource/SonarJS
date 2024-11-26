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
import { JavaScriptRuleTester } from '../../../tests/tools/index.js';
import { rule } from './index.js';

const ruleTester = new JavaScriptRuleTester();
ruleTester.run(`Decorated rule should provide suggestion`, rule, {
  valid: [
    {
      code: `let x = { a: 42, b: 42 }`,
    },
  ],
  invalid: [
    {
      code: `let x = { a: 42, a: 42 }`,
      errors: [
        { suggestions: [{ output: `let x = { a: 42 }`, desc: 'Remove this duplicate property' }] },
      ],
    },
    {
      code: `let x = { a: 42, a: 42, b: 42 }`,
      errors: [{ suggestions: [{ output: `let x = { a: 42, b: 42 }` }] }],
    },
    {
      code: `let x = { a: 42, b: 42, a: 42, }`,
      errors: [{ suggestions: [{ output: `let x = { a: 42, b: 42, }` }] }],
    },
    {
      code: `
let x = { 
  a: 42,
  a: 42
}`,
      errors: [
        {
          suggestions: [
            {
              output: `
let x = { 
  a: 42
}`,
            },
          ],
        },
      ],
    },
    {
      code: `
let x = { 
  a: 42,
  get a() {
    return 42;
  },
}`,
      errors: [
        {
          suggestions: [
            {
              output: `
let x = { 
  a: 42,
}`,
            },
          ],
        },
      ],
    },
  ],
});
