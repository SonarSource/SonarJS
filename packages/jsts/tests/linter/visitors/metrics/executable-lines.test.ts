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
import { findExecutableLines } from '../../../../src/linter/visitors/metrics/executable-lines.js';
import path from 'path';
import { parseTypeScriptSourceFile } from '../../../tools/index.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';

describe('findExecutableLines', () => {
  it('should find the number of executable lines', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'executable-lines.ts');
    const tsConfigs = [];
    const sourceCode = await parseTypeScriptSourceFile(filePath, tsConfigs);
    const statements = findExecutableLines(sourceCode);
    expect(statements).toEqual([
      4, 7, 10, 11, 13, 16, 19, 20, 21, 24, 25, 27, 30, 31, 33, 36, 38, 42, 43, 46, 47, 48, 49, 52,
      57, 61, 64, 65, 67, 70, 71, 74, 77, 82, 86,
    ]);
  });
});
