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
import { rule } from '../../src/rules/class-prototype';
import { RuleTester } from 'eslint';
import { TypeScriptRuleTester } from '../tools';

const ruleTesterJs = new RuleTester({
  parserOptions: { ecmaVersion: 2018 },
});
ruleTesterJs.run('Class methods should be used instead of "prototype" assignments [js]', rule, {
  valid: [
    {
      code: `Foo.prototype.property = 1;`,
    },
    {
      code: `
          function Bar() {}
          Foo.prototype.property = Bar; // FN - we need type information`,
    },
    {
      code: `Foo.prototype = function () {};`,
    },
    {
      code: `Foo.proto.property = function () {};`,
    },
  ],
  invalid: [
    {
      code: `Foo.prototype.property = function () {};`,
      errors: [
        {
          message: `Declare a \"Foo\" class and move this declaration of \"property\" into it.`,
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 23,
        },
      ],
    },
    {
      code: `
          const Bar = () => {};
          Foo.prototype.property = () => {};`,
      errors: 1,
    },
  ],
});

const ruleTesterTs = new TypeScriptRuleTester();
ruleTesterTs.run('Class methods should be used instead of "prototype" assignments [ts]', rule, {
  valid: [
    {
      code: `Foo.prototype.property = 1;`,
    },
    {
      code: `Foo.prototype.property = Bar;`,
    },
  ],
  invalid: [
    {
      code: `Foo.prototype.property = function () {};`,
      errors: [
        {
          message: `Declare a \"Foo\" class and move this declaration of \"property\" into it.`,
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 23,
        },
      ],
    },
    {
      code: `
          function Bar() {}
          Foo.prototype.property = Bar;`,
      errors: 1,
    },
    {
      code: `
          const Bar = () => {};
          Foo.prototype.property = Bar;`,
      errors: 1,
    },
  ],
});
