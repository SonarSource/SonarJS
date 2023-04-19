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
  const initialCtx = workDir => ({
    workDir,
    shouldUseTypeScriptParserForJS: false,
    sonarlint: true,
    bundles: [],
  });

  it('should not find any tsconfig without context or parameter', () => {
    console.log = jest.fn();
    const tsconfigs = new ProjectTSConfigs();
    expect(console.log).toHaveBeenCalledWith(
      `ERROR Could not access working directory ${undefined}`,
    );
    expect(tsconfigs.db.size).toBe(0);
  });

  it('should find and update tsconfig.json files', async () => {
    console.log = jest.fn();
    const dir = toUnixPath(path.join(__dirname, 'fixtures', 'tsconfigs'));
    setContext(initialCtx(dir));
    const projectTSConfigs = new ProjectTSConfigs();
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

    const tsconfig = projectTSConfigs.db.values().next().value;
    //overwrite cached contents
    tsconfig.contents = 'fake contents';

    const fakeTsConfig = toUnixPath(path.join(dir, 'fakeTsConfig.json'));

    //fake tsconfig could not be found
    projectTSConfigs.upsertTsConfigs([fakeTsConfig]);
    expect(console.log).toHaveBeenCalledWith(`ERROR: Could not read tsconfig ${fakeTsConfig}`);

    //cached contents should be back to actual file contents
    projectTSConfigs.reloadTsConfigs();
    expect(projectTSConfigs.get(tsconfig.filename)).toEqual({
      filename: tsconfig.filename,
      contents: '',
    });
  });

  it('should update tsconfig.json files with new found ones', async () => {
    const dir = toUnixPath(path.join(__dirname, 'fixtures', 'tsconfigs'));
    const tsconfig = toUnixPath(path.join(dir, 'tsconfig.json'));
    const nonExistingTsconfig = toUnixPath(path.join(dir, 'non-existing-tsconfig.json'));

    setContext(initialCtx(dir));
    const tsconfigs = new ProjectTSConfigs(undefined, false);
    tsconfigs.db.set(nonExistingTsconfig, { filename: nonExistingTsconfig, contents: '' });

    console.log = jest.fn();
    tsconfigs.upsertTsConfigs([tsconfig]);

    expect(tsconfigs.db).toEqual(
      new Map([
        [nonExistingTsconfig, { filename: nonExistingTsconfig, contents: '' }],
        [tsconfig, { filename: tsconfig, contents: '' }],
      ]),
    );

    tsconfigs.reloadTsConfigs();
    expect(console.log).toHaveBeenCalledWith(
      `ERROR: tsconfig is no longer accessible ${nonExistingTsconfig}`,
    );
    expect(tsconfigs.db).toEqual(new Map([[tsconfig, { filename: tsconfig, contents: '' }]]));
  });
});
