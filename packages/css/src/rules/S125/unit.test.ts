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
import { StylelintRuleTester } from '../../../tests/tools/tester';
import { rule } from './rule';

const ruleTester = new StylelintRuleTester(rule);
ruleTester.run('sonar/no-commented-code', {
  valid: [
    {
      description: 'no comment',
      code: 'p {}',
    },
    {
      description: 'no commented code',
      code: '/* hello, world! */',
    },
  ],
  invalid: [
    {
      description: 'selector',
      code: '/* p {} */',
      errors: [{ text: 'Remove this commented out code.', line: 1, column: 1 }],
    },
    {
      description: 'multiple selectors',
      code: '/* p, div {} */',
      errors: [{ text: 'Remove this commented out code.', line: 1, column: 1 }],
    },
    {
      description: 'declaration',
      code: '/* color: blue; */',
      errors: [{ text: 'Remove this commented out code.', line: 1, column: 1 }],
    },
    {
      description: 'selector declaration',
      code: '/* p { color: blue; } */',
      errors: [{ text: 'Remove this commented out code.', line: 1, column: 1 }],
    },
    {
      description: 'multiple declarations',
      code: '/* div { font-size: 20px; color: red; } */',
      errors: [{ text: 'Remove this commented out code.', line: 1, column: 1 }],
    },
    {
      description: 'class selector',
      code: '/* .class { background-color: red; } */',
      errors: [{ text: 'Remove this commented out code.', line: 1, column: 1 }],
    },
    {
      description: 'id selector',
      code: '/* #id:hover { border: 1px solid black; } */',
      errors: [{ text: 'Remove this commented out code.', line: 1, column: 1 }],
    },
    {
      description: 'attribute selector',
      code: '/* a[href] { color: purple; } */',
      errors: [{ text: 'Remove this commented out code.', line: 1, column: 1 }],
    },
    {
      description: 'media query',
      code: '/* @media (max-width: 600px) { .class { font-size: 18px; } } */',
      errors: [{ text: 'Remove this commented out code.', line: 1, column: 1 }],
    },
    {
      description: '@keyframes',
      code: '/* @keyframes mymove { 0% { top: 0px; } 100% { top: 200px; } } */',
      errors: [{ text: 'Remove this commented out code.', line: 1, column: 1 }],
    },
    {
      description: 'import',
      code: '/* @import url("styles.css"); */',
      errors: [{ text: 'Remove this commented out code.', line: 1, column: 1 }],
    },
    {
      description: 'multline',
      code: `
/*
p {
  color: blue;
}
*/
      `,
      errors: [{ text: 'Remove this commented out code.', line: 2, column: 1 }],
    },
  ],
});
