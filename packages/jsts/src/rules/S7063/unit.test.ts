/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run('"Array.reduce()" calls should include an initial value', rule, {
  valid: [
    {
      code: 'export const x = 10;',
    },
    {
      code: `const lib = require('needed'); export const x = 10;`,
    },
    {
      code: `require('needed'); export const x = 10;`,
    },
  ],
  invalid: [
    {
      code: `
        for (let i = 0; i < 10; i++) {
          console.log(i);
        }
        export const x = 10;
      `,
      errors: 1,
    },
    {
      code: `
        methodCall();
        export const x = 10;
      `,
      errors: 1,
    },
    {
      code: `
        const v = methodCall();
        export const x = 10;
      `,
      errors: 1,
    },
    {
      code: `const rootReducer = combineReducers({
  postsByReddit,
  selectedReddit
})

export default rootReducer`,
      errors: 1,
    },
  ],
});
