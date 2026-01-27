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

const CONTROL_CHAR_MESSAGE = 'Remove this control character.';

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
        // Control characters as character class range boundaries are compliant
        {
          code: String.raw`/[\x00-\x1f]/g`, // hex escape range
        },
        {
          code: String.raw`/[\u0000-\u001f]/`, // unicode escape range
        },
        {
          code: String.raw`/[\x01-\x08\x0e-\x1f]/`, // multiple control char ranges
        },
        {
          code: String.raw`/[^\u0000-\u007F]/g`, // negated character class
        },
        {
          code: String.raw`/[\x00-\x7F]/`, // full ASCII range
        },
        // Real-world patterns from ruling: escaping control chars, string sanitization
        {
          code: String.raw`/[\x00-\x1f\\]/g`, // escape pattern (like prototype.js string.inspect)
        },
        {
          code: String.raw`/[^\u0000-\u007E]/g`, // non-ASCII filter (like normalizeText patterns)
        },
        {
          code: String.raw`/[\x00-\x20\x7F]/g`, // git ref sanitization (ASCII control + DEL)
        },
      ],
      invalid: [
        {
          code: String.raw`/\x00/`,
          errors: [
            {
              message: CONTROL_CHAR_MESSAGE,
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
              message: CONTROL_CHAR_MESSAGE,
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
              message: CONTROL_CHAR_MESSAGE,
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
              message: CONTROL_CHAR_MESSAGE,
              line: 1,
              endLine: 1,
              column: 25,
              endColumn: 29,
            },
            {
              message: CONTROL_CHAR_MESSAGE,
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
          // Standalone control characters inside character class should still be flagged
          // \x0b and \x0c are NOT range boundaries here
          code: String.raw`/[\x0b\x0c]/`,
          errors: 2,
        },
        {
          // Standalone NULL byte replacement (like saxparser.js)
          code: String.raw`str.replace(/\u0000/g, '')`,
          errors: 1,
        },
        {
          // ANSI escape sequence pattern (should flag \u001b)
          code: String.raw`/\u001b\[\d+m/g`,
          errors: 1,
        },
        {
          // CRLF detection pattern - both flagged since hex escapes aren't excepted
          code: String.raw`/\x0d\x0a/`,
          errors: 2,
        },
        {
          // Whitespace alternation pattern (like csslint.js) - unicode escapes not excepted
          code: String.raw`/\u0009|\u000a|\u000c|\u000d|\u0020/`,
          errors: 4, // tab, LF, FF, CR as unicode escapes; space (0x20) is not a control char
        },
        {
          // Mixed ranges and standalone: only standalone chars flagged
          code: String.raw`/[\x00-\x08\x0b\x0c]/`,
          errors: 2, // \x0b and \x0c are standalone, \x00-\x08 is a range
        },
      ],
    });
  });
});
