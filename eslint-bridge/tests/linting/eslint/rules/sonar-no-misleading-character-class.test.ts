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
import { rule } from 'linting/eslint/rules/sonar-no-misleading-character-class';
const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });

const combiningClass = c => `Move this Unicode combined character '${c}' outside of [...]`;

ruleTester.run('', rule, {
  valid: [
    'var r = /[\\uD83D\\d\\uDC4D]/',
    'var r = /[\\uD83D-\\uDC4D]/',
    'var r = /[👍]/u',
    'var r = /[\\uD83D\\uDC4D]/u',
    'var r = /[\\u{1F44D}]/u',
    'var r = /❇️/',
    'var r = /Á/',
    'var r = /[❇]/',
    'var r = /👶🏻/',
    'var r = /[👶]/u',
    'var r = /🇯🇵/',
    'var r = /[JP]/',
    'var r = /👨‍👩‍👦/',

    // Ignore solo lead/tail surrogate.
    'var r = /[\\uD83D]/',
    'var r = /[\\uDC4D]/',
    'var r = /[\\uD83D]/u',
    'var r = /[\\uDC4D]/u',

    // Ignore solo combining char.
    'var r = /[\\u0301]/',
    'var r = /[\\uFE0F]/',
    'var r = /[\\u0301]/u',
    'var r = /[\\uFE0F]/u',

    // Coverage
    'var r = /[x\\S]/u',
    'var r = /[xa-z]/u',
  ],
  invalid: [
    {
      code: 'var r = /[\\u0041\\u0301-\\u0301]/',
      errors: [{ column: 17, endColumn: 23, message: combiningClass('\\u0041\\u0301') }],
    },
    {
      code: 'var r = /[Á]/',
      errors: [{ message: combiningClass('Á') }],
    },
    {
      code: 'var r = /[Á]/u',
      errors: [{ message: combiningClass('Á') }],
    },
    {
      code: 'var r = /[\\u0041\\u0301]/',
      errors: [{ message: combiningClass('\\u0041\\u0301') }],
    },
    {
      code: 'var r = /[\\u0041\\u0301]/u',
      errors: [{ message: combiningClass('\\u0041\\u0301') }],
    },
    {
      code: 'var r = /[\\u{41}\\u{301}]/u',
      errors: [{ message: combiningClass('\\u{41}\\u{301}') }],
    },
    {
      code: 'var r = /[❇️]/',
      errors: [{ message: combiningClass('❇️') }],
    },
    {
      code: 'var r = /[❇️]/u',
      errors: [{ message: combiningClass('❇️') }],
    },
    {
      code: 'var r = /[\\u2747\\uFE0F]/',
      errors: [{ message: combiningClass('\\u2747\\uFE0F') }],
    },
    {
      code: 'var r = /[\\u2747\\uFE0F]/u',
      errors: [{ message: combiningClass('\\u2747\\uFE0F') }],
    },
    {
      code: 'var r = /[\\u{2747}\\u{FE0F}]/u',
      errors: [{ message: combiningClass('\\u{2747}\\u{FE0F}') }],
    },
    {
      code: String.raw`var r = new globalThis.RegExp("[❇️]", "")`,
      errors: [{ message: combiningClass('❇️') }],
    },
    {
      code: String.raw`"cc̈d̈d".replaceAll(RegExp("[c̈d̈]"), "X")`,
      errors: [{ message: combiningClass('c̈') }],
    },
  ],
});
