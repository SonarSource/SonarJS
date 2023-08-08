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
import { eslintRules } from '../../../src/rules/core';
import { decorateNoEmpty } from '../../../src/rules/decorators/no-empty-decorator';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
const rule = decorateNoEmpty(eslintRules['no-empty']);

ruleTester.run(`Decorated rule should provide suggestion`, rule, {
  valid: [
    {
      code: `if (a) { /* documented */ }`,
    },
  ],
  invalid: [
    {
      code: `if (a) {}`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Insert placeholder comment',
              output: `if (a) { /* TODO document why this block is empty */ }`,
            },
          ],
        },
      ],
    },
    {
      code: `
if (a) {
}`,
      errors: [
        {
          suggestions: [
            {
              output: `
if (a) {
  // TODO document why this block is empty

}`,
            },
          ],
        },
      ],
    },
    {
      code: `switch (a) {}`,
      errors: [
        {
          suggestions: [{ output: `switch (a) { /* TODO document why this switch is empty */ }` }],
        },
      ],
    },
    {
      code: `
switch (a) {
}`,
      errors: [
        {
          suggestions: [
            {
              output: `
switch (a) {
  // TODO document why this switch is empty

}`,
            },
          ],
        },
      ],
    },
  ],
});
