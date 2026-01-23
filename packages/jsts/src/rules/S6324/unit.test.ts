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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S6324', () => {
  it('S6324', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('No control characters in regular expressions', rule, {
      valid: [
        {
          code: `/0/`,
        },
        {
          code: `/\\0/`,
        },
        {
          code: `/\\x20/`,
        },
        {
          code: `/\\u0020/`,
        },
        {
          code: `/\\u{001F}/`,
        },
        {
          code: `/\\cA/`,
        },
        {
          code: String.raw`new RegExp('\t')`,
        },
        {
          code: String.raw`new RegExp('\n')`,
        },
        // False positive: Control characters as range boundaries (should NOT raise issues)
        // These use control chars in CharacterClassRange - clearly intentional
        {
          // Hex escape syntax range for control characters
          code: String.raw`/[\x00-\x1f]/g`,
        },
        {
          // Unicode escape syntax range for control characters
          code: String.raw`/[\u0000-\u001f]/`,
        },
        // False positive: Multiple control character ranges in a single pattern
        {
          // Multiple ranges with control char boundaries - both ranges should be skipped
          code: String.raw`/[\x01-\x08\x0e-\x1f]/`,
        },
        // False positive: Negated character class with control char range boundary
        {
          // Pattern to match non-ASCII characters using control char as range start
          code: String.raw`/[^\u0000-\u007F]/g`,
        },
        // Additional test cases from ruling analysis:
        {
          // CSS escaping pattern with control char ranges (from jquery/sizzle)
          code: String.raw`/([\0-\x1f\x7f]|^-?\d)/g`,
        },
        {
          // JSON string escaping with control char range (from mootools-core)
          code: String.raw`/[\x00-\x1f\\"]/g`,
        },
        {
          // String inspection with control char range (from prototype.js)
          code: String.raw`/[\x00-\x1f\\]/g`,
        },
      ],
      invalid: [
        {
          code: `/\\x00/`,
          errors: [
            {
              message: 'Remove this control character.',
              line: 1,
              endLine: 1,
              column: 2,
              endColumn: 6,
            },
          ],
        },
        {
          code: `/\\u001F/`,
          errors: [
            {
              message: 'Remove this control character.',
              line: 1,
              endLine: 1,
              column: 2,
              endColumn: 8,
            },
          ],
        },
        {
          code: `/\\u{001F}/u`,
          errors: [
            {
              message: 'Remove this control character.',
              line: 1,
              endLine: 1,
              column: 2,
              endColumn: 10,
            },
          ],
        },
        {
          code: String.raw`var regex = new RegExp('\x1f\x1e')`,
          errors: [
            {
              message: String.raw`Remove this control character.`,
              line: 1,
              endLine: 1,
              column: 25,
              endColumn: 29,
            },
            {
              message: String.raw`Remove this control character.`,
              line: 1,
              endLine: 1,
              column: 29,
              endColumn: 33,
            },
          ],
        },
        {
          code: String.raw`var regex = new RegExp('\x1fFOO\x00')`,
          errors: 2,
        },
        {
          code: String.raw`var regex = new RegExp('FOO\x1fFOO\x1f')`,
          errors: 2,
        },
        {
          code: String.raw`var regex = RegExp('\x1f')`,
          errors: 1,
        },
        {
          code: String.raw`const flags = ''; new RegExp("\\u001F", flags)`,
          errors: 1,
        },
        // Additional invalid cases from ruling analysis:
        {
          // Standalone control char in character class (NOT a range boundary)
          // The \x00 here is standalone, not part of a range like [\x00-\x1f]
          code: String.raw`/[^#?\x00]*/`,
          errors: 1,
        },
        {
          // Control characters in alternation pattern (not in character class range)
          // \u0009 (tab), \u000a (newline), \u000c (form feed), \u000d (carriage return) are all control chars
          // \u0020 (space) is NOT a control char (value 32 = 0x20, outside 0x00-0x1f range)
          // Note: EXCEPTIONS only covers '\t' and '\n' as raw strings, not \uXXXX escapes
          code: String.raw`/\u0009|\u000a|\u000c|\u000d|\u0020/`,
          errors: 4, // \u0009, \u000a, \u000c, \u000d - all control chars flagged (EXCEPTIONS only match literal \t and \n)
        },
        {
          // Standalone null character match used in HTML parsing
          code: String.raw`/\u0000/g`,
          errors: 1,
        },
        {
          // ANSI escape sequence - control char outside of range
          code: String.raw`/\u001b\[\d\d?m/g`,
          errors: 1,
        },
      ],
    });
  });
});
