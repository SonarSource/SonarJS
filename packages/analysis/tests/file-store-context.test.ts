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
  initFileStores,
  dependencyManifestStore,
  generatedSourceStore,
  sourceFileStore,
  tsConfigStore,
} from '../src/file-stores/index.js';
import { getTsConfigContentCache } from '../src/jsts/program/cache/tsconfigCache.js';
import { createAnalyzableFiles } from '../src/projectAnalysis.js';
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';
import { FsCacheArchive } from '../../shared/src/fs-cache/archive.js';
import { installFsCache } from '../../shared/src/fs-cache/hook.js';
import { fileContentStore } from '../src/common/file-content-store.js';

const cache = installFsCache();
let temporary: string;

beforeEach(() => {
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'sonarjs-file-store-context-'));
});
afterEach(() => fs.rmSync(temporary, { recursive: true, force: true }));

describe('file-store context reconciliation', () => {
  it('releases rejected sources and temporary configs without reading unused candidates', async ({
    mock,
  }) => {
    const rootDir = normalizeToAbsolutePath(temporary);
    const rejected = ['vendor.min.js', 'vendor.min.css'].map(filename =>
      normalizeToAbsolutePath(path.join(rootDir, filename)),
    );
    const temporaryConfig = normalizeToAbsolutePath(path.join(rootDir, 'codegen.json'));
    const unused = normalizeToAbsolutePath(path.join(rootDir, 'unused.json'));
    for (const file of rejected) fs.writeFileSync(file, '/* minified */');
    fs.writeFileSync(temporaryConfig, '{"generates":{}}');
    fs.writeFileSync(unused, '{}');
    const read = mock.method(fs.promises, 'readFile');

    await initFileStoresForAnalysis(createConfiguration({ baseDir: rootDir }));

    expect(read.mock.calls.map(call => String(call.arguments[0])).sort()).toEqual(
      [...rejected, temporaryConfig].sort(),
    );
    for (const file of rejected) {
      expect(sourceFileStore.getFile(file)).toBeUndefined();
      expect(fileContentStore.has(file)).toBe(false);
    }
    expect(fileContentStore.has(temporaryConfig)).toBe(false);
    expect(fileContentStore.has(unused)).toBe(false);
  });

  it('shares manifest contents with a TSConfig consumer after one discovery read', async ({
    mock,
  }) => {
    const rootDir = normalizeToAbsolutePath(temporary);
    const filePath = normalizeToAbsolutePath(path.join(rootDir, 'package.json'));
    fs.writeFileSync(filePath, '{}');
    const read = mock.method(fs.promises, 'readFile');

    await initFileStoresForAnalysis(
      createConfiguration({ baseDir: rootDir, tsConfigPaths: ['package.json'] }),
    );

    expect(read.mock.calls.map(call => String(call.arguments[0]))).toEqual([filePath]);
    const file = dependencyManifestStore.getPackageJsons().get(rootDir)!;
    expect(file.fileContent).toBe('{}');
    getTsConfigContentCache().set(filePath, { contents: '', missing: false });
    expect(file.fileContent).toBe('');
    expect(fileContentStore.get(filePath)).toBe('');
    expect(sourceFileStore.getFile(filePath)).toBeUndefined();
  });

  for (const filename of ['source.ts', 'custom.json']) {
    it(`shares one read with concurrent deferred consumers of ${filename}`, async ({ mock }) => {
      const rootDir = normalizeToAbsolutePath(temporary);
      const filePath = normalizeToAbsolutePath(path.join(rootDir, filename));
      fs.writeFileSync(filePath, '{}');
      const read = mock.method(fs.promises, 'readFile');
      mock.method(generatedSourceStore, 'postProcess', async (_configuration, context) => {
        const [first, second] = await Promise.all([
          context.getFile(filePath),
          context.getFile(filePath),
        ]);
        expect(first).toBe(second);
        expect(first.fileContent).toBe('{}');
        if (filename === 'source.ts') {
          expect(first).toBe(sourceFileStore.getFile(filePath));
        }
      });

      await initFileStoresForAnalysis(
        createConfiguration({ baseDir: rootDir, tsConfigPaths: [filename] }),
      );

      expect(read.mock.calls.map(call => String(call.arguments[0]))).toEqual([filePath]);
      expect(getTsConfigContentCache().get(filePath)?.contents).toBe('{}');
    });
  }

  it('shares failed deferred reads across consumers without retrying during discovery', async ({
    mock,
  }) => {
    const rootDir = normalizeToAbsolutePath(temporary);
    const filePath = normalizeToAbsolutePath(path.join(rootDir, 'custom.json'));
    fs.writeFileSync(filePath, '{}');
    const failure = new Error('Simulated deferred read failure');
    const read = mock.method(fs.promises, 'readFile', async () => {
      throw failure;
    });
    mock.method(generatedSourceStore, 'postProcess', async (_configuration, context) => {
      const results = await Promise.allSettled([
        context.getFile(filePath),
        context.getFile(filePath),
      ]);
      expect(results).toEqual([
        { status: 'rejected', reason: failure },
        { status: 'rejected', reason: failure },
      ]);
    });

    await initFileStoresForAnalysis(
      createConfiguration({ baseDir: rootDir, tsConfigPaths: ['custom.json'] }),
    );

    expect(read.mock.calls).toHaveLength(1);
    expect(getTsConfigContentCache().has(filePath)).toBe(false);
    expect(fileContentStore.has(filePath)).toBe(false);
  });

  it('does not require unused config observations during replay discovery', async () => {
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
      await initFileStoresForAnalysis(
        createConfiguration({ baseDir: rootDir }),
        createAnalyzableFiles(),
      );
      expect(tsConfigStore.getTsConfigs()).toEqual([
        normalizeToAbsolutePath(path.join(rootDir, 'tsconfig.json')),
      ]);
      expect(getTsConfigContentCache().size).toBe(0);
    } finally {
      replay.end();
    }
  });

  it('reloads changed source contents when discovery is invalidated without file events', async () => {
    const rootDir = normalizeToAbsolutePath(path.join(temporary, 'project'));
    fs.mkdirSync(rootDir);
    const source = normalizeToAbsolutePath(path.join(rootDir, 'source.ts'));
    fs.writeFileSync(source, 'const value = 1;');
    const configuration = createConfiguration({ baseDir: rootDir, sonarlint: true });
    await initFileStoresForAnalysis(configuration);
    expect(sourceFileStore.getFile(source)?.fileContent).toBe('const value = 1;');
    fs.writeFileSync(source, 'const value = 2;');
    sourceFileStore.clearCache();
    await initFileStores(configuration);
    expect(sourceFileStore.getFile(source)?.fileContent).toBe('const value = 2;');
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
      const archivePath = path.join(temporary, 'current.pb.gz');
      await initFileStoresForAnalysis(configuration, createAnalyzableFiles());
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
      expect(archive.get('kept.ts', 'readFile')).toBeUndefined();
      expect(archive.get('removed/source.ts', 'readFile')).toBeUndefined();
      for (const config of configs) {
        expect(archive.get(config, 'readFile')).toEqual({
          ok: true,
          value: Buffer.from('{"changed":true}'),
        });
      }
    });
  }
});
