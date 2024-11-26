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

const ruleTester = new NodeRuleTester({
  parserOptions: { ecmaVersion: 3, sourceType: 'script', allowReserved: true },
});

ruleTester.run('Future reserved words', rule, {
  valid: [
    {
      code: `
      var _interface = {
        implements: true
      };
      if (_interface.implements) {}
      `,
    },
  ],
  invalid: [
    {
      code: `
      var implements; // NOK

      implements = 42; // ok, usage
      var implements; // ok, second declaration

      var interface; // NOK
      var public = 42; // NOK
      function foo(static) {} // NOK
      var await; // NOK
      function yield() { // NOK
        var extends; // NOK
      }
      `,
      errors: [
        {
          message: `Rename "implements" identifier to prevent potential conflicts with future evolutions of the JavaScript language.`,
          line: 2,
          endLine: 2,
          column: 11,
          endColumn: 21,
        },
        {
          message: `Rename "interface" identifier to prevent potential conflicts with future evolutions of the JavaScript language.`,
          line: 7,
        },
        {
          line: 8,
        },
        {
          line: 9,
        },
        {
          line: 10,
        },
        {
          line: 11,
        },
        {
          line: 12,
        },
      ],
    },
  ],
});
