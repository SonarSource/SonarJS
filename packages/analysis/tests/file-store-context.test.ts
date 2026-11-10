/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { expect } from 'expect';
import { createConfiguration } from '../src/common/configuration.js';
import {
  initFileStoresForAnalysis,
  sourceFileStore,
  tsConfigStore,
} from '../src/file-stores/index.js';
import { getTsConfigContentCache } from '../src/jsts/program/cache/tsconfigCache.js';
import { createAnalyzableFiles } from '../src/projectAnalysis.js';
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';
import { FsCacheArchive } from '../../shared/src/fs-cache/archive.js';
import { installFsCache, seedFilesystemBaseline } from '../../shared/src/fs-cache/hook.js';

const cache = installFsCache();
let temporary: string;

beforeEach(() => {
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'sonarjs-file-store-context-'));
});
afterEach(() => fs.rmSync(temporary, { recursive: true, force: true }));

describe('file-store context reconciliation', () => {
  it('propagates missing config observations so replay recovery can run', async () => {
    const rootDir = normalizeToAbsolutePath(path.join(temporary, 'project'));
    fs.mkdirSync(rootDir);
    fs.writeFileSync(path.join(rootDir, 'tsconfig.json'), '{}');
    const archivePath = path.join(temporary, 'filesystem.pb.gz');
    const recording = cache.beginAnalysis({
      mode: 'record',
      caseSensitivePaths: true,
      rootDir,
      archivePath,
    });
    try {
      // A directory observation can discover a config whose contents were never recorded.
      fs.readdirSync(rootDir, { withFileTypes: true });
    } finally {
      recording.end();
    }
    const replay = cache.beginAnalysis({
      mode: 'replay',
      caseSensitivePaths: true,
      rootDir,
      archivePath,
    });
    try {
      await expect(
        initFileStoresForAnalysis(
          createConfiguration({ baseDir: rootDir }),
          createAnalyzableFiles(),
        ),
      ).rejects.toMatchObject({ code: 'ERR_SONARJS_FS_CACHE_MISS' });
    } finally {
      replay.end();
    }
  });

  it('keeps configuration discovery working when preloading a config fails', async ({ mock }) => {
    const rootDir = normalizeToAbsolutePath(path.join(temporary, 'project'));
    fs.mkdirSync(rootDir);
    const config = normalizeToAbsolutePath(path.join(rootDir, 'tsconfig.json'));
    fs.writeFileSync(config, '{}');
    const readFile = fs.promises.readFile;
    mock.method(fs.promises, 'readFile', async (...args: Parameters<typeof readFile>) => {
      if (normalizeToAbsolutePath(String(args[0])) === config) {
        throw Object.assign(new Error('Simulated config read failure'), { code: 'EIO' });
      }
      return readFile(...args);
    });
    await initFileStoresForAnalysis(
      createConfiguration({ baseDir: rootDir }),
      createAnalyzableFiles(),
    );
    expect(tsConfigStore.getTsConfigs()).toEqual([config]);
    expect(getTsConfigContentCache().has(config)).toBe(false);
    expect(sourceFileStore.getFiles()).toEqual({});
  });

  for (const removeSource of [false, true]) {
    it(`refreshes configs without analyzing or reading cached sources; deletion=${removeSource}`, async ({
      mock,
    }) => {
      const rootDir = normalizeToAbsolutePath(path.join(temporary, 'project'));
      fs.mkdirSync(rootDir);
      const kept = path.join(rootDir, 'kept.ts');
      const removedDirectory = path.join(rootDir, 'removed');
      const removed = path.join(removedDirectory, 'source.ts');
      fs.mkdirSync(removedDirectory);
      fs.writeFileSync(kept, 'const kept = 1;');
      fs.writeFileSync(removed, 'const removed = 1;');
      const configs = ['tsconfig.json', 'custom-config.json', 'package.json'];
      for (const config of configs) fs.writeFileSync(path.join(rootDir, config), '{}');
      const configuration = createConfiguration({
        baseDir: rootDir,
        tsConfigPaths: ['custom-config.json'],
      });
      const baselinePath = path.join(temporary, 'baseline.pb.gz');
      const archivePath = path.join(temporary, 'current.pb.gz');
      const baseline = cache.beginAnalysis({
        mode: 'record',
        caseSensitivePaths: true,
        rootDir,
        archivePath: baselinePath,
      });
      try {
        fs.readFileSync(kept);
        fs.readFileSync(removed);
        await initFileStoresForAnalysis(configuration, createAnalyzableFiles());
      } finally {
        baseline.end();
      }
      if (removeSource) fs.rmSync(removedDirectory, { recursive: true });
      for (const config of configs)
        fs.writeFileSync(path.join(rootDir, config), '{"changed":true}');
      const recording = cache.beginAnalysis({
        mode: 'record',
        caseSensitivePaths: true,
        rootDir,
        archivePath,
      });
      try {
        seedFilesystemBaseline(baselinePath);
        const read = mock.method(fs.promises, 'readFile');
        await initFileStoresForAnalysis(configuration, createAnalyzableFiles());
        expect(sourceFileStore.getFiles()).toEqual({});
        expect(
          read.mock.calls.map(call => normalizeToAbsolutePath(String(call.arguments[0]))).sort(),
        ).toEqual(
          configs.map(config => normalizeToAbsolutePath(path.join(rootDir, config))).sort(),
        );
        expect(
          getTsConfigContentCache().get(
            normalizeToAbsolutePath(path.join(rootDir, 'tsconfig.json')),
          )?.contents,
        ).toBe('{"changed":true}');
        read.mock.restore();
      } finally {
        recording.end();
      }
      const archive = new FsCacheArchive({
        mode: 'replay',
        caseSensitivePaths: true,
        rootDir,
        archivePath,
      });
      archive.load();
      expect(archive.get('kept.ts', 'readFile')).toEqual({
        ok: true,
        value: Buffer.from('const kept = 1;'),
      });
      if (removeSource) {
        expect(archive.getExists('removed/source.ts')).toBe(false);
        expect(archive.get('removed/source.ts', 'readFile')).toBeUndefined();
      } else {
        expect(archive.getExists('removed/source.ts')).toBe(true);
      }
      for (const config of configs) {
        expect(archive.get(config, 'readFile')).toEqual({
          ok: true,
          value: Buffer.from('{"changed":true}'),
        });
      }
    });
  }
});
