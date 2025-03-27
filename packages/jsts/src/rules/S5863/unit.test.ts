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

describe('S5863', () => {
  it('S5863', () => {
    const ruleTester = new DefaultParserRuleTester();

    // Main test cases are in the file comment-based fixture file.
    // Here we are testing that no issues are reported when no 'chai' import.

    ruleTester.run('Assertions should not be given twice the same argument', rule, {
      valid: [
        {
          code: `assert.equal(obj, obj);`,
        },
      ],
      invalid: [
        {
          code: `
      const chai = require('chai');
      assert.equal(obj, obj);`,
          errors: [{ message: 'Replace this argument or its duplicate.', line: 3 }],
        },
      ],
    });
  });
});
