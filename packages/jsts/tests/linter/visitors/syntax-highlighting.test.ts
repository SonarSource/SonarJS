/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import {
  getSyntaxHighlighting,
  SyntaxHighlight,
  TextType,
} from '../../../src/linter/visitors/syntax-highlighting.js';
import path from 'path';
import { parseTypeScriptSourceFile } from '../../tools/helpers/index.js';

describe('getSyntaxHighlighting', () => {
  it('should highlight keywords', async () => {
    expect(await highlighting('keyword.js')).toEqual(
      expect.arrayContaining([
        highlight(1, 0, 1, 5, 'KEYWORD'), // class
        highlight(3, 4, 3, 10, 'KEYWORD'), // return
        highlight(3, 11, 3, 15, 'KEYWORD'), // this
        highlight(5, 2, 5, 8, 'KEYWORD'), // static
        highlight(6, 4, 6, 6, 'KEYWORD'), // if
      ]),
    );
  });

  it('should highlight comments', async () => {
    expect(await highlighting('comment.js')).toEqual([
      highlight(1, 2, 1, 13, 'COMMENT'), // 1
      highlight(2, 0, 2, 12, 'COMMENT'), // 2
      highlight(3, 0, 3, 11, 'COMMENT'), // 3
      highlight(4, 2, 4, 13, 'COMMENT'), // 4
      highlight(5, 0, 7, 3, 'STRUCTURED_COMMENT'), // 5
      highlight(9, 0, 9, 11, 'COMMENT'), // 6
    ]);
  });

  it('should highlight strings', async () => {
    expect(await highlighting('string.js')).toEqual(
      expect.arrayContaining([
        highlight(1, 0, 1, 5, 'STRING'), // 'str'
        highlight(2, 0, 2, 5, 'STRING'), // "str"
        highlight(3, 0, 3, 5, 'STRING'), // `str`
        highlight(4, 0, 4, 14, 'STRING'), // `line1\nline2`
        highlight(5, 0, 5, 9, 'STRING'), // start
        highlight(5, 10, 5, 21, 'STRING'), // middle
        highlight(5, 22, 5, 28, 'STRING'), // end
        highlight(6, 13, 6, 15, 'CONSTANT'), // 42
      ]),
    );
  });

  it('should highlight numbers', async () => {
    expect(await highlighting('number.js')).toEqual(
      expect.arrayContaining([
        highlight(1, 0, 1, 1, 'CONSTANT'), // 0
        highlight(2, 0, 2, 3, 'CONSTANT'), // 0.0
        highlight(3, 1, 3, 4, 'CONSTANT'), // -0.0
        highlight(4, 0, 4, 5, 'CONSTANT'), // 10e-2
      ]),
    );
  });

  it('should highlight regex literals', async () => {
    expect(await highlighting('regex.js')).toEqual([
      highlight(1, 0, 1, 3, 'STRING'), // /x/
      highlight(2, 0, 2, 6, 'STRING'), // /42/gu
    ]);
  });

  it('should highlight Vue templates', async () => {
    expect(await highlighting('template.vue')).toEqual(
      expect.arrayContaining([
        highlight(1, 0, 1, 9, 'KEYWORD'), // <template
        highlight(1, 9, 1, 10, 'KEYWORD'), // >
        highlight(2, 2, 2, 12, 'STRUCTURED_COMMENT'), // <!DOCTYPE>
        highlight(3, 2, 3, 18, 'COMMENT'), // <!-- comment >
        highlight(4, 2, 4, 6, 'KEYWORD'), // <tag
        highlight(5, 12, 5, 13, 'STRING'), // 5
        highlight(6, 12, 6, 19, 'STRING'), // "value"
        highlight(7, 0, 7, 10, 'KEYWORD'), // </template
      ]),
    );
  });

  it('should highlight TypeScript-specific keywords', async () => {
    expect(await highlighting('typescript.ts')).toEqual(
      expect.arrayContaining([
        highlight(1, 0, 1, 4, 'KEYWORD'), // type
        highlight(2, 3, 2, 5, 'KEYWORD'), // as
        highlight(4, 2, 4, 8, 'KEYWORD'), // public
        highlight(5, 2, 5, 9, 'KEYWORD'), // private
        highlight(7, 8, 7, 18, 'KEYWORD'), // implements
        highlight(8, 0, 8, 9, 'KEYWORD'), // interface
        highlight(9, 0, 9, 4, 'KEYWORD'), // enum
      ]),
    );
  });
});

async function highlighting(filename: string): Promise<SyntaxHighlight[]> {
  const filePath = path.join(import.meta.dirname, 'fixtures', 'syntax-highlighting', filename);
  const sourceCode = await parseTypeScriptSourceFile(filePath, []);
  return getSyntaxHighlighting(sourceCode).highlights;
}

function highlight(
  startLine: number,
  startCol: number,
  endLine: number,
  endCol: number,
  textType: TextType,
): SyntaxHighlight {
  return {
    location: {
      startLine,
      startCol,
      endLine,
      endCol,
    },
    textType,
  };
}
