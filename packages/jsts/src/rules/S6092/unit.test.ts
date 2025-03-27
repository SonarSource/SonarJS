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

// Main test cases are in the file comment-based fixture file.
// Here we are testing that no issues are reported when no 'chai' import.

describe('S6092', () => {
  it('S6092', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Assertions should not be given twice the same argument', rule, {
      valid: [
        {
          code: `expect(foo).to.not.throw(ReferenceError);`,
        },
      ],
      invalid: [
        {
          code: `
      const chai = require('chai');
      expect(foo).to.not.throw(ReferenceError);`,
          errors: [
            {
              message: 'Refactor this uncertain assertion; it can succeed for multiple reasons.',
              line: 3,
            },
          ],
        },
      ],
    });
  });
});
