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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

const ruleTesterJS = new DefaultParserRuleTester();

describe('S2208', () => {
  it('S2208', () => {
    ruleTesterJS.run('Wildcard imports should not be used', rule, {
      valid: [
        {
          code: ` 
      import a from 'aa'; // ImportDefaultSpecifier
      import { b } from 'bb'; // ImportSpecifier
      import { c, d } from 'cd'; // ImportSpecifier
      import { e as f } from 'e'; // ImportSpecifier`,
        },
        {
          code: `export { m } from "module-name";`,
        },
      ],
      invalid: [
        {
          code: `
      import * as name1 from "module-name";
      import defaultMember, * as name2 from "module-name";
      `,
          errors: [
            {
              message: `Explicitly import the specific member needed.`,
              line: 2,
              endLine: 2,
              column: 14,
              endColumn: 24,
            },
            {
              message: `Explicitly import the specific member needed.`,
              line: 3,
              endLine: 3,
              column: 29,
              endColumn: 39,
            },
          ],
        },
        {
          code: `export * from "module-name";`,
          errors: [
            {
              message: `Explicitly export the specific member needed.`,
              line: 1,
              endLine: 1,
              column: 1,
              endColumn: 29,
            },
          ],
        },
      ],
    });
  });
});
