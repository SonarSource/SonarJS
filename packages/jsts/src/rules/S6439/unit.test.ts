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
import { TypeScriptRuleTester } from '../tools';

const ruleTesterTs = new TypeScriptRuleTester();
const ruleTesterJs = new RuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module', ecmaFeatures: { jsx: true } },
});

ruleTesterTs.run('', rule, {
  valid: [
    {
      code: `
        const Component = (count, collection) => {
          count = 1;
          return (
            <div>
              {count && <List elements={collection} />}
            </div>
          )
        }
      `,
    },
    {
      code: `
        const Component = (count: boolean, collection) => {
          return (
            <div>
              {count && <List elements={collection} />}
            </div>
          )
        }
      `,
    },
    {
      code: `
        const Component = (collection) => {
          let test = '';
          return (
            <div>
              {test && <List elements={collection} />}
            </div>
          )
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        const Component = (count: number, collection) => {
          return (
            <div>
              {count && <List elements={collection} />}
            </div>
          )
        }
      `,
      errors: [
        {
          message: 'Convert the conditional to a boolean to avoid leaked value',
          line: 5,
          column: 16,
          endLine: 5,
          endColumn: 21,
          suggestions: [
            {
              output: `
        const Component = (count: number, collection) => {
          return (
            <div>
              {!!(count) && <List elements={collection} />}
            </div>
          )
        }
      `,
            },
          ],
        },
      ],
    },
    {
      code: `
        const Component = (collection) => {
          const count = 0;
          return (
            <div>
              {count && <List elements={collection} />}
            </div>
          )
        }
      `,
      errors: [
        {
          line: 6,
          column: 16,
          endLine: 6,
          endColumn: 21,
          suggestions: [
            {
              output: `
        const Component = (collection) => {
          const count = 0;
          return (
            <div>
              {!!(count) && <List elements={collection} />}
            </div>
          )
        }
      `,
            },
          ],
        },
      ],
    },
    {
      code: `
        const Component = (collection: Array<number>) => {
          return (
            <div>
              {collection.length && <List elements={collection} />}
            </div>
          )
        }
      `,
      errors: [
        {
          line: 5,
          column: 16,
          endLine: 5,
          endColumn: 33,
          suggestions: [
            {
              output: `
        const Component = (collection: Array<number>) => {
          return (
            <div>
              {!!(collection.length) && <List elements={collection} />}
            </div>
          )
        }
      `,
            },
          ],
        },
      ],
    },
    {
      code: `
        const Component = (test: number, count: number, collection) => {
          return (
            <div>
              {(test || (count)) && <List elements={collection} />}
            </div>
          )
        }
      `,
      errors: [
        {
          line: 5,
          column: 17,
          endLine: 5,
          endColumn: 21,
          suggestions: [
            {
              output: `
        const Component = (test: number, count: number, collection) => {
          return (
            <div>
              {(!!(test) || (count)) && <List elements={collection} />}
            </div>
          )
        }
      `,
            },
          ],
        },
        {
          line: 5,
          column: 26,
          endLine: 5,
          endColumn: 31,
          suggestions: [
            {
              output: `
        const Component = (test: number, count: number, collection) => {
          return (
            <div>
              {(test || !!(count)) && <List elements={collection} />}
            </div>
          )
        }
      `,
            },
          ],
        },
      ],
    },
    {
      code: `
        import react from 'react-native';
        const Component = (collection) => {
          let test = '';
          return (
            <div>
              {test && <List elements={collection} />}
            </div>
          )
        }
      `,
      errors: 1,
    },
    {
      code: `
        const react = require('react-native');
        const Component = (collection) => {
          let test = '';
          return (
            <div>
              {test && <List elements={collection} />}
            </div>
          )
        }
      `,
      errors: 1,
    },
  ],
});

ruleTesterJs.run('', rule, {
  valid: [
    {
      code: `
        const Component = (collection) => {
          const count = 0;
          return (
            <div>
              {count && <List elements={collection} />  /*OK, no type information available*/ }
            </div>
          )
        }
        `,
    },
  ],
  invalid: [],
});
