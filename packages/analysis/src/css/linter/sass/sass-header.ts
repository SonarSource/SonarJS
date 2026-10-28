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

/** Locate a trailing statement comment, excluding strings, URLs and expression comments. */
export function trailingComment(text: string): number | undefined {
  let quote: string | undefined;
  const delimiters: string[] = [];
  for (let cursor = 0; cursor < text.length; cursor++) {
    const character = text[cursor];
    const next = text[cursor + 1];
    if (character === '\\') {
      cursor++;
    } else if (quote) {
      if (character === quote) quote = undefined;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '/' && next === '*') {
      const end = text.indexOf('*/', cursor + 2);
      cursor = end === -1 ? text.length : end + 1;
    } else if (
      character === '/' &&
      next === '/' &&
      text[cursor - 1] !== ':' &&
      !delimiters.includes('url(')
    ) {
      const newline = text.indexOf('\n', cursor + 2);
      const end = newline === -1 ? text.length : newline;
      if (delimiters.length === 0 && !text.slice(end).trim()) return cursor;
      cursor = end;
    } else if ('([{'.includes(character)) {
      delimiters.push(
        character === '(' && /\burl$/i.test(text.slice(0, cursor)) ? 'url(' : character,
      );
    } else if (')]}'.includes(character)) {
      delimiters.pop();
    }
  }
  return undefined;
}
