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

const MESSAGE = 'Remove this control character.';

describe('S6324', () => {
  it('S6324', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('No control characters in regular expressions', rule, {
      valid: [
        {
          code: `/0/`,
        },
        {
          code: String.raw`/\0/`,
        },
        {
          code: String.raw`/\x20/`,
        },
        {
          code: String.raw`/\u0020/`,
        },
        {
          code: String.raw`/\u{001F}/`,
        },
        {
          code: String.raw`/\cA/`,
        },
        {
          code: String.raw`new RegExp('\t')`,
        },
        {
          code: String.raw`new RegExp('\n')`,
        },
        // Control characters as range boundaries should not trigger (FP fix)
        {
          // Simple control char range [\\x00-\\x1f]
          code: String.raw`/[\x00-\x1f]/g`,
        },
        {
          // Control char range with unicode escape syntax
          code: String.raw`/[\u0000-\u001f]/`,
        },
        {
          // Multiple control char ranges in same character class
          code: String.raw`/[\x01-\x08\x0e-\x1f]/`,
        },
        {
          // Negated character class with control char as range boundary
          code: String.raw`/[^\u0000-\u007F]/g`,
        },
        {
          // Control char range in new RegExp
          code: String.raw`new RegExp('[\\x00-\\x1f]')`,
        },
        {
          // CSS selector escaping pattern with range boundary
          code: String.raw`/([\0-\x1f\x7f]|^-?\d)/g`,
        },
        {
          // Negated ASCII range for diacritics/non-ASCII matching
          code: String.raw`/[^\u0000-\u007E]/g`,
        },
        {
          // JSON/string escaping pattern with control char range
          code: String.raw`/[\x00-\x1f\\"]/g`,
        },
        {
          // Git ref name validation with control char range
          code: String.raw`/[\x00-\x20\x7F~^:?*]/g`,
        },
      ],
      invalid: [
        {
          code: String.raw`/\x00/`,
          errors: [
            {
              message: MESSAGE,
              line: 1,
              endLine: 1,
              column: 2,
              endColumn: 6,
            },
          ],
        },
        {
          code: String.raw`/\u001F/`,
          errors: [
            {
              message: MESSAGE,
              line: 1,
              endLine: 1,
              column: 2,
              endColumn: 8,
            },
          ],
        },
        {
          code: String.raw`/\u{001F}/u`,
          errors: [
            {
              message: MESSAGE,
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
              message: MESSAGE,
              line: 1,
              endLine: 1,
              column: 25,
              endColumn: 29,
            },
            {
              message: MESSAGE,
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
        {
          // Standalone control chars in character class should still be flagged
          // (only range boundaries should be excluded)
          code: String.raw`/[\x01-\x08\x0b\x0c]/`,
          errors: 2, // \x0b and \x0c are standalone, not range boundaries
        },
        {
          // Standalone ANSI escape code (ESC char) should be flagged
          code: String.raw`/\u001b\[\d+m/g`,
          errors: 1,
        },
        {
          // Standalone null character in regex should be flagged
          code: String.raw`/\u0000/g`,
          errors: 1,
        },
        {
          // CSS whitespace alternation pattern - all standalone control chars flagged
          // Note: EXCEPTIONS only match literal \t and \n, not unicode escapes like \u0009 or \u000a
          code: String.raw`/\u0009|\u000a|\u000c|\u000d/`,
          errors: 4,
        },
        {
          // Vertical tab (VT) standalone should be flagged
          code: String.raw`/\x0B/g`,
          errors: 1,
        },
        {
          // Standalone null char in negated character class should be flagged
          // (from ruling: ace/demo/static-highlighter/server.js)
          code: String.raw`/[^#?\x00]*/`,
          errors: 1,
        },
        {
          // CRLF line ending detection pattern - standalone control chars flagged
          // (from ruling: jquery/build/tasks/dist.js)
          code: String.raw`/\x0d\x0a/`,
          errors: 2,
        },
      ],
    });
  });
});
