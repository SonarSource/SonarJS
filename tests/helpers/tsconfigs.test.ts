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

import { ProjectTSConfigs, setContext, toUnixPath } from 'helpers';
import path from 'path';

describe('TSConfigs', () => {
  const dir = toUnixPath(path.join(__dirname, 'fixtures', 'tsconfigs'));
  setContext({
    shouldUseTypeScriptParserForJS: false,
    sonarlint: true,
    bundles: [],
  });

  it('should not find any tsconfig without dir parameter', () => {
    console.log = jest.fn();
    const tsconfigs = new ProjectTSConfigs();
    expect(tsconfigs.tsConfigLookup).toThrow();
    expect(console.log).toHaveBeenCalledWith(
      `ERROR Could not access project directory ${undefined}`,
    );
    expect(tsconfigs.db.size).toBe(0);
  });

  it('should find and update tsconfig.json files', async () => {
    console.log = jest.fn();
    const projectTSConfigs = new ProjectTSConfigs(dir);
    const tsconfigs = [
      ['tsconfig.json'],
      ['tsconfig.base.json'],
      ['subfolder', 'tsconfig.json'],
      ['subfolder', 'tsconfig.base.json'],
      ['subfolder', 'JSCONFIG.DEV.JSON'],
    ];

    expect(projectTSConfigs.db).toEqual(
      new Map(
        tsconfigs.map(tsconfig => {
          const filename = toUnixPath(path.join(dir, ...tsconfig));
          return [filename, { filename, contents: '' }];
        }),
      ),
    );
  });

  it('should return tsconfig.json files properly sorted', async () => {
    const dir = toUnixPath(path.join(__dirname, 'fixtures', 'tsconfigs'));
    const file = toUnixPath(path.join(dir, 'foo', 'file.js'));
    const tsconfig1 = toUnixPath(path.join(dir, 'foo', 'bar', 'tsconfig.json'));
    const tsconfig2 = toUnixPath(path.join(dir, 'foo', 'bar', 'tsconfig2.json'));
    const tsconfig3 = toUnixPath(path.join(dir, 'foo', 'tsconfig2.json'));
    const tsconfig4 = toUnixPath(path.join(dir, 'tsconfig.json'));
    const tsconfig5 = toUnixPath(path.join(dir, 'foo', 'tsconfig.json'));
    const tsconfig6 = toUnixPath(path.join(dir, 'foo2', 'tsconfig.json'));
    const tsconfig7 = toUnixPath(path.join(dir, 'foo', 'bar', 'tsconfig1.json'));

    const tsconfigs = new ProjectTSConfigs();
    tsconfigs.db.set(tsconfig1, { filename: tsconfig1, contents: '' });
    tsconfigs.db.set(tsconfig2, { filename: tsconfig2, contents: '' });
    tsconfigs.db.set(tsconfig3, { filename: tsconfig3, contents: '' });
    tsconfigs.db.set(tsconfig4, { filename: tsconfig4, contents: '' });
    tsconfigs.db.set(tsconfig5, { filename: tsconfig5, contents: '' });
    tsconfigs.db.set(tsconfig6, { filename: tsconfig6, contents: '' });
    tsconfigs.db.set(tsconfig7, { filename: tsconfig7, contents: '' });

    expect([...tsconfigs.iterateTSConfigs(file)]).toEqual([
      { filename: tsconfig5, contents: '' },
      { filename: tsconfig4, contents: '' },
      { filename: tsconfig6, contents: '' },
      { filename: tsconfig1, contents: '' },
      { filename: tsconfig3, contents: '' },
      { filename: tsconfig7, contents: '' },
      { filename: tsconfig2, contents: '' },
      {
        filename: `tsconfig-${file}.json`,
        contents: JSON.stringify({
          compilerOptions: {
            allowJs: true,
            noImplicitAny: true,
          },
          files: [file],
        }),
        isFallbackTSConfig: true,
      },
    ]);
  });
});
