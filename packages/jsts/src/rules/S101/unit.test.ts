/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { rule } from './index.js';
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const ruleTester = new NoTypeCheckingRuleTester();

const CUSTOM_FORMAT = '^[_A-Z][a-zA-Z0-9]*$';

describe('S101', () => {
  it('S101', () => {
    ruleTester.run('Class and interface names should comply with a naming convention', rule, {
      valid: [
        {
          code: `
      class MyClass {}
      var x = class y {} // Compliant, rule doesn't check class expressions
      interface MyInterface {}
      `,
          options: [{ format: '^\\$?[A-Z][a-zA-Z0-9]*$' }],
        },
        {
          code: `
      class  MyClass {}
      class _MyClass {}
      interface _MyInterface {}
      `,
          options: [{ format: CUSTOM_FORMAT }],
        },
        {
          // Compliant: $ prefix before PascalCase is allowed by the default format
          code: `
      interface $ZodCheckDef {}
      interface $ZodCheckInternals<T> {}
      interface $ZodCheckLessThanDef extends $ZodCheckDef {}
      interface $ZodCheckLessThanInternals<T extends number> extends $ZodCheckInternals<T> {}
      `,
        },
        {
          // Compliant: $ prefix before PascalCase is allowed by the default format
          code: `
      class $LocationShimProvider {}
      class $ServiceProvider {}
      `,
        },
      ],
      invalid: [
        {
          code: `class my_class {}`,
          options: [{ format: '^\\$?[A-Z][a-zA-Z0-9]*$' }],
          errors: [
            {
              message: `Rename class "my_class" to match the regular expression ^\\$?[A-Z][a-zA-Z0-9]*$.`,
              line: 1,
              endLine: 1,
              column: 7,
              endColumn: 15,
            },
          ],
        },
        {
          code: `interface my_interface {}`,
          options: [{ format: '^\\$?[A-Z][a-zA-Z0-9]*$' }],
          errors: [
            {
              message: `Rename interface "my_interface" to match the regular expression ^\\$?[A-Z][a-zA-Z0-9]*$.`,
            },
          ],
        },
        {
          // $ prefix only allowed before PascalCase, not snake_case
          code: `interface $my_interface {}`,
          errors: [
            {
              message: `Rename interface "$my_interface" to match the regular expression ^\\$?[A-Z][a-zA-Z0-9]*$.`,
            },
          ],
        },
        {
          code: `class __MyClass {}`,
          options: [{ format: CUSTOM_FORMAT }],
          errors: [
            {
              message: `Rename class "__MyClass" to match the regular expression ${CUSTOM_FORMAT}.`,
            },
          ],
        },
        {
          code: `interface __MyInterface {}`,
          options: [{ format: CUSTOM_FORMAT }],
          errors: [
            {
              message: `Rename interface "__MyInterface" to match the regular expression ${CUSTOM_FORMAT}.`,
            },
          ],
        },
      ],
    });
  });
});
