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
import { rule } from './no-missing-sonar-runtime.ts';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run('sonar-runtime configuration for secondary locations', rule, {
  valid: [
    {
      code: ``,
    },
    {
      code: `
        import { toEncodedMessage } from '../helpers';`,
    },
    {
      code: `
        toEncodedMessage();`,
    },
    {
      code: `
        unknown.toEncodedMessage();`,
    },
    {
      code: `const config = {};`,
    },
    {
      code: `const config =
        {
          alpha: whatever
        };`,
    },
    {
      code: `const config =
        {
          meta: {
            whatever: something
          }
        };`,
    },
    {
      code: `const config =
        {
          meta: {
            schema: whatever
          }
        };`,
    },
    {
      code: `const config =
        {
          meta: {
            schema: [{}]
          }
        };`,
    },
    {
      code: `const config =
        {
          meta: {
            schema: [
              {
                enum: whatever
              }
            ]
          }
        };`,
    },
    {
      code: `const config =
        {
          meta: {
            schema: [
              {
                enum: []
              }
            ]
          }
        };`,
    },
    {
      code: `const config =
        {
          meta: {
            schema: [
              {
                enum: [whatever]
              }
            ]
          }
        };`,
    },
    {
      code: `const config =
        {
          meta: {
            schema: [
              {
                enum: ['whatever']
              }
            ]
          }
        };`,
    },
    {
      code: `const config =
        {
          meta: {
            schema: [
              {
                enum: ['sonar-runtime']
              }
            ]
          }
        };`,
    },
  ],
  invalid: [
    {
      code: `
        import { toEncodedMessage } from '../helpers';
        /* ... */
        toEncodedMessage(whatever);`,
      errors: [
        {
          message: `Missing enabling of secondary location support`,
          line: 2,
          endLine: 4,
          column: 9,
          endColumn: 36,
        },
      ],
    },
    {
      code: `
        import { toEncodedMessage } from '../helpers';
        /* ... */
        toEncodedMessage(whatever);
        toEncodedMessage(whatever);`,
      errors: 1,
    },
  ],
});
