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
import { rule } from './/index.ts';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run('Duplicated characters in character classes', rule, {
  valid: [
    {
      code: `/a-z\\d/`,
    },
    {
      code: `/[0-9][0-9]?/`,
    },
    {
      code: `/[xX]/`,
    },
    {
      code: `/[\\s\\S]/`,
    },
    {
      code: `/[\\s\\S]/u`,
    },
    {
      code: `/[\\S\\u0085\\u2028\\u2029]/u`,
    },
    {
      code: `/[\\d\\D]/`,
    },
    {
      code: `/[\\d\\D]/u`,
    },
    {
      code: `/[\\w\\W]/`,
    },
    {
      code: `/[\\w\\W]/u`,
    },
    {
      code: `/[\\wä]/`,
    },
    {
      code: `/[äÄ]/i`,
    },
    {
      code: `/[Ä-Üä]/i`,
    },
    {
      code: `/[äÄ]/u`,
    },
    {
      code: `/[xX]/u`,
    },
    {
      code: `/[ab-z]/`,
    },
    {
      code: `/[a-Öö]/i`,
    },
    {
      code: `/[\\x00\\x01]]/`,
    },
    {
      code: `/[\\x00-\\x01\\x02-\\x03]]/`,
    },
    {
      code: `/[\\wä]"/u`, // False negative because we don't support Unicode characters in \\w and \\W
    },
    {
      code: `/[A-_d-{]/i`, // FN because we ignore case insensitivity unless both ends of the ranges are letters
    },
    {
      code: `/[A-z_]/i`, // FN because A-z gets misinterpreted as A-Za-z due to the way we handle case insensitivity
    },
    {
      code: `/[\\p{IsLatin}x]/`, // FN because we don't support \p at the moment
    },
  ],
  invalid: [
    {
      code: `/[0-99]/`,
      errors: [
        {
          message: JSON.stringify({
            message: 'Remove duplicates in this character class.',
            secondaryLocations: [
              { message: 'Additional duplicate', column: 5, line: 1, endColumn: 6, endLine: 1 },
            ],
          }),
          line: 1,
          endLine: 1,
          column: 3,
          endColumn: 6,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `/[90-9]/`,
      errors: 1,
    },
    {
      code: `/[0-73-9]/`,
      errors: 1,
    },
    {
      code: `/[0-93-57]/`,
      errors: 1,
    },
    {
      code: `/[4-92-68]/`,
      errors: 1,
    },
    {
      code: `/[0-33-9]/`,
      errors: 1,
    },
    {
      code: `/[0-70-9]/`,
      errors: 1,
    },
    {
      code: `/[3-90-7]/`,
      errors: 1,
    },
    {
      code: `/[3-50-9]/`,
      errors: 1,
    },
    {
      code: `/[xxx]/`,
      errors: 1,
    },
    {
      code: `/[A-z_]/`,
      errors: 1,
    },
    {
      code: `/[A-Za-z]/i`,
      errors: 1,
    },
    {
      code: `/[A-_d]/i`,
      errors: 1,
    },
    {
      code: `/[Ä-Üä]/iu`,
      errors: 1,
    },
    {
      code: `/[a-Öö]/iu`,
      errors: 1,
    },
    {
      code: `/[  ]/`,
      errors: 1,
    },
    {
      code: `/[  ]/i`,
      errors: 1,
    },
    {
      code: `/[  ]iu/`,
      errors: 1,
    },
    {
      code: `/[A-_D]/i`,
      errors: 1,
    },
    {
      code: `/[A-_D]iu/`,
      errors: 1,
    },
    {
      code: `/[xX]/i`,
      errors: 1,
    },
    {
      code: `/[xX]/iu`,
      errors: 1,
    },
    {
      code: `/[äÄ]/iu`,
      errors: 1,
    },
    {
      code: `/[\\\"\\\".]"/`,
      errors: 1,
    },
    {
      code: `/[\\Qxx\\E]/`,
      errors: 1,
    },
    {
      code: `/[\\s\\Sx]/`,
      errors: 1,
    },
    {
      code: `/[\\s\\Sx]/u`,
      errors: 1,
    },
    {
      code: `/[\\w\\d]"/`,
      errors: 1,
    },
    {
      code: `/[\\wa]/`,
      errors: 1,
    },
    {
      code: `/[\\d1]/`,
      errors: 1,
    },
    {
      code: `/[\\d1-3]/`,
      errors: 1,
    },
    {
      code: `/[\\wa]/u`,
      errors: 1,
    },
  ],
});
