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
      ],
      invalid: [
        {
          code: `function replace(input) { return input.replace(/hello/g, 'hi'); }`,
          errors: [{ messageId: 'method' }],
          output: `function replace(input) { return input.replaceAll('hello', 'hi'); }`,
        },
        {
          code: `function replaceDot(input) { return input.replace(/[.]/g, '!'); }`,
          errors: [{ messageId: 'method' }],
          output: `function replaceDot(input) { return input.replaceAll(/[.]/g, '!'); }`,
        },
        {
          code: `function replaceWord(input) { return input.replace(/(?:foo)/g, 'bar'); }`,
          errors: [{ messageId: 'method' }],
          output: `function replaceWord(input) { return input.replaceAll(/(?:foo)/g, 'bar'); }`,
        },
        {
          code: `function replaceWrappedPrefix(input) { return input.replace(/(?:)foo/g, 'bar'); }`,
          errors: [{ messageId: 'method' }],
          output: `function replaceWrappedPrefix(input) { return input.replaceAll(/(?:)foo/g, 'bar'); }`,
        },
        {
          code: `function replaceWrappedSuffix(input) { return input.replace(/foo(?:)/g, 'bar'); }`,
          errors: [{ messageId: 'method' }],
          output: `function replaceWrappedSuffix(input) { return input.replaceAll(/foo(?:)/g, 'bar'); }`,
        },
        {
          code: String.raw`function replaceEllipsis(input) { return input.replace(/\.{3}/g, '…'); }`,
          errors: [{ messageId: 'method' }],
          output: String.raw`function replaceEllipsis(input) { return input.replaceAll(/\.{3}/g, '…'); }`,
        },
        {
          code: `function replaceTriplet(input) { return input.replace(/a{3}/g, 'x'); }`,
          errors: [{ messageId: 'method' }],
          output: `function replaceTriplet(input) { return input.replaceAll(/a{3}/g, 'x'); }`,
        },
        {
          code: `function replaceRepeatedGroup(input) { return input.replace(/(?:ab){2}/g, 'x'); }`,
          errors: [{ messageId: 'method' }],
          output: `function replaceRepeatedGroup(input) { return input.replaceAll(/(?:ab){2}/g, 'x'); }`,
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
