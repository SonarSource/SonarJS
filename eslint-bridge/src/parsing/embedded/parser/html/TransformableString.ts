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

// Inspired from https://github.com/BenoitZugmeyer/eslint-plugin-html/blob/12047e752d3f0904541e37ad7ffacde6149e2388/src/TransformableString.js

const lineEndingsRe = /\r\n|\r|\n/g;

/**
 * Computes the line start offsets for the provided string
 *
 * @param str
 * @returns
 */
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

/**
 * Block of characters containing not JS code
 *
 * @param from the start offset
 * @param to the end offset
 * @param str the characters that are between 'from' and 'to'
 */
type NonJsBlock = {
  from: number;
  to: number;
  str: string;
};

/**
 * JS code and line start offsets in the reference of JS
 *
 * @param lineStarts the line start offsets in the reference of the JS snippet
 * @param result the JS code
 */
type JsCode = {
  lineStarts: number[];
  result: string;
};

export class TransformableString {
  _original: string;
  _blocks: NonJsBlock[];
  _lineStarts: number[];
  _cache?: JsCode | null;

  constructor(original: string) {
    this._original = original;
    this._blocks = [];
    this._lineStarts = lineStarts(original);
    this._cache = null;
  }

  /**
   * Computes JsCode saves it in this._cache and returns it
   */
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

  /**
   * Returns the JS code as string
   */
  toString() {
    return this._compute().result;
  }

  /**
   * Replaces - i don't know what yet.
   * Resets this._cache
   */
  replace(from: number, to: number, str: string) {
    this._cache = null;
    if (from > to || from < 0 || to > this._original.length) {
      throw new Error('Invalid slice indexes');
    }
    const newBlock = { from, to, str };
    if (this._blocks.length === 0 || this._blocks[this._blocks.length - 1].to <= from) {
      this._blocks.push(newBlock);
    } else {
      const index = this._blocks.findIndex(other => other.to > from);
      if (this._blocks[index].from < to) throw new Error("Can't replace slice");
      this._blocks.splice(index, 0, newBlock);
    }
  }
}
