/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';

const ruleTester = new NodeRuleTester({
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
