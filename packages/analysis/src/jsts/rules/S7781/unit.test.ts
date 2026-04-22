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
          code: `function normalize(input) { return input.replace(/[{}\\s]/g, ''); }`,
          errors: [{ messageId: 'method' }],
        },
        {
          code: `function compact(input) { return input.replace(/\\s+/g, ''); }`,
          errors: [{ messageId: 'method' }],
        },
        {
          code: `function normalize(input) { return input.replace(/[^a-zA-Z0-9]+/g, ' '); }`,
          errors: [{ messageId: 'method' }],
        },
        {
          code: `function replace(input) { return input.replace(/foo/ig, 'bar'); }`,
          errors: [{ messageId: 'method' }],
        },
        {
          code: `function replace(input) { return input.replace(/(foo)/g, '$1'); }`,
          errors: [{ messageId: 'method' }],
        },
        {
          code: `function replace(input) { return input.replace(/(foo)/g, part => part.toUpperCase()); }`,
          errors: [{ messageId: 'method' }],
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
          code: `function normalizeParameterName(input) { return input.replace(/[{}\\s]/g, ''); }`,
        },
        {
          // Compliant: quantified whitespace
          code: `function collapseWhitespace(input) { return input.replace(/\\s+/g, ''); }`,
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
        },
        {
          code: `function replaceDot(input) { return input.replace(/[.]/g, '!'); }`,
          errors: [{ messageId: 'method' }],
        },
        {
          code: `function replaceWord(input) { return input.replace(/(?:foo)/g, 'bar'); }`,
          errors: [{ messageId: 'method' }],
        },
        {
          code: `function replaceWrappedPrefix(input) { return input.replace(/(?:)foo/g, 'bar'); }`,
          errors: [{ messageId: 'method' }],
        },
        {
          code: `function replaceWrappedSuffix(input) { return input.replace(/foo(?:)/g, 'bar'); }`,
          errors: [{ messageId: 'method' }],
        },
      ],
    });
  });
});
