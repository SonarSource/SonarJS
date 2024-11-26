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

const ruleTester = new NodeRuleTester({ parserOptions: { ecmaVersion: 2018 } });

ruleTester.run('Writing cookies is security-sensitive', rule, {
  valid: [
    {
      code: `document.foo`,
    },
    {
      code: `foo.cookie`,
    },
    {
      code: `response.setHeader()`,
    },
    {
      code: `response.setHeader('Content-Type', 'text/plain')`,
    },
    {
      code: `response.foo('Set-Cookie', x)`,
    },
    {
      code: `response.setHeader(SetCookie, x)`,
    },
    {
      code: `res.cookie("foo", "bar");`,
    },
    {
      code: `foo(req.cookies);`,
    },
    {
      code: `let x = document.cookie;`,
    },
    {
      code: `document.notCookie = 42`,
    },
    {
      code: `notDocument.cookie = 42`,
    },
    {
      code: `'express'; foo(req.cookies);`,
    },
  ],
  invalid: [
    {
      code: `document.cookie = 42;`,
      errors: [
        {
          message: 'Make sure that cookie is written safely here.',
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 16,
        },
      ],
    },
    {
      code: `response.setHeader('Set-Cookie', x);`,
      errors: 1,
    },
    {
      code: `'express'; res.cookie("foo", "bar");`,
      errors: 1,
    },
  ],
});
