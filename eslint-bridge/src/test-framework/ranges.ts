/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

export class Range {
  constructor(
    readonly line: number,
    readonly column: number,
    readonly endLine: number,
    readonly endColumn: number,
  ) {
    if (endLine < line || (endLine == line && endColumn < column)) {
      throw new Error(`index out of bound: ${this.toString()}`);
    }
    if (line < 1 || column < 1 || (endLine != line && endColumn < 1)) {
      throw new Error(`index out of bound: ${this.toString()}`);
    }
  }

  compareTo(other: Range) {
    let diff = this.line - other.line;
    if (diff != 0) {
      return diff;
    }
    diff = this.column - other.column;
    if (diff != 0) {
      return diff;
    }
    diff = this.endLine - other.endLine;
    if (diff != 0) {
      return diff;
    }
    return this.endColumn - other.endColumn;
  }

  toString() {
    return `(${this.line}:${this.column},${this.endLine}:${this.endColumn})`;
  }
}
