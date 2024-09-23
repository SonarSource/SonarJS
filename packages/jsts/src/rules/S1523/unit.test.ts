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
import { rule } from './/index.js';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run('Dynamically executing code is security-sensitive', rule, {
  valid: [
    {
      code: `foo(x)`,
    },
    {
      code: `function foo(x){}\n foo(x);`,
    },
    {
      code: `eval()`,
    },
    {
      code: `eval(42)`,
    },
    {
      code: `eval("Hello")`,
    },
    {
      code: `eval(\`Hello\`)`,
    },
    {
      code: `Function()`,
    },
    {
      code: `new Function(42)`,
    },
    {
      code: `new Function('a', 42)`,
    },
    {
      code: `Function(42, 'x')`,
    },
    {
      code: `Function("Hello")`,
    },
    {
      code: `Function(\`Hello\`)`,
    },
  ],
  invalid: [
    {
      code: `eval(x);`,
      errors: [
        {
          message: 'Make sure that this dynamic injection or execution of code is safe.',
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 5,
        },
      ],
    },
    {
      code: `eval(\`Hello \${x}\`)`,
      errors: 1,
    },
    {
      code: `Function(x)`,
      errors: 1,
    },
    {
      code: `new Function(x)`,
      errors: 1,
    },
    {
      code: `eval(42, x)`,
      errors: 1,
    },
    {
      code: `eval(x, 42)`,
      errors: 1,
    },
    {
      code: `new Function(a, x)`,
      errors: 1,
    },
    {
      code: `new Function('a', x)`,
      errors: 1,
    },
    {
      code: `location.href = 'javascript: void(0)';`,
      errors: 1,
    },
  ],
});
