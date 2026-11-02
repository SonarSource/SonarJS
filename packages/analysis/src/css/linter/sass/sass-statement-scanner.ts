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
import type { Input } from 'postcss';
import type { SassLine, SassStatement } from './sass-statement.js';
import {
  continuesOnNewline,
  initialStatementType,
  isDeclarationSeparator,
  isDeclarationCandidate,
} from './sass-statement-rules.js';

const LINE_COMMENT = 'line-comment';
const BLOCK_COMMENT = 'block-comment';

type ScannerMode =
  | { kind: 'code' }
  | { kind: 'string'; quote: '"' | "'" }
  | { kind: typeof LINE_COMMENT; start: number }
  | { kind: typeof BLOCK_COMMENT };

type OpeningDelimiter = '(' | '[' | '{' | 'url(';
const closingDelimiters: Record<OpeningDelimiter, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  'url(': ')',
};
const openingDelimiters: Record<string, OpeningDelimiter> = { ')': '(', ']': '[', '}': '{' };

/** A single lexical pass classifies the header and finds its boundary. No tree is built here. */
class HeaderScanner {
  private mode: ScannerMode = { kind: 'code' };
  private readonly delimiters: OpeningDelimiter[] = [];
  private readonly start: number;
  private readonly firstLine: string;
  private type: SassStatement['type'];
  private cursor: number;
  private end: number;
  private trailingComment: number | undefined;
  private declarationCandidate: number | undefined;

  constructor(
    private readonly input: Input,
    private readonly line: SassLine,
  ) {
    this.start = line.start + line.indent.length;
    this.firstLine = input.css.slice(this.start, line.end);
    this.type = initialStatementType(this.firstLine);
    this.cursor = this.end = this.start;
  }

  scan(): { statement: SassStatement; next: number } {
    while (this.cursor < this.input.css.length) {
      const character = this.input.css[this.cursor];
      const next = this.input.css[this.cursor + 1];
      if (character === '\n' || (character === '\r' && next !== '\n')) {
        if (!this.scanNewline()) {
          return this.result(this.cursor + 1);
        }
      } else {
        if (character !== '\r' && !/\s/.test(character)) {
          this.end = this.cursor + 1;
        }
        switch (this.mode.kind) {
          case 'code':
            this.scanCode(character, next);
            break;
          case 'string':
            this.scanString(character, this.mode.quote);
            break;
          case BLOCK_COMMENT:
            this.scanBlockComment(character, next);
            break;
          case LINE_COMMENT:
            // All characters are comment text until scanNewline() ends this mode.
            break;
        }
      }
      this.cursor++;
    }
    this.validateEnd();
    return this.result(this.input.css.length);
  }

  private scanCode(character: string, next: string | undefined): void {
    if (character === '\\') {
      this.skipEscape();
      return;
    }
    if (character === '"' || character === "'") {
      this.mode = { kind: 'string', quote: character };
      return;
    }
    if (character === '/' && next === '*') {
      this.mode = { kind: BLOCK_COMMENT };
      this.cursor++;
      return;
    }
    if (character === '/' && next === '/' && this.startsLineComment()) {
      this.mode = { kind: LINE_COMMENT, start: this.cursor };
      if (this.delimiters.length === 0) {
        this.trailingComment = this.cursor;
      }
      this.cursor++;
      this.end = this.cursor + 1;
      return;
    }
    if ('([{'.includes(character)) {
      this.openDelimiter(character as '(' | '[' | '{');
      return;
    }
    if (')]}'.includes(character)) {
      this.closeDelimiter(character);
      return;
    }
    if (
      this.type === 'rule' &&
      character === ':' &&
      this.delimiters.length === 0 &&
      this.cursor < this.line.end
    ) {
      const colon = this.cursor - this.start;
      if (isDeclarationSeparator(this.firstLine, colon)) {
        this.type = 'decl';
      } else if (isDeclarationCandidate(this.firstLine, colon)) {
        this.declarationCandidate ??= this.cursor;
      }
    }
  }

  private scanString(character: string, quote: '"' | "'"): void {
    if (character === '\\') {
      this.skipEscape();
    } else if (character === quote) {
      this.mode = { kind: 'code' };
    }
  }

  private scanBlockComment(character: string, next: string | undefined): void {
    if (character === '*' && next === '/') {
      this.mode = { kind: 'code' };
      this.cursor++;
      this.end = this.cursor + 1;
    }
  }

  private scanNewline(): boolean {
    if (this.mode.kind === 'string') {
      throw this.input.error('Unclosed string.', this.cursor);
    }
    const codeEnd = this.mode.kind === LINE_COMMENT ? this.mode.start : this.end;
    const continued =
      this.mode.kind === BLOCK_COMMENT ||
      this.delimiters.length > 0 ||
      continuesOnNewline(this.type, this.firstLine, this.input.css.slice(this.start, codeEnd));
    if (continued) {
      if (this.mode.kind === LINE_COMMENT) {
        this.mode = { kind: 'code' };
      }
      this.trailingComment = undefined;
    }
    return continued;
  }

  private skipEscape(): void {
    const next = this.input.css[this.cursor + 1];
    if (next !== undefined) {
      this.cursor += next === '\r' && this.input.css[this.cursor + 2] === '\n' ? 2 : 1;
      this.end = this.cursor + 1;
    }
  }

  private startsLineComment(): boolean {
    // Unquoted URLs may contain // without starting a Sass comment.
    return this.input.css[this.cursor - 1] !== ':' && !this.delimiters.includes('url(');
  }

  private openDelimiter(character: '(' | '[' | '{'): void {
    const url =
      character === '(' &&
      /\burl$/i.test(this.input.css.slice(Math.max(this.start, this.cursor - 4), this.cursor));
    this.delimiters.push(url ? 'url(' : character);
  }

  private closeDelimiter(character: string): void {
    const opening = this.delimiters.pop();
    if (opening !== openingDelimiters[character] && !(opening === 'url(' && character === ')')) {
      throw this.input.error(`Unexpected "${character}".`, this.cursor);
    }
  }

  private validateEnd(): void {
    if (this.mode.kind === BLOCK_COMMENT) {
      throw this.input.error('Unclosed comment.', this.end);
    }
    if (this.mode.kind === 'string') {
      throw this.input.error('Unclosed string.', this.end);
    }
    const opening = this.delimiters.at(-1);
    if (opening) {
      throw this.input.error(`expected "${closingDelimiters[opening]}".`, this.end);
    }
  }

  private result(next: number): { statement: SassStatement; next: number } {
    return {
      statement: {
        type: this.type,
        start: this.start,
        end: this.end,
        headerEnd: this.end,
        trailingComment: this.trailingComment,
        declarationCandidate: this.declarationCandidate,
      },
      next,
    };
  }
}

/** Reads logical statements, including indented comments and headers spanning physical lines. */
export class SassStatementScanner {
  private offset = 0;

  constructor(private readonly input: Input) {}

  /** Skip blank lines. The parser can validate indentation before consuming this statement. */
  peekLine(): SassLine | undefined {
    while (this.offset < this.input.css.length) {
      const line = this.line(this.offset);
      if (line.start + line.indent.length !== line.end) {
        return line;
      }
      this.offset = line.next;
    }
    return undefined;
  }

  readStatement(line: SassLine): SassStatement {
    const start = line.start + line.indent.length;
    const text = this.input.css.slice(start, line.end);
    if (text.startsWith('//') || text.startsWith('/*')) {
      return this.readComment(line, text.startsWith('//'));
    }
    const { statement, next } = new HeaderScanner(this.input, line).scan();
    this.offset = next;
    return statement;
  }

  private readComment(line: SassLine, inline: boolean): SassStatement {
    const start = line.start + line.indent.length;
    let { end, next } = line;
    // Unclosed /* and // comments include indented continuation lines; a closed /* ends here.
    const closed = !inline && this.input.css.slice(start, end).includes('*/');
    while (!closed && next < this.input.css.length) {
      const continuation = this.line(next);
      if (continuation.start + continuation.indent.length === continuation.end) {
        next = continuation.next;
        continue;
      }
      if (continuation.indent.length <= line.indent.length) {
        break;
      }
      end = continuation.end;
      next = continuation.next;
      if (!inline && this.input.css.slice(continuation.start, end).includes('*/')) {
        break;
      }
    }
    this.offset = next;
    end = start + this.input.css.slice(start, end).trimEnd().length;
    return { type: 'comment', start, end, headerEnd: end, inline };
  }

  private line(start: number): SassLine {
    const css = this.input.css;
    const newline = css.indexOf('\n', start);
    const next = newline === -1 ? css.length : newline + 1;
    const end = newline === -1 ? css.length : newline - Number(css[newline - 1] === '\r');
    const indent = /^[\t ]*/.exec(css.slice(start, end))?.[0] ?? '';
    return { start, end, next, indent };
  }
}
