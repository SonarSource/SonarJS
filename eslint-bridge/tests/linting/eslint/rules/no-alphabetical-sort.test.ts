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
import { TypeScriptRuleTester } from '../../../tools';
import { rule } from 'linting/eslint/rules/no-alphabetical-sort';

const ruleTester = new TypeScriptRuleTester();
ruleTester.run(`A compare function should be provided when using "Array.prototype.sort()"`, rule, {
  valid: [
    {
      code: `
      var arrayOfNumbers = [80, 3, 9, 34, 23, 5, 1];
      arrayOfNumbers.sort((n, m) => n - m);
      `,
    },
    {
      code: `
      var arrayOfStrings = ["foo", "bar"];
      arrayOfStrings.sort();
      `,
    },
    {
      code: `
      var arrayOfObjects = [{a: 2}, {a: 4}];
      arrayOfObjects.sort();
      `,
    },
    {
      code: `unknownArrayType.sort();`,
    },
    {
      code: `
      interface MyCustomNumber extends Number {}
      const arrayOfCustomNumbers: MyCustomNumber[];
      arrayOfCustomNumbers.sort();
      `,
    },
    {
      code: `
      var arrayOfNumbers = [80, 3, 9, 34, 23, 5, 1];
      arrayOfNumbers.custom_sort();
      `,
    },
  ],
  invalid: [
    {
      code: `
      var arrayOfNumbers = [80, 3, 9, 34, 23, 5, 1];
      arrayOfNumbers.sort();
      `,
      errors: [
        {
          message: `Provide a compare function to avoid sorting elements alphabetically.`,
          line: 3,
          column: 22,
          endLine: 3,
          endColumn: 26,
        },
      ],
    },
    {
      code: `
      var emptyArrayOfNumbers: number[] = [];
      emptyArrayOfNumbers.sort();
      `,
      errors: 1,
    },
    {
      code: `
      function getArrayOfNumbers(): number[] {}
      getArrayOfNumbers().sort();
      `,
      errors: 1,
    },
    {
      code: `[80, 3, 9, 34, 23, 5, 1].sort();`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Add a comparator function to sort in ascending order',
              output: '[80, 3, 9, 34, 23, 5, 1].sort((a, b) => (a - b));',
            },
          ],
        },
      ],
    },
  ],
});
