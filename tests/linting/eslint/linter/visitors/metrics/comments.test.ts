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
import { findCommentLines } from '@sonar/jsts/linter/visitors/metrics/comments';
import path from 'path';
import { parseJavaScriptSourceFile } from '../../../../../tools/helpers';

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
  test.each(cases)(
    'should find comment lines $given',
    async ({ fixture, ignoreHeader, expectedLines }) => {
      const filePath = path.join(__dirname, 'fixtures', 'comments', `${fixture}.js`);
      const sourceCode = await parseJavaScriptSourceFile(filePath);
      const { commentLines: actualLines } = findCommentLines(sourceCode, ignoreHeader);
      expect(actualLines).toEqual(expectedLines);
    },
  );
});
