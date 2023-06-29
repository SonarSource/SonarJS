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
import { CpdToken, getCpdTokens } from 'linting/eslint/linter/visitors';
import path from 'path';
import { parseJavaScriptSourceFile } from '../../../../tools/helpers';

describe('getCpdTokens', () => {
  it('should find all tokens', async () => {
    expect(await tokens('token.js')).toEqual([
      token(1, 0, 1, 2, 'if'),
      token(1, 3, 1, 4, '('),
      token(1, 4, 1, 8, 'true'),
      token(1, 8, 1, 9, ')'),
      token(2, 0, 2, 3, 'foo'),
      token(2, 3, 2, 4, '('),
      token(2, 4, 2, 5, ')'),
      token(2, 5, 2, 6, ';'),
    ]);
  });

  it('should ignore comments', async () => {
    expect(await tokens('comment.js')).toEqual([
      token(1, 0, 1, 1, 'a'),
      token(4, 0, 4, 1, 'b'),
      token(14, 0, 14, 1, 'c'),
    ]);
  });

  it('should anonymize string literals', async () => {
    expect(images(await tokens('string.js'))).toEqual(
      expect.arrayContaining([
        'LITERAL', // 'string'
        'LITERAL', // `string`
        'LITERAL', // "string"
        '42',
        'true',
      ]),
    );
  });

  it('should find JSX tokens', async () => {
    expect(images(await tokens('jsx.js'))).toEqual(expect.arrayContaining(['<', 'foo', '/', '>']));
  });

  it('should preserve JSX string literals', async () => {
    expect(images(await tokens('string-jsx.js'))).toEqual(
      expect.arrayContaining([
        'LITERAL', // 'hello'
        '"abc"',
        'LITERAL', // "def"
        'LITERAL', // "ghi"
        'LITERAL', // "jkl"
        'LITERAL', // 'str'
      ]),
    );
  });

  it('should ignore import statements', async () => {
    expect(images(await tokens('import.js'))).toEqual(['import', '(', 'lib', ')', ';']);
  });

  it('should ignore require calls', async () => {
    expect(images(await tokens('require.js'))).toEqual(['const', 'fs', '=', ';']);
  });
});

async function tokens(filename: string): Promise<CpdToken[]> {
  const filePath = path.join(__dirname, 'fixtures', 'cpd', filename);
  const sourceCode = await parseJavaScriptSourceFile(filePath);
  return getCpdTokens(sourceCode).cpdTokens;
}

function token(
  startLine: number,
  startCol: number,
  endLine: number,
  endCol: number,
  image: string,
): CpdToken {
  return {
    location: {
      startLine,
      startCol,
      endLine,
      endCol,
    },
    image,
  };
}

function images(cpdTokens: CpdToken[]): string[] {
  return cpdTokens.map(cpdToken => cpdToken.image);
}
