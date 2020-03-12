/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
import { rule } from '../../src/rules/no-nested-template-literals';

ruleTester.run('Template literals should not be nested', rule, {
  valid: [
    {
      code: 'let nestedMessage = `${count} ${color}`;',
    },
    {
      code: 'let message = `I have ${color ? nestedMessage : count} apples`;',
    },
  ],
  invalid: [
    {
      code:
        'let message = `I have ${color ? `${x ? `indeed 0` : count} ${color}` : count} apples`;',
      errors: [
        {
          message: `Refactor this code to not use nested template literals.`,
          line: 1,
          endLine: 1,
          column: 33,
          endColumn: 69,
        },
        {
          message: `Refactor this code to not use nested template literals.`,
          line: 1,
          endLine: 1,
          column: 40,
          endColumn: 50,
        },
      ],
    },
    {
      code: 'let message = `I have ${color ? `${count} ${color}` : count} apples`;',
      errors: 1,
    },
    {
      code:
        'let message = `I have ${color ? `${x ? `indeed ${0}` : count} ${color}` : count} apples`;',
      errors: 2,
    },
    {
      code:
        'function tag(strings, ...keys) {console.log(strings[2]);}\n' +
        'let message1 = tag`I have ${color ? `${count} ${color}` : count} apples`;\n' +
        'let message2 = tag`I have ${color ? tag`${count} ${color}` : count} apples`;',
      errors: 2,
    },
    {
      code: 'let message = `I have ${color ? `${count} ${color}` : `this is ${count}`} apples`;',
      errors: 2,
    },
    {
      code: 'let message = `I have ${`${count} ${color}`} ${`this is ${count}`} apples`;',
      errors: 2,
    },
  ],
});
