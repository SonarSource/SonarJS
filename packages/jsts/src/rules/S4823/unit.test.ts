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
import { rule } from './';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run('Using command line arguments is security-sensitive', rule, {
  valid: [
    {
      code: `foo.bar`,
    },
    {
      code: `process.argvFoo`,
    },
    {
      code: `processFoo.argv`,
    },
    {
      code: `'process.argv'`,
    },
  ],
  invalid: [
    {
      code: `let x = process.argv;`,
      errors: [
        {
          message: 'Make sure that command line arguments are used safely here.',
          line: 1,
          endLine: 1,
          column: 9,
          endColumn: 21,
        },
      ],
    },
    {
      code: `\`argument 0: \${process.argv[0]}\``,
      errors: 1,
    },
  ],
});
