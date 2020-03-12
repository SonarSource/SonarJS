/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import getCpdTokens, { CpdToken } from '../../src/runner/cpd';
import { parseTypeScriptSourceFile } from '../../src/parser';
import { join } from 'path';
import { SourceCode } from 'eslint';

it('should not skip any token', () => {
  const result = actual(
    `
    // comment
    "str1"
    'str2'
    \`template\`
    identifier
    `,
  );
  expect(result.length).toBe(4);
});

it('should skip comments', () => {
  const result = actual(
    `a // comment1
  /*comment2*/
  // comment3
  b // comment4
  /**
   * comment5
   */
/**
 * Shift down
 * @param  {Array} array
 * @param  {Number} i
 * @param  {Number} j
 */
  c
  // comment6`,
  );
  expect(result.length).toBe(3);
});

it('should provide correct position', () => {
  const result = actual(
    ` foo
bar
/**/foobar
\`
multiline string
\`
  `,
  );
  expect(result.length).toBe(4);
  expect(result).toContainEqual(token(1, 1, 1, 4, 'foo'));
  expect(result).toContainEqual(token(2, 0, 2, 3, 'bar'));
  expect(result).toContainEqual(token(3, 4, 3, 10, 'foobar'));
  expect(result).toContainEqual(token(4, 0, 6, 1, 'LITERAL'));
});

it('should replace strings', () => {
  expect(actual("'string'")[0].image).toBe('LITERAL');
  expect(actual('`string`')[0].image).toBe('LITERAL');
  expect(actual('"string"')[0].image).toBe('LITERAL');
  expect(actual('42')[0].image).toBe('42');
  expect(actual('true')[0].image).toBe('true');
});

it('should process JSX syntax', () => {
  const result = actual('<foo/>');
  expect(result.length).toBe(4);
  expect(result).toContainEqual(token(1, 0, 1, 1, '<'));
  expect(result).toContainEqual(token(1, 1, 1, 4, 'foo'));
  expect(result).toContainEqual(token(1, 4, 1, 5, '/'));
  expect(result).toContainEqual(token(1, 5, 1, 6, '>'));
});

it('should process JSX syntax with empty text elements', () => {
  const result = actual(`<foo>
      </foo>`);
  expect(result.length).toBe(7);
  expect(result).toContainEqual(token(1, 0, 1, 1, '<'));
  expect(result).toContainEqual(token(1, 1, 1, 4, 'foo'));
  expect(result).toContainEqual(token(1, 4, 1, 5, '>'));
  expect(result).toContainEqual(token(2, 6, 2, 7, '<'));
});

it('should process JSX syntax with not empty text elements', () => {
  const result = actual(`<foo> hello
    world </foo>`);
  expect(result.length).toBe(8);
  expect(result).toContainEqual(token(1, 0, 1, 1, '<'));
  expect(result).toContainEqual(token(1, 1, 1, 4, 'foo'));
  expect(result).toContainEqual(token(1, 4, 1, 5, '>'));
  expect(result).toContainEqual(token(1, 5, 2, 10, ' hello\n    world '));
  expect(result).toContainEqual(token(2, 10, 2, 11, '<'));
});

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

function actual(code: string): CpdToken[] {
  const fileUri = join(__dirname, '/../fixtures/tsx-project/sample.lint.tsx');
  const tsConfig = join(__dirname, '/../fixtures/tsx-project/tsconfig.json');
  const sourceCode = parseTypeScriptSourceFile(code, fileUri, [tsConfig]) as SourceCode;
  return getCpdTokens(sourceCode).cpdTokens;
}
