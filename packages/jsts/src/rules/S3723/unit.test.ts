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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S3723', () => {
  it('S3723', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('Trailing commas should be used', rule, {
      valid: [
        {
          code: `
obj = {
  foo: 42,
  bar: 24,
}; `,
        },
      ],
      invalid: [
        {
          code: `
obj = {
  foo: 42,
  bar: 24
};`,
          errors: 1,
          output: `
obj = {
  foo: 42,
  bar: 24,
};`,
        },
      ],
    });
  });
});
