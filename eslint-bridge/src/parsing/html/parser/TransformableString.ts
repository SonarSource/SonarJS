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
const lineEndingsRe = /\r\n|\r|\n/g;
function lineStarts(str: string) {
  const result = [0];
  lineEndingsRe.lastIndex = 0;
  while (true) {
    const match = lineEndingsRe.exec(str);
    if (!match) break;
    result.push(lineEndingsRe.lastIndex);
  }
  return result;
}

type Location = {
  line: number;
  column: number;
};

function locationToIndex(location: Location, lineStarts: number[]) {
  if (!location.line || location.line < 0 || !location.column || location.column < 0) {
    throw new Error('Invalid location');
  }
  return lineStarts[location.line - 1] + location.column - 1;
}

function indexToLocation(index: number, lineStarts: number[]) {
  if (index < 0) throw new Error('Invalid index');

  let line = 0;
  while (line + 1 < lineStarts.length && lineStarts[line + 1] <= index) {
    line += 1;
  }

  return {
    line: line + 1,
    column: index - lineStarts[line] + 1,
  };
}

export class TransformableString {
  _original: string;
  _blocks: any[];
  _lineStarts: number[];
  _cache: any;

  constructor(original: string) {
    this._original = original;
    this._blocks = [];
    this._lineStarts = lineStarts(original);
    this._cache = null;
  }

  _compute() {
    if (!this._cache) {
      let result = '';
      let index = 0;
      for (const block of this._blocks) {
        result += this._original.slice(index, block.from) + block.str;
        index = block.to;
      }
      result += this._original.slice(index);
      this._cache = {
        lineStarts: lineStarts(result),
        result,
      };
    }
    return this._cache;
  }

  getOriginalLine(n) {
    if (n < 1 || n > this._lineStarts.length) {
      throw new Error('Invalid line number');
    }
    return this._original
      .slice(this._lineStarts[n - 1], this._lineStarts[n])
      .replace(lineEndingsRe, '');
  }

  toString() {
    return this._compute().result;
  }

  replace(from: number, to: number, str: string) {
    this._cache = null;
    if (from > to || from < 0 || to > this._original.length) {
      throw new Error('Invalid slice indexes');
    }
    const newBlock = { from, to, str };
    if (!this._blocks.length || this._blocks[this._blocks.length - 1].to <= from) {
      this._blocks.push(newBlock);
    } else {
      const index = this._blocks.findIndex(other => other.to > from);
      if (this._blocks[index].from < to) throw new Error("Can't replace slice");
      this._blocks.splice(index, 0, newBlock);
    }
  }

  originalIndex(index: number) {
    let block;
    for (block of this._blocks) {
      if (index < block.from) break;

      if (index < block.from + block.str.length) {
        return;
      } else {
        index += block.to - block.from - block.str.length;
      }
    }
    if (index < 0 || index > this._original.length) {
      throw new Error('Invalid index');
    }
    if (index == this._original.length) {
      if (block.to && block.to === this._original.length) {
        return block.from + block.str.length;
      }
      return this._original.length;
    }
    return index;
  }

  originalLocation(location: Location) {
    const index = locationToIndex(location, this._compute().lineStarts);
    const originalIndex = this.originalIndex(index);
    if (originalIndex !== undefined) {
      return indexToLocation(originalIndex, this._lineStarts);
    }
  }
}
