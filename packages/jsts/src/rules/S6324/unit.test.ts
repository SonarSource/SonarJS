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
        // Mixed ranges and standalone chars in character class: intentional character set construction
        // (Fixes false positives for YAML, CSS, asciify patterns)
        {
          // Standalone chars (\x0b, \x0c) alongside ranges (\x00-\x08) should not flag
          // because the presence of ranges indicates intentional character set construction
          code: String.raw`/[\x00-\x08\x0b\x0c]/`,
        },
        {
          // Control char escaping pattern from Jest's escapeControlCharacters
          // Ranges with standalone chars to match specific control characters
          code: String.raw`/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g`,
        },
        {
          // YAML non-printable character pattern
          // Combines ranges with excluded chars (tab, newline, carriage return are allowed)
          code: String.raw`/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g`,
        },
        {
          // Asciify pattern: escape control chars plus high bytes
          code: String.raw`/[\x00-\x08\x0b\x0c\x0e-\x19\x80-\uffff]/g`,
        },
        {
          // Git ref name sanitization: control chars, space, and special chars
          // Range plus standalone DEL character
          code: String.raw`/[\x00-\x20\x7F~^:?*\[\]\\|""<>]/g`,
        },
        {
          // Unicode variation with mixed ranges and standalone
          code: String.raw`/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g`,
        },
        // ANSI escape sequences - ESC followed by [ or ] should not be flagged
        // CSI (Control Sequence Introducer) - ESC + [
        {
          // CSI sequence: ESC followed by [ indicates ANSI control sequence start
          // Used for terminal colors, cursor control, etc.
          code: String.raw`/\u001b\[\d+m/g`,
        },
        {
          // CSI sequence with hex escape
          code: String.raw`/\x1b\[\d+m/g`,
        },
        {
          // CSI sequence for multiple parameters (like SGR - Select Graphic Rendition)
          code: String.raw`/\u001b\[[\d;]+m/g`,
        },
        // OSC (Operating System Command) - ESC + ] ... BEL
        {
          // OSC sequence: ESC + ] starts OSC, BEL (\x07) terminates it
          // Per xterm spec, BEL is valid only as OSC terminator
          code: String.raw`/\x1b\].*?\x07/`,
        },
        {
          // OSC sequence with unicode escapes
          code: String.raw`/\u001b\].*?\u0007/`,
        },
        {
          // Combined ANSI control sequences pattern (like vscode ansiUtils.ts)
          // Matches CSI, OSC, and simple ESC sequences
          code: String.raw`/(?:\x1b\[|\x9b)[=?>!]?[\d;:]*["$#'* ]?[a-zA-Z@^\`{}|~]/`,
        },
        {
          // OSC sequence pattern matching with ST terminator alternative
          code: String.raw`/(?:\x1b\]|\x9d).*?(?:\x1b\\|\x07|\x9c)/`,
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
          // CRLF detection pattern - both flagged since hex escapes aren't excepted
          code: String.raw`/\x0d\x0a/`,
          errors: 2,
        },
        {
          // Whitespace alternation pattern (like csslint.js) - unicode escapes not excepted
          code: String.raw`/\u0009|\u000a|\u000c|\u000d|\u0020/`,
          errors: 4, // tab, LF, FF, CR as unicode escapes; space (0x20) is not a control char
        },
        // ANSI-related: Cases that should STILL be flagged
        {
          // ESC not followed by [ or ] should still be flagged
          code: String.raw`/\x1b[a-z]/`,
          errors: 1,
        },
        {
          // BEL without OSC sequence should still be flagged
          // BEL is only valid as OSC terminator (after ESC + ])
          code: String.raw`/\x07foo/`,
          errors: 1,
        },
        {
          // BEL in CSI sequence is NOT valid - should be flagged
          // BEL is only valid as OSC terminator, not CSI terminator
          code: String.raw`/\x1b\[.*?\x07/`,
          errors: 1, // Only BEL should be flagged; ESC + [ is valid CSI
        },
        {
          // Standalone ESC without sequence introducer
          code: String.raw`/\u001b/`,
          errors: 1,
        },
        {
          // ESC followed by something other than [ or ]
          code: String.raw`/\x1b\(/`,
          errors: 1,
        },
      ],
    });
  });
});
