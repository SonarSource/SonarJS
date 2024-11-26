/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { findCommentLines } from '../../../../src/linter/visitors/metrics/comments.js';
import path from 'path';
import { parseJavaScriptSourceFile } from '../../../tools/helpers/index.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';

const cases = [
  {
    fixture: 'file1',
    given: 'with header ignoring and no header comment',
    ignoreHeader: true,
    expectedLines: [5, 6],
  },
  {
    fixture: 'file2',
    given: 'with header ignoring and block header comment',
    ignoreHeader: true,
    expectedLines: [3, 4, 5],
  },
  {
    fixture: 'file3',
    given: 'with header ignoring and special block header comment',
    ignoreHeader: true,
    expectedLines: [3, 4, 5],
  },
  {
    fixture: 'file4',
    given: 'with header ignoring and line header comment',
    ignoreHeader: true,
    expectedLines: [3, 4, 5],
  },
  {
    fixture: 'file5',
    given: 'without header ignoring and block header comment',
    ignoreHeader: false,
    expectedLines: [1, 3, 4, 5],
  },
  {
    fixture: 'file6',
    given: 'without header ignoring and no header comment',
    ignoreHeader: false,
    expectedLines: [2, 3, 4],
  },
];

describe('findCommentLines', () => {
  cases.forEach(({ given, fixture, ignoreHeader, expectedLines }) =>
    it(`should find comment lines ${given}`, async () => {
      const filePath = path.join(import.meta.dirname, 'fixtures', 'comments', `${fixture}.js`);
      const sourceCode = await parseJavaScriptSourceFile(filePath);
      const { commentLines: actualLines } = findCommentLines(sourceCode, ignoreHeader);
      expect(actualLines).toEqual(expectedLines);
    }),
  );
});
