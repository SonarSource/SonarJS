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
import { parseRegExpLiteral } from '@eslint-community/regexpp';
import { strictEqual } from 'node:assert';
import { describe, it } from 'node:test';
import { isSubsetOfCharacterRange } from '../../../../../src/jsts/rules/helpers/regex/character-class.js';

describe('isSubsetOfCharacterRange', () => {
  const cases = [
    {
      name: 'includes literal boundaries',
      source: '/a/',
      minimum: 0x61,
      maximum: 0x61,
      expected: true,
    },
    {
      name: 'rejects an outside literal',
      source: '/b/',
      minimum: 0x61,
      maximum: 0x61,
      expected: false,
    },
    {
      name: 'includes positive ranges',
      source: '/[a-cx]/',
      minimum: 0x61,
      maximum: 0x7a,
      expected: true,
    },
    {
      name: 'rejects an outside range',
      source: '/[a-z]/',
      minimum: 0x61,
      maximum: 0x79,
      expected: false,
    },
    { name: 'rejects empty classes', source: '/[]/', minimum: 0, maximum: 0xffff, expected: false },
    {
      name: 'rejects unknown character sets',
      source: String.raw`/\d/`,
      minimum: 0x30,
      maximum: 0x39,
      expected: false,
    },
    {
      name: 'rejects sets inside classes',
      source: String.raw`/[\d]/`,
      minimum: 0x30,
      maximum: 0x39,
      expected: false,
    },
    {
      name: 'covers both outside intervals',
      source: String.raw`/[^\x00-\x2f\x3a-\uffff]/`,
      minimum: 0x30,
      maximum: 0x39,
      maximumCodePoint: 0xffff,
      expected: true,
    },
    {
      name: 'rejects a lower gap',
      source: String.raw`/[^\x01-\x2f\x3a-\uffff]/`,
      minimum: 0x30,
      maximum: 0x39,
      maximumCodePoint: 0xffff,
      expected: false,
    },
    {
      name: 'rejects an upper gap',
      source: String.raw`/[^\x00-\x2f\x3b-\uffff]/`,
      minimum: 0x30,
      maximum: 0x39,
      maximumCodePoint: 0xffff,
      expected: false,
    },
    {
      name: 'merges adjacent exclusions',
      source: String.raw`/[^\x00-\x1f\x20-\x2f\x3a-\uffff]/`,
      minimum: 0x30,
      maximum: 0x39,
      maximumCodePoint: 0xffff,
      expected: true,
    },
    {
      name: 'merges overlapping exclusions',
      source: String.raw`/[^\x10-\x2f\x00-\x1f\x3a-\uffff]/`,
      minimum: 0x30,
      maximum: 0x39,
      maximumCodePoint: 0xffff,
      expected: true,
    },
    {
      name: 'accepts an empty lower interval',
      source: String.raw`/[^\x3a-\uffff]/`,
      minimum: 0,
      maximum: 0x39,
      maximumCodePoint: 0xffff,
      expected: true,
    },
    {
      name: 'accepts an empty upper interval',
      source: String.raw`/[^\x00-\x2f]/`,
      minimum: 0x30,
      maximum: 0xffff,
      maximumCodePoint: 0xffff,
      expected: true,
    },
    {
      name: 'accepts two empty outside intervals',
      source: '/[^a]/',
      minimum: 0,
      maximum: 0xffff,
      maximumCodePoint: 0xffff,
      expected: true,
    },
    {
      name: 'rejects astral matches outside BMP exclusions',
      source: String.raw`/[^\x00-\x2f\x3a-\uffff]/u`,
      minimum: 0x30,
      maximum: 0x39,
      expected: false,
    },
    {
      name: 'uses the default Unicode universe',
      source: String.raw`/[^\x00-\x2f\x3a-\u{10ffff}]/u`,
      minimum: 0x30,
      maximum: 0x39,
      expected: true,
    },
  ];
  for (const { name, source, minimum, maximum, maximumCodePoint, expected } of cases) {
    it(name, () => {
      const element = parseRegExpLiteral(source).pattern.alternatives[0].elements[0];
      strictEqual(isSubsetOfCharacterRange(element, minimum, maximum, maximumCodePoint), expected);
    });
  }
});
