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

const ruleTester = new NodeRuleTester({ parserOptions: { ecmaVersion: 2018 } });

ruleTester.run('Track uses of FIXME tags', rule, {
  valid: [
    {
      code: `// Just a regular comment`,
    },
    {
      code: `
        // This is not aFIXME comment

        // notafixme comment

        // a fixmeal
        `,
    },
  ],
  invalid: [
    {
      code: `// FIXME`,
      errors: [
        {
          message: 'Take the required action to fix the issue indicated by this comment.',
          line: 1,
          endLine: 1,
          column: 4,
          endColumn: 9,
        },
      ],
    },

    {
      code: `/*FIXME Multiline comment 
      FIXME: another fixme
      (this line is not highlighted)
      with three fixme
      */`,
      errors: [
        {
          message: 'Take the required action to fix the issue indicated by this comment.',
          line: 1,
          endLine: 1,
          column: 3,
          endColumn: 8,
        },
        {
          message: 'Take the required action to fix the issue indicated by this comment.',
          line: 2,
          endLine: 2,
          column: 7,
          endColumn: 12,
        },
        {
          message: 'Take the required action to fix the issue indicated by this comment.',
          line: 4,
          endLine: 4,
          column: 18,
          endColumn: 23,
        },
      ],
    },
    {
      code: `// FIXME  FIXME`,
      errors: 1,
    },
    {
      code: `
      // FIXME just fix me 

      // FixMe just fix me 

      //fixme comment

      // This is a FIXME just fix me 

      // fixme: things to do

      // :FIXME: things to do

      // valid end of line fixme

      /*
      FIXME Multiline comment 
      */

      /*
      FIXME Multiline comment 

        with two fixme
      */

      // valid end of file FIXME
        `,
      errors: 11,
    },
  ],
});
