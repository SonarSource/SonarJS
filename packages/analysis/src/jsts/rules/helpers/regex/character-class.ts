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
import type { AST } from '@eslint-community/regexpp';

const MAX_CODE_POINT = 0x10ffff;

/**
 * Proves that a literal or simple character class stays within a code point range.
 * Callers must exclude case folding. Unknown character-set forms return false.
 */
export function isSubsetOfCharacterRange(
  element: AST.Element,
  minimum: number,
  maximum: number,
  maximumCodePoint = MAX_CODE_POINT,
): boolean {
  if (element.type === 'Character') {
    return minimum <= element.value && element.value <= maximum;
  }
  if (element.type !== 'CharacterClass' || element.elements.length === 0) {
    return false;
  }
  const ranges: { minimum: number; maximum: number }[] = [];
  for (const item of element.elements) {
    if (item.type === 'Character') {
      ranges.push({ minimum: item.value, maximum: item.value });
    } else if (item.type === 'CharacterClassRange') {
      ranges.push({ minimum: item.min.value, maximum: item.max.value });
    } else {
      return false;
    }
  }
  if (!element.negate) {
    return ranges.every(range => minimum <= range.minimum && range.maximum <= maximum);
  }
  const covers = (from: number, to: number) => {
    if (from > to) {
      return true;
    }
    let next = from;
    for (const range of [...ranges].sort((left, right) => left.minimum - right.minimum)) {
      if (range.minimum > next) {
        break;
      }
      next = Math.max(next, range.maximum + 1);
      if (next > to) {
        return true;
      }
    }
    return false;
  };
  return covers(0, minimum - 1) && covers(maximum + 1, maximumCodePoint);
}
