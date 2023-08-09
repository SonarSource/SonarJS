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
import { findNcloc } from '../../../../src/linter/visitors/metrics/ncloc';
import path from 'path';
import { parseJavaScriptSourceFile } from '../../../tools';

describe('findNcloc', () => {
  it('should find the line numbers of code', async () => {
    const filePath = path.join(__dirname, 'fixtures/ncloc.js');
    const sourceCode = await parseJavaScriptSourceFile(filePath);
    const nloc = findNcloc(sourceCode);
    expect(nloc).toEqual([4, 6, 7, 8, 9, 11]);
  });

  it('should find the line numbers of code in Vue.js', async () => {
    const filePath = path.join(__dirname, 'fixtures/ncloc.vue');
    const sourceCode = await parseJavaScriptSourceFile(filePath);
    const nloc = findNcloc(sourceCode);
    expect(nloc).toEqual([
      1, 2, 3, 7, 8, 9, 11, 12, 13, 14, 18, 19, 20, 21, 22, 24, 25, 30, 31, 32,
    ]);
  });
});
