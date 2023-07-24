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
import { eslintRules } from 'linting/eslint/rules/core';
import { decorateNoUnusedPrivateClassMembers } from 'linting/eslint/rules/decorators/no-unused-private-class-members-decorator';

const rule = decorateNoUnusedPrivateClassMembers(eslintRules['no-unused-private-class-members']);
const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2022 },
});

ruleTester.run(`Unused private class members should be removed`, rule, {
  valid: [
    {
      code: `
        class MyClass{
          #foo = 123;
          bar(){return this.#foo;}
        }`,
    },
  ],
  invalid: [
    {
      code: `class MyClass{ #foo = 123; }`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Remove unused private class member',
              output: `class MyClass{  }`,
            },
          ],
        },
      ],
    },
    {
      code: `class MyClass{ #foo(){} }`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Remove unused private class member',
              output: `class MyClass{  }`,
            },
          ],
        },
      ],
    },
    {
      code: `class MyClass{ get #foo(){} }`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Remove unused private class member',
              output: `class MyClass{  }`,
            },
          ],
        },
      ],
    },
    {
      code: `class MyClass{ set #foo(v){} }`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Remove unused private class member',
              output: `class MyClass{  }`,
            },
          ],
        },
      ],
    },
    {
      code: `class MyClass{ static #foo = 123; }`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Remove unused private class member',
              output: `class MyClass{  }`,
            },
          ],
        },
      ],
    },
    {
      code: `class MyClass{ static #foo(){} }`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Remove unused private class member',
              output: `class MyClass{  }`,
            },
          ],
        },
      ],
    },
  ],
});
