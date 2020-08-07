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

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
import { rule } from 'rules/index-of-compare-to-positive-number';

ruleTester.run(`"indexOf" checks should not be for positive numbers`, rule, {
  valid: [
    {
      code: `a.indexOf("str", 1) > 0;`,
    },
    {
      code: `a.indexOf("str") > -1;`,
    },
  ],
  invalid: [
    {
      code: `a.indexOf("str") > 0;`,
      errors: [
        {
          message:
            "This check ignores index 0; consider using 'includes' method to make this check safe and explicit.",
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 21,
        },
      ],
    },
    {
      code: `a.indexOf(a) > 0;`,
      errors: 1,
    },
  ],
});
