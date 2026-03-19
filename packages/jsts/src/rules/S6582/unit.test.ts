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
import { DefaultParserRuleTester, RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './rule.js';
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { describe, it } from 'node:test';
import path from 'node:path';

const upstreamRule = tsEslintRules['prefer-optional-chain'];

// Sentinel: verify that the upstream ESLint rule still raises on the patterns our fix suppresses.
// If this test starts failing, the interceptor can be safely removed.
describe('S6582 upstream sentinel', () => {
  it('upstream prefer-optional-chain raises on typed-context patterns that our fix suppresses', () => {
    const ruleTester = new RuleTester({
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });
    ruleTester.run('prefer-optional-chain', upstreamRule, {
      valid: [],
      invalid: [
        {
          // return type 'number | null' excludes undefined — suppressed by fix, raised by upstream
          code: `function getLen(arr: string[] | null): number | null { return arr && arr.length; }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
        {
          // variable typed as 'number | null' excludes undefined — suppressed by fix, raised by upstream
          code: `function f(a: number[] | null) { const x: number | null = a && a.length; }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
      ],
    });
  });
});

describe('S6582', () => {
  it('does not raise without TypeScript services', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('S6582', rule, {
      valid: [{ code: `foo && foo.a;` }],
      invalid: [],
    });
  });

  it('suppresses reports when optional chaining would change type from T|null to T|undefined', () => {
    const ruleTester = new RuleTester({
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });
    ruleTester.run('S6582', rule, {
      valid: [
        {
          // FP: return type 'number | null' excludes undefined — replacing with optional chaining would change type
          code: `function getLen(arr: string[] | null): number | null { return arr && arr.length; }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          // FP: variable typed as 'number | null' excludes undefined
          code: `function f(a: number[] | null) { const x: number | null = a && a.length; }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          // FP: variable typed as 'string | null' excludes undefined
          code: `interface Item { name: string; } function f(item: Item | null) { const x: string | null = item && item.name; }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
      ],
      invalid: [
        {
          // boolean context (if-condition): no contextual type — optional chaining is type-safe
          code: `function f(arr: string[] | null) { if (arr && arr.length) {} }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
        {
          // return type includes undefined — optional chaining preserves assignability
          code: `function f(arr: string[] | null): number | undefined { return arr && arr.length; }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
      ],
    });
  });
});
