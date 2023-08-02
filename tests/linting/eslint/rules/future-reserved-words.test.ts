/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { RuleTester } from 'eslint';
import { rule } from '@sonar/jsts/rules/future-reserved-words';

const ruleTester = new RuleTester({
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
