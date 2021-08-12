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
import getHighlighting, { Highlight, SonarTypeOfText } from 'runner/highlighter';
import { join } from 'path';
import { SourceCode } from 'eslint';
import { parseJavaScriptSourceFile, parseTypeScriptSourceFile } from '../utils/parser-utils';

it('should highlight keywords', () => {
  const result = actual(
    `class A {
     get b() {
       return this.a;
     }
     static foo() {
       if (cond);
     }
     a: string;
  }`,
  );
  expect(result).toContainEqual(token(1, 0, 1, 5, 'KEYWORD')); // class
  expect(result).toContainEqual(token(3, 7, 3, 13, 'KEYWORD')); // return
  expect(result).toContainEqual(token(3, 14, 3, 18, 'KEYWORD')); // this
  expect(result).toContainEqual(token(5, 5, 5, 11, 'KEYWORD')); // static
  expect(result).toContainEqual(token(6, 7, 6, 9, 'KEYWORD')); // if
});

it('should highlight comments', () => {
  const result = actual(
    `a // comment1
  /*comment2*/
  // comment3
  b // comment4
  /**
   * comment5
   */
  c
  // comment6`,
  );
  expect(result.length).toBe(6);
  expect(result).toContainEqual(token(1, 2, 1, 13, 'COMMENT')); // 1
  expect(result).toContainEqual(token(2, 2, 2, 14, 'COMMENT')); // 2
  expect(result).toContainEqual(token(3, 2, 3, 13, 'COMMENT')); // 3
  expect(result).toContainEqual(token(4, 4, 4, 15, 'COMMENT')); // 4
  expect(result).toContainEqual(token(5, 2, 7, 5, 'STRUCTURED_COMMENT')); // 5
  expect(result).toContainEqual(token(9, 2, 9, 13, 'COMMENT')); // 6
});

it('should highlight strings', () => {
  expect(actual("'str'")).toContainEqual(token(1, 0, 1, 5, 'STRING'));
  expect(actual('"str"')).toContainEqual(token(1, 0, 1, 5, 'STRING'));

  expect(actual('`str`')).toContainEqual(token(1, 0, 1, 5, 'STRING'));
  expect(actual('`line1\nline2`')).toContainEqual(token(1, 0, 2, 6, 'STRING'));

  const template = '`start ${x} middle ${y} end`';
  expect(actual(template)).toContainEqual(token(1, 0, 1, 9, 'STRING'));
  expect(actual(template)).toContainEqual(token(1, 10, 1, 21, 'STRING'));
  expect(actual(template)).toContainEqual(token(1, 22, 1, 28, 'STRING'));

  expect(actual('`There are ${42} apples`')).toContainEqual(token(1, 13, 1, 15, 'CONSTANT'));
});

it('should highlight numbers', () => {
  expect(actual('0')).toContainEqual(token(1, 0, 1, 1, 'CONSTANT'));
  expect(actual('0.0')).toContainEqual(token(1, 0, 1, 3, 'CONSTANT'));
  expect(actual('-0.0')).toContainEqual(token(1, 1, 1, 4, 'CONSTANT'));
  expect(actual('10e-2')).toContainEqual(token(1, 0, 1, 5, 'CONSTANT'));
});

it('should highlight regex literals', () => {
  expect(actual('/x/')).toContainEqual(token(1, 0, 1, 3, 'STRING'));
  expect(actual('/42/gu')).toContainEqual(token(1, 0, 1, 6, 'STRING'));
});

it('should highlight Vue templates', () => {
  function highlights(code: string): Highlight[] {
    const sourceCode = parseJavaScriptSourceFile(code, '/some/path/file.vue', []) as SourceCode;
    return getHighlighting(sourceCode).highlights;
  }
  expect(highlights('<template></template>')).toEqual(
    expect.arrayContaining([
      expect.objectContaining(token(1, 0, 1, 9, 'KEYWORD')), // <template
      expect.objectContaining(token(1, 9, 1, 10, 'KEYWORD')), // >
      expect.objectContaining(token(1, 10, 1, 20, 'KEYWORD')), // </template
      expect.objectContaining(token(1, 20, 1, 21, 'KEYWORD')), // >
    ]),
  );
  expect(highlights(`<template><!DOCTYPE></template>`)).toEqual(
    expect.arrayContaining([
      expect.objectContaining(token(1, 10, 1, 20, 'STRUCTURED_COMMENT')), // <!DOCTYPE>
    ]),
  );
  expect(highlights(`<template><!-- comment ></template>`)).toEqual(
    expect.arrayContaining([
      expect.objectContaining(token(1, 10, 1, 35, 'COMMENT')), // <!-- comment >
    ]),
  );
  expect(highlights(`<template><tag /></template>`)).toEqual(
    expect.arrayContaining([
      expect.objectContaining(token(1, 15, 1, 17, 'KEYWORD')), // <tag
      expect.objectContaining(token(1, 17, 1, 27, 'KEYWORD')), // />
    ]),
  );
  expect(highlights(`<template><tag attr=5 /></template>`)).toEqual(
    expect.arrayContaining([
      expect.objectContaining(token(1, 20, 1, 21, 'STRING')), // 5
    ]),
  );
  expect(highlights(`<template><tag attr="value" /></template>`)).toEqual(
    expect.arrayContaining([
      expect.objectContaining(token(1, 20, 1, 27, 'STRING')), // "value"
    ]),
  );
});

function token(
  startLine: number,
  startCol: number,
  endLine: number,
  endCol: number,
  textType: SonarTypeOfText,
): Highlight {
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

function actual(code: string): Highlight[] {
  const fileUri = join(__dirname, '/../fixtures/ts-project/sample.lint.ts');
  const tsConfig = join(__dirname, '/../fixtures/ts-project/tsconfig.json');
  const sourceCode = parseTypeScriptSourceFile(code, fileUri, [tsConfig]) as SourceCode;
  return getHighlighting(sourceCode).highlights;
}
