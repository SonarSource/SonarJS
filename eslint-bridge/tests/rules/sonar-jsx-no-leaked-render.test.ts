/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import { RuleTesterTs } from '../RuleTesterTs';

const ruleTesterTs = new RuleTesterTs();

import { rule } from 'rules/sonar-jsx-no-leaked-render';

ruleTesterTs.run('', rule, {
  valid: [
    {
      code: `
        const Component = (count, collection) => {
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
          message:
            'Potential leaked value that might cause unintentionally rendered values or rendering crashes',
          line: 5,
          column: 16,
          endLine: 5,
          endColumn: 55,
          suggestions: [
            {
              output: `
        const Component = (count: number, collection) => {
          return (
            <div>
              {!!count && <List elements={collection} />}
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
          message:
            'Potential leaked value that might cause unintentionally rendered values or rendering crashes',
          line: 5,
          column: 16,
          endLine: 5,
          endColumn: 67,
          suggestions: [
            {
              output: `
        const Component = (collection: Array<number>) => {
          return (
            <div>
              {!!collection.length && <List elements={collection} />}
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
        const Component = (test: boolean, count: number, collection) => {
          return (
            <div>
              {(test || (count)) && <List elements={collection} />}
            </div>
          )
        }
      `,
      errors: [
        {
          message:
            'Potential leaked value that might cause unintentionally rendered values or rendering crashes',
          line: 5,
          column: 16,
          endLine: 5,
          endColumn: 67,
          suggestions: [
            {
              output: `
        const Component = (test: boolean, count: number, collection) => {
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
  ],
});
