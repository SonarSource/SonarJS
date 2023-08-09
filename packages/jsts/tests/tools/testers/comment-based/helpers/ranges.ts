/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
  ) {}

  toLocationHolder() {
    return {
      loc: {
        start: { line: this.line, column: this.column },
        end: { line: this.endLine, column: this.endColumn },
      },
    };
  }

  toString() {
    return `(${this.line}:${this.column},${this.endLine}:${this.endColumn})`;
  }
}
