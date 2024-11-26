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

const ruleTester = new NodeRuleTester();

ruleTester.run(`Decorated rule should provide suggestion`, rule, {
  valid: [
    {
      code: `{ throw new Error('foo'); }`,
    },
  ],
  invalid: [
    {
      code: `{ throw 'foo'; }`,
      errors: [
        { suggestions: [{ output: `{ throw new Error('foo'); }`, desc: 'Throw an error object' }] },
      ],
    },
    {
      code: `{ throw 'foo' + bar(); }`,
      errors: [{ suggestions: [{ output: `{ throw new Error('foo' + bar()); }` }] }],
    },
    {
      code: `{ throw foo() + 'bar'; }`,
      errors: [{ suggestions: [{ output: `{ throw new Error(foo() + 'bar'); }` }] }],
    },
    {
      code: `{ throw 1; }`,
      errors: [{ suggestions: [] }],
    },
    {
      code: `{ throw undefined; }`,
      errors: [{ suggestions: [] }],
    },
    {
      code: `{ throw 1 + 2; }`,
      errors: [{ suggestions: [] }],
    },
  ],
});
