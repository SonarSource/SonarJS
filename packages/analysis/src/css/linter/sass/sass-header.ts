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
  return new SassHeaderScanner(text).trailingComment();
}

/** Tracks lexical boundaries without interpreting Sass expression grammar. */
class SassHeaderScanner {
  private cursor = 0;
  private quote: string | undefined;
  private readonly delimiters: string[] = [];

  constructor(private readonly text: string) {}

  trailingComment(): number | undefined {
    while (this.cursor < this.text.length) {
      const character = this.text[this.cursor];
      if (character === '\\') {
        this.cursor += 2;
        continue;
      }
      if (this.quote) {
        if (character === this.quote) {
          this.quote = undefined;
        }
      } else if (character === '"' || character === "'") {
        this.quote = character;
      } else {
        const comment = this.scanCode(character);
        if (comment !== undefined) {
          return comment;
        }
      }
      this.cursor++;
    }
    return undefined;
  }

  private scanCode(character: string): number | undefined {
    const next = this.text[this.cursor + 1];
    if (character === '/' && next === '*') {
      const end = this.text.indexOf('*/', this.cursor + 2);
      this.cursor = end === -1 ? this.text.length : end + 1;
    } else if (this.isLineComment(character, next)) {
      return this.scanLineComment();
    } else if ('([{'.includes(character)) {
      const isUrl = character === '(' && /\burl$/i.test(this.text.slice(0, this.cursor));
      this.delimiters.push(isUrl ? 'url(' : character);
    } else if (')]}'.includes(character)) {
      this.delimiters.pop();
    }
    return undefined;
  }

  private isLineComment(character: string, next: string): boolean {
    return (
      character === '/' &&
      next === '/' &&
      this.text[this.cursor - 1] !== ':' &&
      !this.delimiters.includes('url(')
    );
  }

  private scanLineComment(): number | undefined {
    const newline = this.text.indexOf('\n', this.cursor + 2);
    const end = newline === -1 ? this.text.length : newline;
    if (this.delimiters.length === 0 && !this.text.slice(end).trim()) {
      return this.cursor;
    }
    this.cursor = end;
    return undefined;
  }
}
