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

describe('S7785', () => {
  it('should skip CommonJS files', () => {
    // Create a rule tester with sourceType: 'script' for CommonJS
    const cjsRuleTester = new NoTypeCheckingRuleTester({ sourceType: 'script' });
    cjsRuleTester.run('S7785 skips CommonJS files (script)', rule, {
      valid: [
        {
          // CommonJS file (sourceType: 'script') - should not report
          code: `(async () => { await fetch('https://example.com'); })();`,
        },
      ],
      invalid: [],
    });

    // Test .cjs extension
    const esmRuleTester = new NoTypeCheckingRuleTester();
    esmRuleTester.run('S7785 skips .cjs files', rule, {
      valid: [
        {
          // .cjs file - should not report regardless of sourceType
          code: `(async () => { await fetch('https://example.com'); })();`,
          filename: 'file.cjs',
        },
      ],
      invalid: [],
    });
  });

  it('should report in ES modules', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('S7785 reports in ES modules', rule, {
      valid: [
        {
          // Valid top-level await in ESM
          code: `await fetch('https://example.com');`,
        },
      ],
      invalid: [
        {
          // ESM file - should report IIFE pattern
          code: `(async () => { await fetch('https://example.com'); })();`,
          errors: [{ messageId: 'iife' }],
        },
        {
          // .mjs file - should report
          code: `(async () => { await fetch('https://example.com'); })();`,
          filename: 'file.mjs',
          errors: [{ messageId: 'iife' }],
        },
      ],
    });
  });
});
