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

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });

ruleTester.run(
  `Regular expression quantifiers and character classes should be used concisely`,
  rule,
  {
    valid: [
      {
        code: `/[x]/`,
      },
      {
        code: `/[12]/`,
      },
      {
        code: `/[1234]/`,
      },
      {
        code: `/[1-9abc]/`,
      },
      {
        code: `/[1-9a-bAB]/`,
      },
      {
        code: `/[1-9a-bA-Z!]/`,
      },
      {
        code: `/x?/`,
      },
      {
        code: `/x*/`,
      },
      {
        code: `/x+/`,
      },
      {
        code: `/x{2}/`,
      },
      {
        code: `/[\\s\\S]/`,
      },
    ],
    invalid: [
      {
        code: `/[\\s\\S]/s`,
        errors: [
          {
            message: `Use concise character class syntax '.' instead of '[\\s\\S]'.`,
            line: 1,
            column: 2,
            endLine: 1,
            endColumn: 8,
          },
        ],
      },
      {
        code: `/[\\d\\D]/`,
        errors: [
          {
            message: `Use concise character class syntax '.' instead of '[\\d\\D]'.`,
            line: 1,
            column: 2,
            endLine: 1,
            endColumn: 8,
          },
        ],
      },
      {
        code: `/[\\w\\W]/`,
        errors: [
          {
            message: `Use concise character class syntax '.' instead of '[\\w\\W]'.`,
            line: 1,
            column: 2,
            endLine: 1,
            endColumn: 8,
          },
        ],
      },
      {
        code: `/[0-9]/`,
        errors: [
          {
            message: `Use concise character class syntax '\\d' instead of '[0-9]'.`,
            line: 1,
            column: 2,
            endLine: 1,
            endColumn: 7,
          },
        ],
      },
      {
        code: `/[^0-9]/`,
        errors: [
          {
            message: `Use concise character class syntax '\\D' instead of '[^0-9]'.`,
            line: 1,
            column: 2,
            endLine: 1,
            endColumn: 8,
          },
        ],
      },
      {
        code: `/[A-Za-z0-9_]/`,
        errors: [
          {
            message: `Use concise character class syntax '\\w' instead of '[A-Za-z0-9_]'.`,
            line: 1,
            column: 2,
            endLine: 1,
            endColumn: 14,
          },
        ],
      },
      {
        code: `/[0-9_A-Za-z]/`,
        errors: 1,
      },
      {
        code: `/[^A-Za-z0-9_]/`,
        errors: [
          {
            message: `Use concise character class syntax '\\W' instead of '[^A-Za-z0-9_]'.`,
            line: 1,
            column: 2,
            endLine: 1,
            endColumn: 15,
          },
        ],
      },
      {
        code: `/[^0-9_A-Za-z]/`,
        errors: 1,
      },
      {
        code: `/x{0,1}/`,
        errors: [
          {
            message: `Use concise quantifier syntax '?' instead of '{0,1}'.`,
            line: 1,
            column: 2,
            endLine: 1,
            endColumn: 8,
          },
        ],
      },
      {
        code: `/x{0,1}?/`,
        errors: 1,
      },
      {
        code: `/x{0,}/`,
        errors: [
          {
            message: `Use concise quantifier syntax '*' instead of '{0,}'.`,
            line: 1,
            column: 2,
            endLine: 1,
            endColumn: 7,
          },
        ],
      },
      {
        code: `/(x\\w+){0}/`,
        errors: [
          {
            message: `Remove redundant (x\\w+){0}.`,
            line: 1,
            column: 2,
            endLine: 1,
            endColumn: 11,
          },
        ],
      },
      {
        code: `/x{0,0}/`,
        errors: [
          {
            message: `Remove redundant x{0,0}.`,
            line: 1,
            column: 2,
            endLine: 1,
            endColumn: 8,
          },
        ],
      },
      {
        code: `/(x\\w+){1}/`,
        errors: [
          {
            message: `Remove redundant quantifier {1}.`,
            line: 1,
            column: 2,
            endLine: 1,
            endColumn: 11,
          },
        ],
      },
      {
        code: `/x{1,1}/`,
        errors: [
          {
            message: `Remove redundant quantifier {1,1}.`,
            line: 1,
            column: 2,
            endLine: 1,
            endColumn: 8,
          },
        ],
      },
      {
        code: `/x{0,}?/`,
        errors: 1,
      },
      {
        code: `/x{1,}/`,
        errors: [
          {
            message: `Use concise quantifier syntax '+' instead of '{1,}'.`,
            line: 1,
            column: 2,
            endLine: 1,
            endColumn: 7,
          },
        ],
      },
      {
        code: `/x{1,}?/`,
        errors: 1,
      },
      {
        code: `/x{2,2}/`,
        errors: [
          {
            message: `Use concise quantifier syntax '{2}' instead of '{2,2}'.`,
            line: 1,
            column: 2,
            endLine: 1,
            endColumn: 8,
          },
        ],
      },
      {
        code: `/x{2,2}?/`,
        errors: 1,
      },
    ],
  },
);
