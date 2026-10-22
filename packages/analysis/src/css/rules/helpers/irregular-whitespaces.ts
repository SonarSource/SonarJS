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
// https://sonarsource.github.io/rspec/#/rspec/S9451/css
import { replaceInvisibleCharacters } from '../../helpers/invisible-characters.js';

// Characters that look like a space, or are invisible, but that CSS does not treat as whitespace
export const IRREGULAR_WHITESPACES = new Map([
  ['\u000B', 'U+000B LINE TABULATION'],
  ['\u0085', 'U+0085 NEXT LINE'],
  ['\u00A0', 'U+00A0 NO-BREAK SPACE'],
  ['\u1680', 'U+1680 OGHAM SPACE MARK'],
  ['\u180E', 'U+180E MONGOLIAN VOWEL SEPARATOR'],
  ['\u2000', 'U+2000 EN QUAD'],
  ['\u2001', 'U+2001 EM QUAD'],
  ['\u2002', 'U+2002 EN SPACE'],
  ['\u2003', 'U+2003 EM SPACE'],
  ['\u2004', 'U+2004 THREE-PER-EM SPACE'],
  ['\u2005', 'U+2005 FOUR-PER-EM SPACE'],
  ['\u2006', 'U+2006 SIX-PER-EM SPACE'],
  ['\u2007', 'U+2007 FIGURE SPACE'],
  ['\u2008', 'U+2008 PUNCTUATION SPACE'],
  ['\u2009', 'U+2009 THIN SPACE'],
  ['\u200A', 'U+200A HAIR SPACE'],
  ['\u200B', 'U+200B ZERO WIDTH SPACE'],
  ['\u2028', 'U+2028 LINE SEPARATOR'],
  ['\u2029', 'U+2029 PARAGRAPH SEPARATOR'],
  ['\u202F', 'U+202F NARROW NO-BREAK SPACE'],
  ['\u205F', 'U+205F MEDIUM MATHEMATICAL SPACE'],
  ['\u3000', 'U+3000 IDEOGRAPHIC SPACE'],
  ['\uFEFF', 'U+FEFF ZERO WIDTH NO-BREAK SPACE'],
]);

const IRREGULAR_WHITESPACE = new RegExp(`[${[...IRREGULAR_WHITESPACES.keys()].join('')}]`, 'g');

/**
 * Replaces each irregular whitespace with a space, which keeps every location in the text.
 */
function replaceIrregularWhitespaces(text: string): string {
  return text.replaceAll(IRREGULAR_WHITESPACE, ' ');
}

/**
 * Replaces irregular whitespaces such as U+00A0, and the invisible characters from U+2000 to
 * U+200F such as U+200C, with spaces, leaving their report to S9451.
 */
export function asSpaces(text: string): string {
  return replaceInvisibleCharacters(replaceIrregularWhitespaces(text));
}
