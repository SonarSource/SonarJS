/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import path from 'node:path';
import { describe, it } from 'node:test';

describe('S3317', () => {
  it('S3317', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

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
          filename: `${import.meta.dirname}${path.sep}MyClass.js`,
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
  });
});
