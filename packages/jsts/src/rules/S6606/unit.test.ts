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
import { rule } from './rule.js';
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

import path from 'path';
import parser from '@typescript-eslint/parser';

describe('S6606', () => {
  it('S6606', () => {
    const ruleTester = new RuleTester({
      parser,
      parserOptions: {
        project: `./tsconfig.json`,
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });

    ruleTester.run('S6606', rule, {
      valid: [
        {
          code: `
  function foo(value: string) {
    return value || 'default';
  }
  `,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
  function foo(value: string | number) {
    return value || 'default';
  }
  `,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
  function foo(value: boolean | null) {
    return value || 'default';
  }
  `,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
  function foo(value: { baz: number } | null) {
    return value || 'default';
  }
  `,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
  function foo(value: Date | null) {
    return value || 'default';
  }
  `,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
      ],
      invalid: [
        {
          code: `
  function foo(value: string | null) {
    return value || 'default';
  }
  `,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
        {
          code: `
  function foo(value: number | null) {
    return value || 'default';
  }
  `,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
        {
          code: `
  function foo(value: bigint | null) {
    return value || 'default';
  }
  `,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
      ],
    });
  });
});
