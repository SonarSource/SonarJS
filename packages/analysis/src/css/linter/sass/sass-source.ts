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
import { Input } from 'postcss';
import assert from 'node:assert';

/** Dedent embedded styles for Dart Sass, keeping a mapping to the original source. */
export class SassSource {
  readonly code: string;
  private readonly parsedInput: Input;
  private readonly lineOffsets: number[] = [];
  private readonly removedIndent: number[] = [];

  constructor(
    readonly input: Input,
    embedded: boolean,
  ) {
    const baseIndent = embedded ? (/^(?:[\t ]*\r?\n)*([\t ]*)\S/.exec(input.css)?.[1] ?? '') : '';
    let offset = 0;
    this.code = input.css
      .split('\n')
      .map(line => {
        this.lineOffsets.push(offset);
        offset += line.length + 1;
        const removed = line.startsWith(baseIndent) ? baseIndent.length : 0;
        this.removedIndent.push(removed);
        return line.slice(removed);
      })
      .join('\n');
    this.parsedInput = new Input(this.code);
  }

  originalOffset(offset: number): number {
    const position = this.parsedInput.fromOffset(offset);
    assert.ok(position, 'A parsed source offset must resolve to a position.');
    const { line, col } = position;
    return this.lineOffsets[line - 1] + this.originalColumn(line, col) - 1;
  }

  originalColumn(line: number, column: number): number {
    return column + (this.removedIndent[line - 1] ?? 0);
  }
}
