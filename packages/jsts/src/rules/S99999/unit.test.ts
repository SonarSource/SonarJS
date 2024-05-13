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
import { rule } from './';
import { TypeScriptRuleTester } from '../../../tests/tools';

const ruleTester = new TypeScriptRuleTester();
ruleTester.run('Proto', rule, {
  valid: [
    //     {
    //       code: `function simpleAssignment() {
    //   const x = 5;
    // }`,
    //       settings: {
    //         name: 't1',
    //       },
    //     },
    //     {
    //       code: `function simpleAssignment() {
    //   const x = null;
    // }`,
    //       settings: {
    //         name: 't3',
    //       },
    //     },
    {
      code: `function simple_assignment(a: number, b: string) { 
  const x = "txt";
}`,
      settings: {
        name: 't4',
      },
    },
    {
      code: `function simpleAssignment() {
  const x = null;
}`,
      settings: {
        name: 't3',
      },
    },
  ],
  invalid: [
    {
      code: `function simpleAssignment() {
  const x = 'txt';
}`,
      errors: 1,
      settings: {
        name: 't2',
      },
    },
  ],
});
