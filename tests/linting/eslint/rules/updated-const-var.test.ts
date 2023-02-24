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
import { rule } from 'linting/eslint/rules/updated-const-var';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run('Attempts should not be made to update "const" variables', rule, {
  valid: [],
  invalid: [
    {
      code: `
        const c = 1;
        c = 2;`,
      errors: [
        {
          message:
            '{"message":"Correct this attempt to modify \\"c\\" or use \\"let\\" in its declaration.","secondaryLocations":[{"message":"Const declaration","column":8,"line":2,"endColumn":20,"endLine":2}]}',
          line: 3,
          column: 9,
          endLine: 3,
          endColumn: 10,
        },
      ],
    },
    {
      code: `
        const c = 1;
        var x = c++;`,
      errors: 1,
    },
  ],
});
