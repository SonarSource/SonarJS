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

import {
  emptyTSConfigsCache,
  projectTSConfigs,
  setContext,
  toUnixPath,
  tsConfigLookup,
  updateTsConfigs,
} from 'helpers';
import path from 'path';
import console from 'console';

describe('TSConfigs', () => {
  const initialCtx = path => ({
    workDir: path,
    shouldUseTypeScriptParserForJS: false,
    sonarlint: true,
    bundles: [],
  });

  it('should not find any tsconfig without context or parameter', () => {
    console.log = jest.fn();
    tsConfigLookup();
    expect(console.log).toHaveBeenCalledWith(
      `ERROR Could not access working directory ${undefined}`,
    );
    expect(projectTSConfigs.size).toBe(0);
  });

  it('should find and update tsconfig.json files', async () => {
    emptyTSConfigsCache();
    console.log = jest.fn();
    const dir = toUnixPath(path.join(__dirname, 'fixtures', 'tsconfigs'));
    setContext(initialCtx(dir));
    const tsconfigs = [
      ['tsconfig.json'],
      ['tsconfig.base.json'],
      ['subfolder', 'tsconfig.json'],
      ['subfolder', 'tsconfig.base.json'],
      ['subfolder', 'JSCONFIG.DEV.JSON'],
    ];

    tsConfigLookup();

    expect(projectTSConfigs).toEqual(
      new Map(
        tsconfigs.map(tsconfig => {
          const filename = toUnixPath(path.join(dir, ...tsconfig));
          return [filename, { filename, contents: '' }];
        }),
      ),
    );

    const tsconfig = projectTSConfigs.values().next().value;
    const fakeTsConfig = toUnixPath(path.join(dir, 'fakeTsConfig.json'));
    tsconfig.contents = 'fake contents';

    updateTsConfigs([fakeTsConfig]);
    expect(projectTSConfigs.get(tsconfig.filename)).toEqual({
      filename: tsconfig.filename,
      contents: '',
      reset: true,
    });
    expect(console.log).toHaveBeenCalledWith(`ERROR: Could not read new tsconfig ${fakeTsConfig}`);
  });

  it('should update tsconfig.json files with new found ones', async () => {
    emptyTSConfigsCache();
    const dir = toUnixPath(path.join(__dirname, 'fixtures', 'tsconfigs'));
    const tsconfig = toUnixPath(path.join(dir, 'tsconfig.json'));
    const nonExistingTsconfig = toUnixPath(path.join(dir, 'non-existing-tsconfig.json'));

    projectTSConfigs.set(nonExistingTsconfig, { filename: nonExistingTsconfig, contents: '' });

    console.log = jest.fn();
    setContext(initialCtx(dir));
    updateTsConfigs([tsconfig]);

    expect(projectTSConfigs).toEqual(new Map([[tsconfig, { filename: tsconfig, contents: '' }]]));

    expect(console.log).toHaveBeenCalledWith(
      `ERROR: tsconfig is no longer accessible ${nonExistingTsconfig}`,
    );
  });
});
