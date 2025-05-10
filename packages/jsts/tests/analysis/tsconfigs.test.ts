/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { beforeEach, describe, it } from 'node:test';
import {
  clearTsConfigCache,
  getTsConfigForInputFile,
  getTsConfigs,
  writeTSConfigFile,
} from '../../src/analysis/projectAnalysis/tsconfigs.js';
import { expect } from 'expect';
import { basename, join, relative } from 'node:path/posix';
import { toUnixPath } from '../../src/rules/index.js';
import { readFile } from 'node:fs/promises';
import { loadFiles } from '../../src/analysis/projectAnalysis/files-finder.js';
import {
  setGlobalConfiguration,
  setTsConfigPaths,
} from '../../../shared/src/helpers/configuration.js';
import { clearFilesCache } from '../../src/analysis/projectAnalysis/files.js';

const fixtures = join(import.meta.dirname, 'fixtures');

describe('tsconfigs', () => {
  beforeEach(() => {
    clearTsConfigCache();
    clearFilesCache();
  });
  it('should return the TSconfig files', async () => {
    await loadFiles(fixtures);
    expect(getTsConfigs().length).toEqual(3);
  });

  it('should validate the provided TSconfig files', async () => {
    await loadFiles(fixtures);
    setTsConfigPaths(
      getTsConfigs()
        .map(tsconfig => relative(fixtures, tsconfig))
        .concat('fake_dir/tsconfig.json'),
    );
    clearTsConfigCache();
    await loadFiles(fixtures);
    expect(getTsConfigs().length).toEqual(3);
  });

  it('should write tsconfig file', async () => {
    const { filename } = await writeTSConfigFile({
      compilerOptions: { allowJs: true, noImplicitAny: true },
      include: ['/path/to/project/**/*'],
    });
    const content = await readFile(filename, { encoding: 'utf-8' });
    expect(content).toBe(
      '{"compilerOptions":{"allowJs":true,"noImplicitAny":true},"include":["/path/to/project/**/*"]}',
    );
  });

  it('when no tsconfigs, in SonarLint should generate tsconfig with wildcard', async () => {
    setGlobalConfiguration({ sonarlint: true });
    const baseDir = toUnixPath(join(fixtures, 'module'));
    await loadFiles(baseDir);
    const tsconfig = getTsConfigForInputFile(toUnixPath(join(baseDir, 'file.ts')));
    expect(basename(tsconfig)).toMatch(/tsconfig-\w{6}\.json/);
    expect(JSON.parse(await readFile(tsconfig, 'utf8'))).toMatchObject({
      compilerOptions: {
        allowJs: true,
        noImplicitAny: true,
      },
      include: [`${baseDir}/**/*`],
    });
  });

  it('when no tsconfigs, in SonarQube should generate tsconfig with all files', async () => {
    setGlobalConfiguration({ sonarlint: false });
    const baseDir = toUnixPath(join(fixtures, 'module'));
    await loadFiles(baseDir);
    const tsconfig = getTsConfigForInputFile(toUnixPath(join(baseDir, 'file.ts')));
    expect(basename(tsconfig)).toMatch(/tsconfig-\w{6}\.json/);
    expect(JSON.parse(await readFile(tsconfig, 'utf8'))).toMatchObject({
      compilerOptions: {
        allowJs: true,
        noImplicitAny: true,
      },
      files: [`${baseDir}/file.ts`, `${baseDir}/string42.ts`],
    });
  });

  it('should not generate tsconfig file when too many files', async () => {
    setGlobalConfiguration({ sonarlint: true, maxFilesForTypeChecking: 1 });
    const baseDir = toUnixPath(join(fixtures, 'module'));
    await loadFiles(baseDir);
    const tsconfig = getTsConfigForInputFile(toUnixPath(join(baseDir, 'file.ts')));
    expect(tsconfig).toEqual(null);
  });

  it('should not generate tsconfig file if there is already at least one', async () => {
    setGlobalConfiguration();
    const baseDir = toUnixPath(join(fixtures, 'paths'));
    await loadFiles(baseDir);
    const tsconfig = getTsConfigForInputFile(toUnixPath(join(baseDir, 'file.ts')));
    expect(tsconfig).toEqual(toUnixPath(join(baseDir, 'tsconfig.json')));
  });
});
