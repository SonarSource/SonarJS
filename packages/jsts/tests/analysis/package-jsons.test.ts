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
import { beforeEach, describe, it, type Mock } from 'node:test';
import { expect } from 'expect';
import { join } from 'node:path/posix';
import { loadFiles } from '../../src/analysis/projectAnalysis/files-finder.js';
import {
  clearPackageJsonsCache,
  getPackageJsons,
  packageJsonsCacheInitialized,
  dirtyCachesIfNeeded,
  UNINITIALIZED_ERROR,
} from '../../src/analysis/projectAnalysis/package-jsons.js';
import { readFile } from 'node:fs/promises';
import { PackageJson } from 'type-fest';
import { toUnixPath } from '../../../shared/src/helpers/files.js';
import { cache } from '../../src/rules/index.js';
import { setGlobalConfiguration } from '../../../shared/src/helpers/configuration.js';

const fixtures = toUnixPath(join(import.meta.dirname, 'fixtures'));

describe('files', () => {
  beforeEach(() => {
    clearPackageJsonsCache();
  });
  it('should crash getting files before initializing', async () => {
    expect(getPackageJsons).toThrow(new Error(UNINITIALIZED_ERROR));
  });

  it('should return the package.json files', async () => {
    await loadFiles(join(fixtures, 'dependencies'));
    const filePath = join(fixtures, 'dependencies', 'package.json');
    const fileContent = JSON.parse(await readFile(filePath, 'utf-8')) as PackageJson;
    expect(getPackageJsons()).toEqual([
      {
        filePath,
        fileContent,
      },
    ]);
  });

  it('should fill the package.json cache used for rules', async () => {
    const path = join(fixtures, 'dependencies');
    await loadFiles(path);
    expect(cache.size).toEqual(1);
    expect(cache.has(path)).toEqual(true);
  });

  it('should ignore malformed the package.json files', async ({ mock }) => {
    mock.method(console, 'error');
    const consoleErrorMock = (console.error as Mock<typeof console.error>).mock;
    await loadFiles(join(fixtures, 'package-json-malformed'));
    const filePath = join(fixtures, 'package-json-malformed', 'package.json');
    expect(getPackageJsons()).toHaveLength(0);

    expect(
      consoleErrorMock.calls
        .map(call => call.arguments[0])
        .some(log => log.match(`Error parsing package.json ${filePath}: SyntaxError`)),
    ).toEqual(true);
  });

  it('should clear the package.json cache', async () => {
    setGlobalConfiguration();
    const baseDir = join(fixtures, 'dependencies');
    await loadFiles(baseDir);
    expect(packageJsonsCacheInitialized(baseDir)).toEqual(true);
    expect(getPackageJsons()).toHaveLength(1);
    expect(cache.size).toEqual(1);

    dirtyCachesIfNeeded(baseDir);
    expect(getPackageJsons()).toHaveLength(1);

    // we create a file event
    setGlobalConfiguration({ fsEvents: [[join(baseDir, 'package.json'), 'MODIFIED']] });
    dirtyCachesIfNeeded(baseDir);
    expect(getPackageJsons).toThrow(new Error(UNINITIALIZED_ERROR));
    expect(cache.size).toEqual(0);
  });
});
