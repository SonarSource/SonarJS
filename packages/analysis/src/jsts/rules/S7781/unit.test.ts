/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import { rules } from '../external/unicorn.js';
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const upstreamRule = rules['prefer-string-replace-all'];

// Sentinel: verify that the upstream ESLint rule still raises on the regex patterns our decorator
// suppresses. If this test starts failing, the decorator can be safely removed.
describe('S7781 upstream sentinel', () => {
  it('upstream prefer-string-replace-all raises on regex-only patterns that decorator suppresses', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('prefer-string-replace-all', upstreamRule, {
      valid: [],
      invalid: [
        {
          code: String.raw`function normalize(input) { return input.replace(/[{}\s]/g, ''); }`,
          errors: [{ messageId: 'method' }],
          output: String.raw`function normalize(input) { return input.replaceAll(/[{}\s]/g, ''); }`,
        },
        {
          code: String.raw`function compact(input) { return input.replace(/\s+/g, ''); }`,
          errors: [{ messageId: 'method' }],
          output: String.raw`function compact(input) { return input.replaceAll(/\s+/g, ''); }`,
        },
        {
          code: `function normalize(input) { return input.replace(/[^a-zA-Z0-9]+/g, ' '); }`,
          errors: [{ messageId: 'method' }],
          output: `function normalize(input) { return input.replaceAll(/[^a-zA-Z0-9]+/g, ' '); }`,
        },
        {
          code: `function replace(input) { return input.replace(/foo/ig, 'bar'); }`,
          errors: [{ messageId: 'method' }],
          output: `function replace(input) { return input.replaceAll(/foo/ig, 'bar'); }`,
        },
        {
          code: `function replace(input) { return input.replace(/(foo)/g, '$1'); }`,
          errors: [{ messageId: 'method' }],
          output: `function replace(input) { return input.replaceAll(/(foo)/g, '$1'); }`,
        },
        {
          code: `function replace(input) { return input.replace(/(foo)/g, part => part.toUpperCase()); }`,
          errors: [{ messageId: 'method' }],
          output: `function replace(input) { return input.replaceAll(/(foo)/g, part => part.toUpperCase()); }`,
        },
      ],
    });
  });
});

describe('S7781', () => {
  it('S7781', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('prefer-string-replace-all', rule, {
      valid: [
        {
          // Compliant: character class and shorthand escape
          code: String.raw`function normalizeParameterName(input) { return input.replace(/[{}\s]/g, ''); }`,
        },
        {
          // Compliant: quantified whitespace
          code: String.raw`function collapseWhitespace(input) { return input.replace(/\s+/g, ''); }`,
        },
        {
          // Compliant: negated character class
          code: `function normalizeSearchTerms(input) { return input.replace(/[^a-zA-Z0-9]+/g, ' '); }`,
        },
        {
          // Compliant: extra flags change semantics
          code: `function normalizeCase(input) { return input.replace(/foo/ig, 'bar'); }`,
        },
        {
          // Compliant: capture-sensitive replacement string
          code: `function replaceCaptures(input) { return input.replace(/(foo)/g, '$1'); }`,
        },
        {
          // Compliant: capture-sensitive replacement callback
          code: `function replaceWithCallback(input) { return input.replace(/(foo)/g, part => part.toUpperCase()); }`,
        },
        // Compliant: Unicode regexes match code points. Converting surrogate characters
        // or classes to a string search can change which substrings match.
        ...['u', 'v'].flatMap(flag =>
          [
            String.raw`\uD83D`,
            String.raw`\uDE00`,
            String.raw`[\uD83D][\uDE00]`,
            String.raw`(?:[\uD83D]){2}`,
          ].map(pattern => ({
            code: `input.replace(/${pattern}/g${flag}, 'x');`,
            languageOptions: {
              // The v flag requires ES2024; older parser targets reject it before the rule runs.
              ecmaVersion: 2024 as const,
            },
          })),
        ),
        // Compliant: scoped i modifiers enable case-insensitive matching, which a string cannot preserve.
        ...['(?i:foo)', '(?:prefix(?i:foo)){2}'].map(pattern => ({
          code: `input.replace(/${pattern}/g, 'x');`,
          languageOptions: {
            // Scoped modifiers require ES2025; older parser targets reject this syntax.
            ecmaVersion: 2025 as const,
          },
        })),
      ],
      invalid: [
        {
          code: `function replace(input) { return input.replace(/hello/g, 'hi'); }`,
          errors: [
            { message: 'Use `replaceAll()` with a string literal instead of this global regex.' },
          ],
          output: `function replace(input) { return input.replaceAll("hello", 'hi'); }`,
        },
        {
          code: `function replaceDot(input) { return input.replace(/[.]/g, '!'); }`,
          errors: [{ messageId: 'methodAndPattern' }],
          output: `function replaceDot(input) { return input.replaceAll(".", '!'); }`,
        },
        {
          code: `function replaceWord(input) { return input.replace(/(?:foo)/g, 'bar'); }`,
          errors: [{ messageId: 'methodAndPattern' }],
          output: `function replaceWord(input) { return input.replaceAll("foo", 'bar'); }`,
        },
        {
          code: `function replaceWrappedPrefix(input) { return input.replace(/(?:)foo/g, 'bar'); }`,
          errors: [{ messageId: 'methodAndPattern' }],
          output: `function replaceWrappedPrefix(input) { return input.replaceAll("foo", 'bar'); }`,
        },
        {
          code: `function replaceWrappedSuffix(input) { return input.replace(/foo(?:)/g, 'bar'); }`,
          errors: [{ messageId: 'methodAndPattern' }],
          output: `function replaceWrappedSuffix(input) { return input.replaceAll("foo", 'bar'); }`,
        },
        {
          code: String.raw`function replaceEllipsis(input) { return input.replace(/\.{3}/g, '…'); }`,
          errors: [{ messageId: 'methodAndPattern' }],
          output: String.raw`function replaceEllipsis(input) { return input.replaceAll("...", '…'); }`,
        },
        {
          code: `function replaceTriplet(input) { return input.replace(/a{3}/g, 'x'); }`,
          errors: [{ messageId: 'methodAndPattern' }],
          output: `function replaceTriplet(input) { return input.replaceAll("aaa", 'x'); }`,
        },
        {
          code: `function replaceRepeatedGroup(input) { return input.replace(/(?:ab){2}/g, 'x'); }`,
          errors: [{ messageId: 'methodAndPattern' }],
          output: `function replaceRepeatedGroup(input) { return input.replaceAll("abab", 'x'); }`,
        },
        {
          // Escape quotes, backslashes, control characters, and Unicode separators in the search string.
          code: String.raw`input.replace(/'"\\\n\r\t\u2028\u2029/g, '');`,
          errors: [{ messageId: 'methodAndPattern' }],
          output: String.raw`input.replaceAll("'\"\\\n\r\t\u2028\u2029", '');`,
        },
        {
          // A supplementary Unicode code point can safely become a complete surrogate pair in a string.
          code: String.raw`input.replace(/\u{1F600}/gu, '');`,
          errors: [{ messageId: 'methodAndPattern' }],
          output: `input.replaceAll("😀", '');`,
        },
        {
          // Without u or v, both the regex and string search can match a surrogate half.
          code: String.raw`input.replace(/\uD83D/g, 'x');`,
          errors: [{ messageId: 'methodAndPattern' }],
          output: String.raw`input.replaceAll("\ud83d", 'x');`,
        },
        {
          // With v, adjacent surrogate escapes form one code point and remain safe to convert.
          code: String.raw`input.replace(/\uD83D\uDE00/gv, 'x');`,
          languageOptions: {
            // The v flag requires ES2024.
            ecmaVersion: 2024,
          },
          errors: [{ messageId: 'methodAndPattern' }],
          output: `input.replaceAll("😀", 'x');`,
        },
        {
          // Retain a regex used elsewhere; the fix changes only the replacement method.
          code: `const marker = /TODO:/g;
marker.exec(source);
source.replace(marker, '');`,
          errors: [{ messageId: 'method' }],
          output: `const marker = /TODO:/g;
marker.exec(source);
source.replaceAll(marker, '');`,
        },
        {
          code: `input.replace(new RegExp('hello', 'g'), 'hi');`,
          errors: [{ messageId: 'method' }],
          output: `input.replaceAll(new RegExp('hello', 'g'), 'hi');`,
        },
        {
          // Existing replaceAll calls retain the upstream pattern message and fix.
          code: `input.replaceAll(/hello/g, 'hi');`,
          errors: [{ messageId: 'pattern', data: { replacement: "'hello'" } }],
          output: `input.replaceAll('hello', 'hi');`,
        },
        {
          code: String.raw`const whitespaceRegex = /\n {2}/g;
function normalizeIndentation(input) { return input.replace(whitespaceRegex, '\n'); }`,
          errors: [{ messageId: 'method' }],
          output: String.raw`const whitespaceRegex = /\n {2}/g;
function normalizeIndentation(input) { return input.replaceAll(whitespaceRegex, '\n'); }`,
        },
        {
          code: `const spaceRegex = / /g;
function trimSpaces(input) { return input.replace(spaceRegex, ''); }`,
          errors: [{ messageId: 'method' }],
          output: `const spaceRegex = / /g;
function trimSpaces(input) { return input.replaceAll(spaceRegex, ''); }`,
        },
      ],
    });
  });
});
