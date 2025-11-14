/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S1527', () => {
  it('S1527', () => {
    const ruleTester = new DefaultParserRuleTester({
      sourceType: 'script',
      parserOptions: { ecmaVersion: 3, allowReserved: true },
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
              messageId: 'renameReserved',
              line: 8,
            },
            {
              messageId: 'renameReserved',
              line: 9,
            },
            {
              messageId: 'renameReserved',
              line: 10,
            },
            {
              messageId: 'renameReserved',
              line: 11,
            },
            {
              messageId: 'renameReserved',
              line: 12,
            },
          ],
        },
      ],
    });
  });
});
