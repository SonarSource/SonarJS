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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import {
  type StringLiteralToken,
  tokenizeString,
} from '../../../../src/rules/helpers/regex/tokenizer.js';

describe('tokenizeString', () => {
  it('should tokenize strings', () => {
    expect(tokenizeString('abc')).toStrictEqual([t('a', [0, 1]), t('b', [1, 2]), t('c', [2, 3])]);
    expect(tokenizeString(String.raw`\n`)).toStrictEqual([t('\n', [0, 2])]);
    expect(tokenizeString(String.raw`\r`)).toStrictEqual([t('\r', [0, 2])]);
    expect(tokenizeString(String.raw`\t`)).toStrictEqual([t('\t', [0, 2])]);
    expect(tokenizeString(String.raw`\b`)).toStrictEqual([t('\b', [0, 2])]);
    expect(tokenizeString(String.raw`\v`)).toStrictEqual([t('\v', [0, 2])]);
    expect(tokenizeString(String.raw`\f`)).toStrictEqual([t('\f', [0, 2])]);
    expect(tokenizeString('\\\\')).toStrictEqual([t('\\', [0, 2])]);
    expect(tokenizeString(String.raw`\a`)).toStrictEqual([t('a', [0, 2])]);
    expect(tokenizeString(String.raw`a\nb`)).toStrictEqual([
      t('a', [0, 1]),
      t('\n', [1, 3]),
      t('b', [3, 4]),
    ]);
    expect(tokenizeString(String.raw`a\n\r\t\b\v\fx`)).toStrictEqual([
      t('a', [0, 1]),
      t('\n', [1, 3]),
      t('\r', [3, 5]),
      t('\t', [5, 7]),
      t('\b', [7, 9]),
      t('\v', [9, 11]),
      t('\f', [11, 13]),
      t('x', [13, 14]),
    ]);
  });

  it('should support unicode escapes', () => {
    expect(tokenizeString(String.raw`\u0061`)).toStrictEqual([t('a', [0, 6])]);
    expect(tokenizeString(String.raw`x\u0061y`)).toStrictEqual([
      t('x', [0, 1]),
      t('a', [1, 7]),
      t('y', [7, 8]),
    ]);
    expect(tokenizeString(String.raw`\u{0061}`)).toStrictEqual([t('a', [0, 8])]);
    expect(tokenizeString(String.raw`\u{61}`)).toStrictEqual([t('a', [0, 6])]);
    expect(tokenizeString(String.raw`\u{00000061}`)).toStrictEqual([t('a', [0, 12])]);
    expect(tokenizeString(String.raw`\u{00000061}x`)).toStrictEqual([
      t('a', [0, 12]),
      t('x', [12, 13]),
    ]);

    expect(tokenizeString('\uD800\uDC00')).toStrictEqual([t('𐀀', [0, 2])]);
  });

  it('should support hex escapes', () => {
    expect(tokenizeString(String.raw`\xa9`)).toStrictEqual([t('©', [0, 4])]);
    expect(tokenizeString(String.raw`\xA9`)).toStrictEqual([t('©', [0, 4])]);
  });

  it('should support octal escapes', () => {
    expect(tokenizeString(String.raw`\251`)).toStrictEqual([t('©', [0, 4])]);
    expect(tokenizeString(String.raw`\10`)).toStrictEqual([t('\b', [0, 3])]);
    expect(tokenizeString(String.raw`\1`)).toStrictEqual([t('\x01', [0, 2])]);
    expect(tokenizeString(String.raw`\01`)).toStrictEqual([t('\x01', [0, 3])]);
    expect(tokenizeString(String.raw`\001`)).toStrictEqual([t('\x01', [0, 4])]);
    expect(tokenizeString(String.raw`\0012`)).toStrictEqual([t('\x01', [0, 4]), t('2', [4, 5])]);
  });

  it('should parse null character', () => {
    expect(tokenizeString(String.raw`\0`)).toStrictEqual([t('\0', [0, 2])]);
    expect(tokenizeString(String.raw`\00`)).toStrictEqual([t('\0', [0, 3])]);
    expect(tokenizeString(String.raw`\000`)).toStrictEqual([t('\0', [0, 4])]);
    expect(tokenizeString(String.raw`\0000`)).toStrictEqual([t('\0', [0, 4]), t('0', [4, 5])]);
  });

  it('should parse line continuation', () => {
    // range for 'b' is wrong, correct implementation would complicate the algorithm
    expect(tokenizeString('a\\\nb')).toStrictEqual([t('a', [0, 1]), t('b', [3, 4])]);
    expect(tokenizeString('a\\\rb')).toStrictEqual([t('a', [0, 1]), t('b', [3, 4])]);
    expect(tokenizeString('a\\\r\nb')).toStrictEqual([t('a', [0, 1]), t('b', [4, 5])]);
  });
});

function t(s: string, r: [number, number]): StringLiteralToken {
  return { value: s, range: r };
}
