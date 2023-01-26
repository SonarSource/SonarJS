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
import { join } from 'path';
import { buildSourceCodes, Language } from 'parsing/embedded';
import { yamlInput } from '../../../tools';

describe('buildSourceCodes()', () => {
  const fixturesPath = join(__dirname, '..', 'fixtures');
  it('should build source code from an HTML file', async () => {
    const filePath = join(fixturesPath, 'simple.html');
    const sourceCodes = buildSourceCodes(await yamlInput({ filePath }), 'html');
    expect(sourceCodes).toHaveLength(1);
    expect(sourceCodes[0].ast.loc.start).toEqual({ line: 4, column: 8 });
  });

  it('throw an error if the language is unknown', async () => {
    const language = 'unknown language wallaaaaa';
    expect(() =>
      buildSourceCodes(
        {
          filePath: '',
          fileContent: '',
        },
        language as Language,
      ),
    ).toThrow(`Unknown language: ${language}`);
  });
});
