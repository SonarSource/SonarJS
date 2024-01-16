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
import { rule } from './';
import path from 'path';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });

ruleTester.run('Class names and file names should match', rule, {
  valid: [
    {
      code: `class MyClass {}
            export default MyClass;`,
      filename: 'MyClass.js',
    },
    {
      code: `class MyClass {}
            export default MySuperClass;`,
      filename: 'my-super-class.js',
    },
    {
      code: `class MyClass {}
            export default MyClass;`,
      filename: 'my_class.js',
    },
    {
      code: `class MyClass1 {}
            export default MyClass1;`,
      filename: 'myclass1.js',
    },
    {
      code: `function MyFunction() {}
            export default MyFunction;`,
      filename: 'MyFunction.js',
    },
    {
      code: `const myConst = 3.14
            export default myConst;`,
      filename: 'myConst.js',
    },
    {
      code: `class MyClass {}
            export default MyClass;
            export function foo() {}`,
      filename: 'ok_several_exports.js',
    },
    {
      code: `export default class {}`,
      filename: 'ok_anonymous_class.js',
    },
    {
      code: `export default 42;`,
      filename: 'ok_anonymous_constant.js',
    },
    {
      code: `export default function () {}`,
      filename: 'ok_anonymous_function.js',
    },
    {
      code: `const pi = 3.14;
            export default pi * 42;`,
      filename: 'ok_expression.js',
    },
    {
      code: `const myConst = 3.14;
            export default myConst;`,
      filename: 'index.js', //ignore index.js
    },
    {
      code: `let myConst = 3.14;
            export default myConst;`, //Not a const
      filename: 'nok_constant.js',
    },
    {
      code: `class MyClass {}
            export default MyClass;`,
      filename: `${__dirname}${path.sep}MyClass.js`,
    },
    {
      code: `const MY_CONST = 3.14;
            export default MY_CONST;`,
      filename: 'MY_CONST.js',
    },
    {
      code: `class MyClass {}
            export default MyClass;`,
      filename: 'my.class.js',
    },
    {
      code: `class MyClass {}
            export default MyClass;`,
      filename: 'MyClass.dev.js', //ignore postfix
    },
  ],
  invalid: [
    {
      code: `foo();
              function myFunc () {}
              export default myFunc;`,
      filename: 'nok_function_export.js',
      errors: [
        {
          message: 'Rename this file to "myFunc"',
          line: 0,
          column: 1,
        },
      ],
    },
    {
      code: `class MyClass {}
            export default MyClass;`,
      filename: 'nok_identifier.js',
      errors: [
        {
          message: 'Rename this file to "MyClass"',
        },
      ],
    },

    {
      code: `export default class MyClass {}`,
      filename: 'nok_class_declaration.js',
      errors: [
        {
          message: 'Rename this file to "MyClass"',
        },
      ],
    },

    {
      code: `export default function MyFunction() {};`,
      filename: 'nok_MyFunction.js',
      errors: [
        {
          message: 'Rename this file to "MyFunction"',
        },
      ],
    },
    {
      code: `const myConst = 3.14;
            export default myConst;`,
      filename: 'nok_constant.js',
      errors: [
        {
          message: 'Rename this file to "myConst"',
        },
      ],
    },
    {
      code: `const myConst = 3.14;
            export default myConst;`,
      filename: 'no_extension',
      errors: [
        {
          message: 'Rename this file to "myConst"',
        },
      ],
    },
  ],
});
