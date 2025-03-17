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
import { describe, it } from 'node:test';
import {
  clearTSConfigs,
  getTSConfigs,
  getTSConfigsCount,
  getTSConfigsIterator,
  writeTSConfigFile,
} from '../../src/analysis/projectAnalysis/tsconfigs.js';
import {
  loadFiles,
  verifyProvidedTsConfigs,
} from '../../src/analysis/projectAnalysis/projectAnalyzer.js';
import { expect } from 'expect';
import { basename, join, relative } from 'node:path/posix';
import { toUnixPath } from '../../src/rules/index.js';
import { readFile } from 'node:fs/promises';

const fixtures = join(import.meta.dirname, 'fixtures');

describe('tsconfigs', () => {
  it('should return the TSconfig files', async () => {
    clearTSConfigs();
    await loadFiles(fixtures);
    expect(getTSConfigsCount()).toEqual(3);
  });

  it('should validate the provided TSconfig files', async () => {
    const tsconfigs = getTSConfigs();
    clearTSConfigs();
    await verifyProvidedTsConfigs(
      fixtures,
      tsconfigs.map(tsconfig => relative(fixtures, tsconfig)).concat('fake_dir/tsconfig.json'),
    );
    expect(getTSConfigsCount()).toEqual(3);
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
    clearTSConfigs();
    const baseDir = toUnixPath(join(fixtures, 'module'));
    const files = await loadFiles(baseDir);
    const tsconfigs = getTSConfigsIterator(Object.keys(files), baseDir, true, 200);
    const tsconfig = await getAsyncIteratorValue(tsconfigs);
    expect(basename(tsconfig)).toMatch(/tsconfig-\w{6}\.json/);
    expect(JSON.parse(await readFile(tsconfig, 'utf8'))).toMatchObject({
      compilerOptions: {
        allowJs: true,
        noImplicitAny: true,
      },
      include: [`${baseDir}/**/*`],
    });
    expect(await getAsyncIteratorValue(tsconfigs)).toEqual(undefined);
  });

  it('when no tsconfigs, in SonarQube should generate tsconfig with all files', async () => {
    clearTSConfigs();
    const baseDir = toUnixPath(join(fixtures, 'module'));
    const files = await loadFiles(baseDir);
    const tsconfigs = getTSConfigsIterator(Object.keys(files), baseDir, false, 200);
    const tsconfig = await getAsyncIteratorValue(tsconfigs);
    expect(basename(tsconfig)).toMatch(/tsconfig-\w{6}\.json/);
    expect(JSON.parse(await readFile(tsconfig, 'utf8'))).toMatchObject({
      compilerOptions: {
        allowJs: true,
        noImplicitAny: true,
      },
      files: [`${baseDir}/file.ts`, `${baseDir}/string42.ts`],
    });
    expect(await getAsyncIteratorValue(tsconfigs)).toEqual(undefined);
  });

  it('should not generate tsconfig file when too many files', async () => {
    clearTSConfigs();
    const baseDir = toUnixPath(join(fixtures, 'module'));
    const files = await loadFiles(baseDir);
    const tsconfigs = getTSConfigsIterator(Object.keys(files), baseDir, true, 1);
    expect(await getAsyncIteratorValue(tsconfigs)).toEqual(undefined);
  });

  it('should not generate tsconfig file if there is already at least one', async () => {
    clearTSConfigs();
    const baseDir = toUnixPath(join(fixtures, 'paths'));
    const files = await loadFiles(baseDir);
    const tsconfigs = getTSConfigsIterator(Object.keys(files), baseDir, true, 1);
    expect(await getAsyncIteratorValue(tsconfigs)).toEqual(
      toUnixPath(join(baseDir, 'tsconfig.json')),
    );
    expect(await getAsyncIteratorValue(tsconfigs)).toEqual(undefined);
  });
});

async function getAsyncIteratorValue(iterator: AsyncIterableIterator<string>) {
  return await iterator.next().then(({ value }) => value);
}
