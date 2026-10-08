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
import { spawnSync } from 'node:child_process';
import { afterEach, describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import { expect } from 'expect';
import { FS_CACHE_FORMAT_VERSION, FsCacheArchive } from '../../src/fs-cache/archive.js';
import {
  deserializeProtobufDocument,
  serializeProtobufDocument,
} from '../../src/fs-cache/archive-serialization.js';

const fixture = path.resolve(import.meta.dirname, 'fixtures/exercise-hook.mjs');
const fixtureRunner = path.resolve(import.meta.dirname, 'fixtures/run-with-fs-cache.mjs');
const workerFixture = path.resolve(import.meta.dirname, 'fixtures/exercise-worker-hook.mjs');
const workerBootstrapFixture = path.resolve(
  import.meta.dirname,
  'fixtures/exercise-worker-bootstrap.mjs',
);
const hookModule = pathToFileURL(
  path.resolve(import.meta.dirname, '../../../../lib/shared/src/fs-cache/hook.js'),
).href;
const futureFsMethodFixture = pathToFileURL(
  path.resolve(import.meta.dirname, 'fixtures/add-future-fs-method.mjs'),
).href;
const temporaryDirectories: string[] = [];

function temporaryDirectory() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sonarjs-fs-cache-'));
  temporaryDirectories.push(directory);
  return directory;
}

function loadArchive(archivePath: string, rootDir: string) {
  const archive = new FsCacheArchive({
    archivePath,
    rootDir,
  });
  archive.load();
  return archive;
}

function rewriteArchiveFormatVersion(archivePath: string, version: number) {
  const bytes = gunzipSync(fs.readFileSync(archivePath));
  const marker = bytes.indexOf(Buffer.from([0x10, FS_CACHE_FORMAT_VERSION]));
  expect(marker).toBeGreaterThanOrEqual(0);
  bytes[marker + 1] = version;
  fs.writeFileSync(archivePath, gzipSync(bytes));
}

function runHook({ archive, outside, root }: { archive: string; outside: string; root: string }) {
  return spawnSync(process.execPath, [fixtureRunner, archive, root, fixture, root, outside], {
    encoding: 'utf8',
  });
}

function runInlineHook({
  archive,
  passthroughDirs = [],
  preloads = [],
  root,
  script,
}: {
  archive: string;
  passthroughDirs?: string[];
  preloads?: string[];
  root: string;
  script: string;
}) {
  const scriptPath = path.join(temporaryDirectory(), 'inline.mjs');
  fs.writeFileSync(
    scriptPath,
    `const [filesystemCacheRoot, filesystemCacheArchive] = process.argv.slice(2);\n${script}`,
  );
  return spawnSync(
    process.execPath,
    [
      ...preloads.flatMap(preload => ['--import', preload]),
      fixtureRunner,
      archive,
      root,
      scriptPath,
      root,
      archive,
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        SONARJS_FS_CACHE_TEST_PASSTHROUGH_DIRS: JSON.stringify(passthroughDirs),
      },
    },
  );
}

function captureError(operation: () => unknown) {
  try {
    operation();
  } catch (error) {
    const filesystemError = error as NodeJS.ErrnoException;
    const errorPath = String(filesystemError.path);
    return {
      code: filesystemError.code,
      errno: filesystemError.errno,
      message: filesystemError.message.replaceAll(errorPath, '$PATH'),
      syscall: filesystemError.syscall,
    };
  }
  throw new Error('Expected a filesystem error');
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

describe('filesystem cache hook', () => {
  for (const caseSensitivePaths of [false, true]) {
    it(`preserves portable path spelling independently of lookup keys (${caseSensitivePaths})`, () => {
      const temporary = temporaryDirectory();
      const rootDir = path.join(temporary, 'project');
      const archive = new FsCacheArchive({
        rootDir,
        archivePath: path.join(temporary, 'case-values.pb.gz'),
        mode: 'record',
        caseSensitivePaths,
      });
      const file = path.join(rootDir, 'Src/Values.ts');
      // Populate the lookup cache first: serialized values must not reuse its folded key.
      expect(archive.keyFor(file)).toBe(caseSensitivePaths ? 'Src/Values.ts' : 'src/values.ts');
      expect(archive.encodePortablePath(file)).toEqual({ kind: 'relative', path: 'Src/Values.ts' });
      expect(archive.encodePortablePath(Buffer.from(file))).toEqual({
        kind: 'relative',
        path: 'Src/Values.ts',
      });
      expect(archive.encodePortablePath(pathToFileURL(file))).toEqual({
        kind: 'relative',
        path: 'Src/Values.ts',
      });
      expect(archive.encodePortablePath(`${rootDir}/Src/../Src/Values.ts`)).toEqual({
        kind: 'relative',
        path: 'Src/Values.ts',
      });
      expect(archive.encodePortablePath(rootDir)).toEqual({ kind: 'relative', path: '.' });
      const outside = path.join(temporary, 'other/Values.ts');
      expect(archive.encodePortablePath(outside)).toEqual({ kind: 'absolute', path: outside });
      expect(archive.decodePortablePath(archive.encodePortablePath(file))).toBe(file);
    });

    it(`preserves producer case sensitivity (${caseSensitivePaths}) after relocating an archive`, () => {
      const temporary = temporaryDirectory();
      const archivePath = path.join(temporary, 'case.pb.gz');
      const recorder = new FsCacheArchive({
        rootDir: path.join(temporary, 'ci'),
        archivePath,
        mode: 'record',
        caseSensitivePaths,
      });
      recorder.set('Src/Values.ts', 'readFile', {
        ok: true,
        value: Buffer.from('export const values = [1, 2];'),
      });
      recorder.set('Src/Missing.ts', 'exists', { ok: true, value: false });
      recorder.flush();
      const document = deserializeProtobufDocument(gunzipSync(fs.readFileSync(archivePath)));
      expect(document.caseSensitivePaths).toBe(caseSensitivePaths);
      const replay = loadArchive(archivePath, path.join(temporary, 'sqaa'));
      const exact = replay.keyFor(path.join(replay.rootDir, 'Src/Values.ts'))!;
      const alias = replay.keyFor(path.join(replay.rootDir, 'src/values.ts'))!;
      expect(replay.get(exact, 'readFile')).toMatchObject({ ok: true });
      expect(replay.get(alias, 'readFile')).toEqual(
        caseSensitivePaths ? undefined : replay.get(exact, 'readFile'),
      );
      expect(replay.getExists('src/missing.ts')).toBe(caseSensitivePaths ? undefined : false);
      expect(replay.keyFor(path.join(replay.rootDir + '-other', 'Src/Values.ts'))).toBeUndefined();
    });
  }

  it('keeps legacy archive keys case sensitive rather than assuming the receiver OS', () => {
    const temporary = temporaryDirectory();
    const archivePath = path.join(temporary, 'legacy.pb.gz');
    const recorder = new FsCacheArchive({
      rootDir: temporary,
      archivePath,
      mode: 'record',
      caseSensitivePaths: true,
    });
    recorder.set('Upper.ts', 'exists', { ok: true, value: true });
    recorder.flush();
    const document = deserializeProtobufDocument(gunzipSync(fs.readFileSync(archivePath)));
    delete document.caseSensitivePaths;
    fs.writeFileSync(archivePath, gzipSync(serializeProtobufDocument(document)));
    const replay = new FsCacheArchive({
      rootDir: temporary,
      archivePath,
      mode: 'replay',
      caseSensitivePaths: false,
    });
    replay.load();
    expect(replay.caseSensitivePaths).toBe(true);
    expect(replay.getExists('Upper.ts')).toBe(true);
    expect(replay.getExists('upper.ts')).toBeUndefined();
  });

  it('replays Windows-like lookup through every read API and rebases realpaths', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'ci');
    const replayRoot = path.join(temporary, 'sqaa');
    const archive = path.join(temporary, 'snapshot.pb.gz');
    fs.mkdirSync(path.join(root, 'Src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'Src/Values.ts'), 'snapshot contents');
    const script = `import fs from 'node:fs';
        import path from 'node:path';
        import assert from 'node:assert/strict';
        import { promisify } from 'node:util';
        import { installFsCache } from ${JSON.stringify(hookModule)};
        const filesystemCacheArchive = ${JSON.stringify(archive)};
        const ci = ${JSON.stringify(root)}, target = ${JSON.stringify(replayRoot)};
        const file = path.join(ci, 'Src/Values.ts');
        // Native realpaths expand Windows short-name aliases in the temporary root.
        const expectedRealpath = fs.realpathSync(file);
        const expectedNativeRealpath = fs.realpathSync.native(file);
        const cache = installFsCache();
        const record = cache.beginAnalysis({archivePath: filesystemCacheArchive, rootDir: ci, mode: 'record', caseSensitivePaths: false});
        fs.readFileSync(file);
        fs.statSync(file);
        const originalRealpath = fs.realpathSync(file);
        assert.equal(originalRealpath, expectedRealpath);
        assert.equal(fs.realpathSync(file), originalRealpath);
        const originalNativeRealpath = fs.realpathSync.native(file);
        assert.equal(originalNativeRealpath, expectedNativeRealpath);
        assert.equal(fs.realpathSync.native(file), originalNativeRealpath);
        const originalEntry = fs.readdirSync(path.join(ci, 'Src'), {withFileTypes: true})[0];
        assert.equal(originalEntry.parentPath, path.join(ci, 'Src'));
        assert.equal(fs.readdirSync(path.join(ci, 'Src'), {withFileTypes: true})[0].parentPath,
          originalEntry.parentPath);
        record.end();
        fs.rmSync(ci, {recursive:true});
        const replay = cache.beginAnalysis({archivePath: filesystemCacheArchive, rootDir: target, mode: 'replay', restrictNativeReads: true});
        const alias = path.join(target, 'sRC/vALUES.ts');
        assert.equal(fs.readFileSync(alias, 'utf8'), 'snapshot contents');
        assert.equal(await fs.promises.readFile(alias, 'utf8'), 'snapshot contents');
        assert.equal(await promisify(fs.readFile)(alias, 'utf8'), 'snapshot contents');
        assert.equal(fs.existsSync(alias), true);
        assert.equal(fs.statSync(alias).isFile(), true);
        assert.equal(fs.realpathSync(alias), path.join(target, 'Src/Values.ts'));
        assert.equal(fs.realpathSync.native(alias), path.join(target, 'Src/Values.ts'));
        assert.equal(await fs.promises.realpath(alias), path.join(target, 'Src/Values.ts'));
        assert.equal(await promisify(fs.realpath)(alias), path.join(target, 'Src/Values.ts'));
        const entries = fs.readdirSync(path.join(target, 'src'), {withFileTypes:true});
        assert.equal(entries[0].name, 'Values.ts');
        assert.equal(entries[0].isFile(), true);
        assert.equal(entries[0].parentPath, path.join(target, 'Src'));
        replay.end();
        console.log('portable lookup passed');`;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8',
    });
    expect(child.stderr).toBe('');
    expect(child.status).toBe(0);
    expect(child.stdout.trim()).toBe('portable lookup passed');
  });
  it('isolates replay from native files outside the snapshot while allowing explicit runtime paths', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'project');
    const runtime = path.join(temporary, 'runtime');
    const outside = path.join(temporary, 'outside.txt');
    const archive = path.join(temporary, 'archive.pb.gz');
    fs.mkdirSync(root);
    fs.mkdirSync(runtime);
    fs.writeFileSync(path.join(root, 'source.ts'), 'project');
    fs.writeFileSync(path.join(runtime, 'library.d.ts'), 'runtime');
    fs.writeFileSync(outside, 'must not leak into replay');
    const scriptPath = path.join(temporary, 'isolation.mjs');
    fs.writeFileSync(
      scriptPath,
      `
      import fs from 'node:fs';
      import { installFsCache } from ${JSON.stringify(hookModule)};
      const cache = installFsCache();
      const options = { rootDir: ${JSON.stringify(root)}, archivePath: ${JSON.stringify(archive)} };
      const record = cache.beginAnalysis({ ...options, mode: 'record' });
      fs.readFileSync(${JSON.stringify(path.join(root, 'source.ts'))}, 'utf8');
      record.end();
      const replay = cache.beginAnalysis({ ...options, mode: 'replay', restrictNativeReads: true, passthroughDirs: [${JSON.stringify(runtime)}] });
      const outside = ${JSON.stringify(outside)};
      const error = async operation => { try { await operation(); return 'unexpected success'; } catch (failure) { return failure.code; } };
      const result = {
        exists: fs.existsSync(outside),
        reads: await Promise.all([
          error(() => fs.readFileSync(outside)),
          error(() => fs.promises.readFile(outside)),
          error(() => fs.statSync(outside)),
          error(() => fs.openSync(outside, 'r')),
          error(() => fs.promises.open(outside, 'r')),
          error(() => new Promise((resolve, reject) => fs.open(outside, 'r', (failure, fd) => failure ? reject(failure) : resolve(fd)))),
        ]),
        project: fs.readFileSync(${JSON.stringify(path.join(root, 'source.ts'))}, 'utf8'),
        runtime: fs.readFileSync(${JSON.stringify(path.join(runtime, 'library.d.ts'))}, 'utf8'),
      };
      replay.end();
      console.log(JSON.stringify(result));
    `,
    );
    const result = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      exists: false,
      reads: Array(6).fill('ENOENT'),
      project: 'project',
      runtime: 'runtime',
    });
  });

  it('stores supplied decoded Unicode as UTF-8 while preserving native non-UTF-8 bytes', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'record');
    const replayRoot = path.join(temporary, 'replay');
    const archive = path.join(temporary, 'encoding.pb.gz');
    fs.mkdirSync(root);
    fs.mkdirSync(replayRoot);
    const originalBytes = Buffer.from('caf\u00e9', 'latin1');
    fs.writeFileSync(path.join(root, 'native.ts'), originalBytes);
    fs.writeFileSync(path.join(root, 'supplied.ts'), originalBytes);
    const supplied = 'caf\u00e9 \u6771\u4eac \ud83d\ude80';
    const scriptPath = path.join(temporary, 'encoding.mjs');
    fs.writeFileSync(
      scriptPath,
      `import fs from 'node:fs';
       import { installFsCache, captureProvidedFile } from ${JSON.stringify(hookModule)};
       const installation = installFsCache();
       const record = installation.beginAnalysis({rootDir: ${JSON.stringify(root)}, archivePath: ${JSON.stringify(archive)}, mode: 'record'});
       const native = fs.readFileSync(${JSON.stringify(path.join(root, 'native.ts'))});
       fs.readFileSync(${JSON.stringify(path.join(root, 'supplied.ts'))});
       captureProvidedFile(${JSON.stringify(path.join(root, 'supplied.ts'))}, ${JSON.stringify(supplied)});
       record.end();
       const replay = installation.beginAnalysis({rootDir: ${JSON.stringify(replayRoot)}, archivePath: ${JSON.stringify(archive)}, mode: 'replay'});
       const replayed = fs.readFileSync(${JSON.stringify(path.join(replayRoot, 'native.ts'))});
       const decoded = fs.readFileSync(${JSON.stringify(path.join(replayRoot, 'supplied.ts'))}, 'utf8');
       replay.end();
       console.log(JSON.stringify({native: native.toString('hex'), replayed: replayed.toString('hex'), decoded}));`,
    );
    const result = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toEqual({
      native: originalBytes.toString('hex'),
      replayed: originalBytes.toString('hex'),
      decoded: supplied,
    });
  });

  it('installs dormant filesystem wrappers when the analysis worker starts', () => {
    const result = spawnSync(process.execPath, [workerBootstrapFixture], {
      encoding: 'utf8',
    });

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      existsPromisify: true,
      installed: true,
      nativePassthrough: true,
      readPromisify: {
        bufferPreserved: true,
        bytesRead: 2,
      },
    });
  });

  it('recognizes normalized forward-slash project paths on Windows', t => {
    if (process.platform !== 'win32') {
      t.skip('Windows path semantics only');
      return;
    }

    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'root');
    const archive = new FsCacheArchive({
      archivePath: path.join(temporary, 'analysis.fscache'),
      rootDir: root,
    });
    const normalizedInput = path.join(root, 'src', 'input.ts').replaceAll('\\', '/');

    expect(archive.keyFor(normalizedInput)).toBe('src/input.ts');
  });

  it('preserves backslashes that are valid filename characters on POSIX', t => {
    if (process.platform === 'win32') {
      t.skip('POSIX path semantics only');
      return;
    }

    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'root');
    const archive = new FsCacheArchive({
      archivePath: path.join(temporary, 'analysis.fscache'),
      rootDir: root,
    });

    expect(archive.keyFor(path.join(root, 'src\\input.ts'))).toBe('src\\input.ts');
    expect(archive.keyFor(path.join(root, 'src', 'input.ts'))).toBe('src/input.ts');
  });

  it('silently falls back to lexical paths when the cache root cannot be resolved', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'missing-root');
    const archive = new FsCacheArchive({
      archivePath: path.join(temporary, 'analysis.fscache'),
      rootDir: root,
    });

    expect(archive.keyFor(path.join(root, 'input.ts'))).toBe('input.ts');
  });

  it('routes promisified filesystem calls through record and replay sessions', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'root');
    const archive = path.join(temporary, 'analysis.fscache');
    const input = path.join(root, 'input.ts');
    fs.mkdirSync(root);
    fs.writeFileSync(input, 'content');
    const script = `
      import fs from 'node:fs';
      import { promisify } from 'node:util';
      const input = filesystemCacheRoot + '/input.ts';
      const descriptor = fs.openSync(input, 'r');
      const target = Buffer.alloc(3);
      const result = await promisify(fs.read)(descriptor, target, 0, target.length, 0);
      fs.closeSync(descriptor);
      console.log(JSON.stringify({
        bufferPreserved: result.buffer === target,
        bytesRead: result.bytesRead,
        content: target.toString(),
        exists: await promisify(fs.exists)(input),
      }));
    `;
    const expected = {
      bufferPreserved: true,
      bytesRead: 3,
      content: 'con',
      exists: true,
    };

    const recorded = runInlineHook({ archive, root, script });
    expect(recorded.status).toBe(0);
    expect(JSON.parse(recorded.stdout)).toEqual(expected);

    fs.rmSync(root, { force: true, recursive: true });
    fs.mkdirSync(root);
    const replayed = runInlineHook({ archive, root, script });
    expect(replayed.status).toBe(0);
    expect(replayed.stderr).not.toContain('ERR_SONARJS_FS_CACHE_MISS');
    expect(JSON.parse(replayed.stdout)).toEqual(expected);
  });

  it('switches analysis archives while inactive filesystem calls stay native', () => {
    const temporary = temporaryDirectory();
    const recordRoot = path.join(temporary, 'record-root');
    const replayRoot = path.join(temporary, 'replay-root');
    const archive = path.join(temporary, 'analysis.fscache');
    const inactiveFile = path.join(temporary, 'inactive.txt');
    fs.mkdirSync(recordRoot);
    fs.writeFileSync(path.join(recordRoot, 'input.ts'), 'recorded content');
    const script = `
      import { installFsCache } from ${JSON.stringify(hookModule)};
      import fs from 'node:fs';
      const installation = installFsCache();
      const readFileSync = fs.readFileSync;
      fs.writeFileSync(${JSON.stringify(inactiveFile)}, 'before');
      const record = installation.beginAnalysis({
        archivePath: ${JSON.stringify(archive)},
        rootDir: ${JSON.stringify(recordRoot)},
      });
      let activeWriteError;
      try {
        fs.writeFileSync(${JSON.stringify(inactiveFile)}, 'during');
      } catch (error) {
        activeWriteError = error.code;
      }
      const recorded = readFileSync(${JSON.stringify(path.join(recordRoot, 'input.ts'))}, 'utf8');
      record.end();
      fs.rmSync(${JSON.stringify(recordRoot)}, { force: true, recursive: true });
      fs.mkdirSync(${JSON.stringify(replayRoot)});
      const replay = installation.beginAnalysis({
        archivePath: ${JSON.stringify(archive)},
        rootDir: ${JSON.stringify(replayRoot)},
      });
      const replayed = readFileSync(${JSON.stringify(path.join(replayRoot, 'input.ts'))}, 'utf8');
      replay.end();
      fs.writeFileSync(${JSON.stringify(inactiveFile)}, 'after');
      console.log(JSON.stringify({
        activeWriteError,
        inactive: readFileSync(${JSON.stringify(inactiveFile)}, 'utf8'),
        recorded,
        replayed,
      }));
    `;
    const scriptPath = path.join(temporary, 'switch-archives.mjs');
    fs.writeFileSync(scriptPath, script);
    const result = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      activeWriteError: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
      inactive: 'after',
      recorded: 'recorded content',
      replayed: 'recorded content',
    });
  });

  it('records and replays all import styles and read APIs from another root', () => {
    const temporary = temporaryDirectory();
    const recordRoot = path.join(temporary, 'record-root');
    const replayRoot = path.join(temporary, 'replay-root');
    const archive = path.join(temporary, 'analysis.fscache');
    const outside = path.join(temporary, 'outside.txt');
    fs.mkdirSync(path.join(recordRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(recordRoot, 'src', 'input.ts'), 'recorded content');
    fs.mkdirSync(path.join(recordRoot, 'src', 'nested'));
    fs.writeFileSync(path.join(recordRoot, 'src', 'nested', 'deep.ts'), 'nested content');
    fs.writeFileSync(outside, 'outside during record');

    const recorded = runHook({ archive, outside, root: recordRoot });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);
    const recordedResult = JSON.parse(recorded.stdout);
    expect(fs.statSync(archive).size).toBeGreaterThan(0);
    const inputNode = loadArchive(archive, recordRoot).entries.get('src/input.ts')!;
    expect(inputNode.exists).toBe(true);
    expect(inputNode.content?.ok).toBe(true);
    expect(inputNode.stats?.['stat:number'].ok).toBe(true);
    expect('operations' in inputNode).toBe(false);
    expect(recordedResult.openedDirectoryIsDir).toBe(true);

    fs.rmSync(recordRoot, { force: true, recursive: true });
    fs.mkdirSync(replayRoot, { recursive: true });
    fs.writeFileSync(path.join(replayRoot, 'missing.ts'), 'this did not exist during recording');
    fs.writeFileSync(outside, 'outside during replay');

    const replayed = runHook({ archive, outside, root: replayRoot });
    expect(replayed.stderr).toBe('');
    expect(replayed.status).toBe(0);
    const replayedResult = JSON.parse(replayed.stdout);

    expect(replayedResult.realpath).toBe('src/input.ts');
    expect({
      ...replayedResult,
      outside: recordedResult.outside,
      realpath: recordedResult.realpath,
    }).toEqual(recordedResult);
    expect(replayedResult.outside).toBe('outside during replay');
    expect(replayedResult.missingExists).toBe(false);
    expect(replayedResult.missingSoft).toBe(true);
    expect(replayedResult.missingStatCode).toBe('ENOENT');
    expect(replayedResult.openedDirectoryEntries).toContain('deep.ts');
    expect(replayedResult.optionalRead.pastEnd).toBe(0);
    expect(replayedResult.fdBigint.nanoseconds).toBe('bigint');
  });

  it('reuses consolidated filesystem state during record mode', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'root');
    const archive = path.join(temporary, 'consolidated.fscache');
    const file = path.join(root, 'input.ts');
    const directory = path.join(root, 'entries');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(file, 'cached content');
    fs.writeFileSync(path.join(directory, 'child.ts'), 'child');
    const script = `
      import { execFileSync } from 'node:child_process';
      import fs from 'node:fs';
      const file = ${JSON.stringify(file)};
      const directory = ${JSON.stringify(directory)};
      const content = fs.readFileSync(file, 'utf8');
      const size = fs.statSync(file).size;
      fs.statSync(file, { bigint: true });
      const names = fs.readdirSync(directory, { withFileTypes: true }).map(entry => entry.name);

      // Mutate from an unhooked child process to make reuse observable. The hooked filesystem
      // rejects renameSync, and production analyses treat the root as stable.
      execFileSync(process.execPath, [
        '--eval',
        "const fs = require('node:fs'); fs.renameSync(process.argv[1], process.argv[1] + '.moved'); fs.renameSync(process.argv[2], process.argv[2] + '.moved');",
        file,
        directory,
      ]);

      const promisedContent = await fs.promises.readFile(file, 'utf8');
      const promisedSize = (await fs.promises.stat(file)).size;
      const descriptor = fs.openSync(file, 'r');
      const descriptorContent = fs.readFileSync(descriptor, 'utf8');
      const descriptorSize = fs.fstatSync(descriptor).size;
      fs.closeSync(descriptor);
      const opened = fs.opendirSync(directory);
      const openedNames = [];
      let entry;
      while ((entry = opened.readSync()) !== null) openedNames.push(entry.name);
      opened.closeSync();
      const statistics = globalThis[Symbol.for('sonarjs.filesystemCache.installation')]
        .getStatistics();
      console.log(JSON.stringify({
        content,
        descriptorContent,
        descriptorSize,
        exists: fs.existsSync(file),
        names,
        openedNames,
        promisedContent,
        promisedSize,
        size,
        statistics,
      }));
    `;

    const recorded = runInlineHook({ archive, root, script });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);
    const result = JSON.parse(recorded.stdout);
    expect(result.statistics.hits).toBeGreaterThanOrEqual(5);
    expect(result.statistics.misses).toBeGreaterThanOrEqual(3);
    expect(result.statistics.paths).toBe(2);
    delete result.statistics;
    expect(result).toEqual({
      content: 'cached content',
      descriptorContent: 'cached content',
      descriptorSize: 14,
      exists: true,
      names: ['child.ts'],
      openedNames: ['child.ts'],
      promisedContent: 'cached content',
      promisedSize: 14,
      size: 14,
    });
  });

  it('returns native-shaped errors when consolidated state says a path is absent', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'root');
    const archive = path.join(temporary, 'missing.fscache');
    const missing = path.join(root, 'missing.ts');
    fs.mkdirSync(root);
    const nativeErrors = {
      readFile: captureError(() => fs.readFileSync(missing)),
      realpath: captureError(() => fs.realpathSync(missing)),
      realpathNative: captureError(() => fs.realpathSync.native(missing)),
    };
    const script = `
      import fs from 'node:fs';
      const missing = ${JSON.stringify(missing)};
      const snapshotError = error => {
        const errorPath = String(error.path);
        return {
          code: error.code,
          errno: error.errno,
          message: error.message.replaceAll(errorPath, '$PATH'),
          syscall: error.syscall,
        };
      };
      const captureError = operation => {
        try {
          operation();
        } catch (error) {
          return snapshotError(error);
        }
        throw new Error('Expected a filesystem error');
      };
      const captureAsyncError = async operation => {
        try {
          await operation();
        } catch (error) {
          return snapshotError(error);
        }
        throw new Error('Expected a filesystem error');
      };
      fs.existsSync(missing);
      console.log(JSON.stringify({
        callback: await new Promise(resolve => fs.realpath(missing, error => resolve(snapshotError(error)))),
        promise: await captureAsyncError(() => fs.promises.realpath(missing)),
        readFile: captureError(() => fs.readFileSync(missing)),
        realpath: captureError(() => fs.realpathSync(missing)),
        realpathNative: captureError(() => fs.realpathSync.native(missing)),
      }));
    `;

    const recorded = runInlineHook({ archive, root, script });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);
    expect(JSON.parse(recorded.stdout)).toEqual({
      ...nativeErrors,
      callback: nativeErrors.realpath,
      promise: nativeErrors.realpathNative,
    });
  });

  it('keeps dangling link existence separate from target existence', t => {
    const temporary = temporaryDirectory();
    const recordRoot = path.join(temporary, 'record-root');
    const replayRoot = path.join(temporary, 'replay-root');
    const archive = path.join(temporary, 'dangling-link.fscache');
    const link = path.join(recordRoot, 'dangling-link');
    fs.mkdirSync(recordRoot);
    try {
      fs.symlinkSync('missing-target', link, 'file');
    } catch (error) {
      if (process.platform === 'win32' && (error as NodeJS.ErrnoException).code === 'EPERM') {
        t.skip('Creating symbolic links requires Windows Developer Mode or elevated privileges');
        return;
      }
      throw error;
    }

    const script = `
      import fs from 'node:fs';
      import path from 'node:path';
      const link = path.join(filesystemCacheRoot, 'dangling-link');
      let statCode;
      try {
        fs.statSync(link);
      } catch (error) {
        statCode = error.code;
      }
      console.log(JSON.stringify({
        exists: fs.existsSync(link),
        isSymbolicLink: fs.lstatSync(link).isSymbolicLink(),
        statCode,
        target: fs.readlinkSync(link),
      }));
    `;

    const recorded = runInlineHook({ archive, root: recordRoot, script });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);
    expect(JSON.parse(recorded.stdout)).toEqual({
      exists: false,
      isSymbolicLink: true,
      statCode: 'ENOENT',
      target: 'missing-target',
    });
    const linkNode = loadArchive(archive, recordRoot).entries.get('dangling-link')!;
    expect(linkNode.exists).toBe(false);
    expect(linkNode.linkExists).toBe(true);

    fs.rmSync(recordRoot, { force: true, recursive: true });
    fs.mkdirSync(replayRoot);
    const replayed = runInlineHook({ archive, root: replayRoot, script });
    expect(replayed.stderr).toBe('');
    expect(replayed.status).toBe(0);
    expect(JSON.parse(replayed.stdout)).toEqual(JSON.parse(recorded.stdout));
  });

  for (const dangling of [false, true]) {
    it(`checks target existence after lstat of a ${dangling ? 'dangling' : 'live'} symlink`, t => {
      const temporary = temporaryDirectory();
      const recordRoot = path.join(temporary, 'record');
      const replayRoot = path.join(temporary, 'replay');
      const archive = path.join(temporary, 'symlink.fscache');
      fs.mkdirSync(recordRoot);
      fs.writeFileSync(path.join(recordRoot, 'target.txt'), 'target');
      try {
        fs.symlinkSync(
          dangling ? 'missing.txt' : 'target.txt',
          path.join(recordRoot, 'link'),
          'file',
        );
      } catch (error) {
        if (process.platform === 'win32' && (error as NodeJS.ErrnoException).code === 'EPERM') {
          t.skip('Creating symbolic links requires Windows Developer Mode or elevated privileges');
          return;
        }
        throw error;
      }
      const script = `
        import fs from 'node:fs';
        const link = filesystemCacheRoot + '/link';
        console.log(JSON.stringify({
          symbolic: fs.lstatSync(link).isSymbolicLink(),
          exists: fs.existsSync(link),
        }));
      `;
      const recorded = runInlineHook({ archive, root: recordRoot, script });
      expect(recorded.stderr).toBe('');
      expect(recorded.status).toBe(0);
      expect(JSON.parse(recorded.stdout)).toEqual({ symbolic: true, exists: !dangling });

      fs.rmSync(recordRoot, { force: true, recursive: true });
      fs.mkdirSync(replayRoot);
      const replayed = runInlineHook({ archive, root: replayRoot, script });
      expect(replayed.stderr).toBe('');
      expect(replayed.status).toBe(0);
      expect(JSON.parse(replayed.stdout)).toEqual(JSON.parse(recorded.stdout));
    });
  }

  it('does not record a late read into the following analysis session', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'root');
    const archive = path.join(temporary, 'first.fscache');
    const nextArchive = path.join(temporary, 'next.fscache');
    fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, 'late.txt'), 'previous request');
    fs.writeFileSync(path.join(root, 'marker.txt'), 'next request');
    const scriptPath = path.join(temporary, 'late-stat.mjs');
    fs.writeFileSync(
      scriptPath,
      `
      import fs from 'node:fs';
      import { installFsCache } from ${JSON.stringify(hookModule)};
      const cache = installFsCache();
      const rootDir = ${JSON.stringify(root)};
      const session = cache.beginAnalysis({ rootDir, archivePath: ${JSON.stringify(archive)}, mode: 'record' });
      const pending = fs.promises.stat(rootDir + '/late.txt');
      session.end();
      const next = cache.beginAnalysis({ rootDir, archivePath: ${JSON.stringify(nextArchive)}, mode: 'record' });
      fs.readFileSync(rootDir + '/marker.txt');
      await pending;
      next.end();
    `,
    );
    const result = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect([...loadArchive(nextArchive, root).entries.keys()]).toEqual(['marker.txt']);
  });

  for (const api of ['callback', 'promise']) {
    it(`rejects a late ${api} readonly replay open instead of handing out a stale descriptor`, () => {
      const temporary = temporaryDirectory();
      const root = path.join(temporary, 'root');
      const archive = path.join(temporary, 'readonly.fscache');
      fs.mkdirSync(root);
      fs.writeFileSync(path.join(root, 'marker.txt'), 'project input');
      const scriptPath = path.join(temporary, 'late-replay-open.mjs');
      fs.writeFileSync(
        scriptPath,
        `
        import fs from 'node:fs';
        import { installFsCache } from ${JSON.stringify(hookModule)};
        const cache = installFsCache();
        const rootDir = ${JSON.stringify(root)};
        const archivePath = ${JSON.stringify(archive)};
        const record = cache.beginAnalysis({ rootDir, archivePath, mode: 'record' });
        fs.closeSync(fs.openSync(rootDir + '/marker.txt', 'r'));
        record.end();
        const replay = cache.beginAnalysis({ rootDir, archivePath, mode: 'replay' });
        const pending = ${api === 'callback' ? `new Promise(resolve => fs.open(rootDir + '/marker.txt', 'r', error => resolve(error?.code)))` : `fs.promises.open(rootDir + '/marker.txt', 'r').then(() => undefined, error => error.code)`};
        replay.end();
        console.log(JSON.stringify({ error: await pending }));
      `,
      );
      const result = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });
      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ error: 'ERR_SONARJS_FS_CACHE_SESSION_ENDED' });
    });

    for (const nextSession of [false, true]) {
      it(`settles a late ${api} open after session end${nextSession ? ' while another session is active' : ''}`, () => {
        const temporary = temporaryDirectory();
        const root = path.join(temporary, 'root');
        const work = path.join(temporary, 'work');
        const archive = path.join(temporary, 'first.fscache');
        const nextArchive = path.join(temporary, 'next.fscache');
        fs.mkdirSync(root);
        fs.mkdirSync(work);
        fs.writeFileSync(path.join(root, 'marker.txt'), 'project input');
        const scriptPath = path.join(temporary, 'late-open.mjs');
        fs.writeFileSync(
          scriptPath,
          `
          import fs from 'node:fs';
          import { installFsCache } from ${JSON.stringify(hookModule)};
          const cache = installFsCache();
          const rootDir = ${JSON.stringify(root)};
          const output = ${JSON.stringify(path.join(work, 'output.udg'))};
          const session = cache.beginAnalysis({
            rootDir,
            archivePath: ${JSON.stringify(archive)},
            mode: 'record',
            passthroughDirs: [${JSON.stringify(work)}],
          });
          fs.readFileSync(rootDir + '/marker.txt');
          const opened = ${
            api === 'callback'
              ? `new Promise(resolve => fs.open(output, 'w', (error, fd) => {
                if (!error) fs.closeSync(fd);
                resolve(error?.code);
              }))`
              : `fs.promises.open(output, 'w').then(async handle => {
                await handle.close();
                return undefined;
              }, error => error.code)`
          };
          session.end();
          const next = ${
            nextSession
              ? `cache.beginAnalysis({
            rootDir,
            archivePath: ${JSON.stringify(nextArchive)},
            mode: 'record',
          })`
              : 'undefined'
          };
          if (next) fs.readFileSync(rootDir + '/marker.txt');
          const error = await opened;
          next?.end();
          console.log(JSON.stringify({ error }));
        `,
        );
        const result = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });
        expect(result.stderr).toBe('');
        expect(result.status).toBe(0);
        expect(JSON.parse(result.stdout)).toEqual({ error: 'ERR_SONARJS_FS_CACHE_SESSION_ENDED' });
        expect([...loadArchive(archive, root).entries.keys()]).toEqual(['marker.txt']);
        if (nextSession) {
          expect([...loadArchive(nextArchive, root).entries.keys()]).toEqual(['marker.txt']);
        }
      });
    }
  }

  it('reuses portable realpaths across result encodings and root aliases', t => {
    const temporary = temporaryDirectory();
    const physicalRecordRoot = path.join(temporary, 'record-storage');
    const recordRoot = path.join(temporary, 'record-root');
    const replayRoot = path.join(temporary, 'replay-root');
    const archive = path.join(temporary, 'realpath-encodings.fscache');
    fs.mkdirSync(path.join(physicalRecordRoot, 'Target'), { recursive: true });
    try {
      fs.symlinkSync(
        physicalRecordRoot,
        recordRoot,
        process.platform === 'win32' ? 'junction' : 'dir',
      );
    } catch (error) {
      if (process.platform === 'win32' && (error as NodeJS.ErrnoException).code === 'EPERM') {
        t.skip('Creating directory aliases requires Windows Developer Mode or elevated privileges');
        return;
      }
      throw error;
    }
    const script = `
      import fs from 'node:fs';
      import path from 'node:path';
      const target = path.join(filesystemCacheRoot, 'Target');
      console.log(JSON.stringify({
        regular: {
          utf8: fs.realpathSync(target),
          buffer: fs.realpathSync(target, 'buffer').toString(),
          hex: fs.realpathSync(target, 'hex'),
          base64: await new Promise((resolve, reject) =>
            fs.realpath(target, 'base64', (error, value) =>
              error ? reject(error) : resolve(value),
            ),
          ),
        },
        native: {
          utf8: fs.realpathSync.native(target),
          buffer: fs.realpathSync.native(target, 'buffer').toString(),
          hex: fs.realpathSync.native(target, 'hex'),
          base64: await new Promise((resolve, reject) =>
            fs.realpath.native(target, 'base64', (error, value) =>
              error ? reject(error) : resolve(value),
            ),
          ),
        },
        promise: {
          utf8: await fs.promises.realpath(target),
          buffer: (await fs.promises.realpath(target, 'buffer')).toString(),
          hex: await fs.promises.realpath(target, 'hex'),
          base64: await fs.promises.realpath(target, 'base64'),
        },
      }));
    `;
    const encodedResults = (utf8: string) => ({
      utf8,
      buffer: utf8,
      hex: Buffer.from(utf8).toString('hex'),
      base64: Buffer.from(utf8).toString('base64'),
    });

    const recorded = runInlineHook({ archive, root: recordRoot, script });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);
    const recordedResult = JSON.parse(recorded.stdout);
    expect(recordedResult.regular).toEqual(encodedResults(recordedResult.regular.utf8));
    expect(recordedResult.native).toEqual(encodedResults(recordedResult.native.utf8));
    expect(recordedResult.promise).toEqual(encodedResults(recordedResult.native.utf8));

    fs.rmSync(recordRoot, { force: true, recursive: true });
    fs.mkdirSync(replayRoot);
    const replayed = runInlineHook({ archive, root: replayRoot, script });
    expect(replayed.stderr).toBe('');
    expect(replayed.status).toBe(0);
    expect(JSON.parse(replayed.stdout)).toEqual({
      regular: encodedResults(path.join(replayRoot, 'Target')),
      native: encodedResults(path.join(replayRoot, 'Target')),
      promise: encodedResults(path.join(replayRoot, 'Target')),
    });
  });

  it('treats an existing archive as an immutable strict cache', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'root');
    const archive = path.join(temporary, 'flush-isolation.fscache');
    const existing = path.join(root, 'existing.ts');
    const current = path.join(root, 'current.ts');
    fs.mkdirSync(root);
    fs.writeFileSync(existing, 'previous analysis');
    const initial = runInlineHook({
      archive,
      root,
      script: `
        import fs from 'node:fs';
        fs.readFileSync(${JSON.stringify(existing)}, 'utf8');
      `,
    });
    expect(initial.stderr).toBe('');
    expect(initial.status).toBe(0);

    fs.writeFileSync(existing, 'current analysis');
    fs.writeFileSync(current, 'not present in the archive');
    const replay = runInlineHook({
      archive,
      root,
      script: `
        import fs from 'node:fs';
        console.log(fs.readFileSync(${JSON.stringify(existing)}, 'utf8'));
        fs.readFileSync(${JSON.stringify(current)}, 'utf8');
      `,
    });
    expect(replay.status).not.toBe(0);
    expect(replay.stdout.trim()).toBe('previous analysis');
    expect(replay.stderr).toContain('ERR_SONARJS_FS_CACHE_MISS');
  });

  it('does not replace an incompatible existing archive', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'root');
    const archive = path.join(temporary, 'incompatible.fscache');
    const file = path.join(root, 'input.ts');
    fs.mkdirSync(root);
    fs.writeFileSync(file, 'content');
    const script = `
      import fs from 'node:fs';
      fs.readFileSync(${JSON.stringify(file)}, 'utf8');
    `;

    const initial = runInlineHook({
      archive,
      root,
      script,
    });
    expect(initial.stderr).toBe('');
    expect(initial.status).toBe(0);

    rewriteArchiveFormatVersion(archive, FS_CACHE_FORMAT_VERSION - 1);
    const incompatible = runInlineHook({ archive, root, script });
    expect(incompatible.status).not.toBe(0);
    expect(incompatible.stderr).toContain(
      `Unsupported filesystem cache format ${FS_CACHE_FORMAT_VERSION - 1}`,
    );
  });

  it('rejects corrupt and incompatible archives', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'root');
    const archive = path.join(temporary, 'analysis.fscache');
    const outside = path.join(temporary, 'outside.txt');
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', 'input.ts'), 'content');
    fs.writeFileSync(outside, 'outside');

    fs.writeFileSync(archive, 'not an archive');
    const corrupt = runHook({ archive, outside, root });
    expect(corrupt.status).not.toBe(0);
    expect(corrupt.stderr).toContain('Cannot read filesystem cache archive');

    fs.rmSync(archive);
    const recorded = runHook({ archive, outside, root });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);

    rewriteArchiveFormatVersion(archive, 1);
    const oldFormat = runHook({ archive, outside, root });
    expect(oldFormat.status).not.toBe(0);
    expect(oldFormat.stderr).toContain(
      `Unsupported filesystem cache format 1; expected ${FS_CACHE_FORMAT_VERSION}`,
    );
  });

  it('preserves native opendir order for non-alphabetically created entries', () => {
    const temporary = temporaryDirectory();
    const recordRoot = path.join(temporary, 'record-root');
    const replayRoot = path.join(temporary, 'replay-root');
    const archive = path.join(temporary, 'directory-order.fscache');
    const directory = path.join(recordRoot, 'entries');
    fs.mkdirSync(directory, { recursive: true });
    for (const name of ['zeta', 'beta', 'alpha', 'mid']) {
      fs.writeFileSync(path.join(directory, name), name);
    }
    const script = `
      import fs from 'node:fs';
      import path from 'node:path';
      const directory = path.join(filesystemCacheRoot, 'entries');
      const syncDirectory = fs.opendirSync(directory);
      const sync = [];
      let entry;
      while ((entry = syncDirectory.readSync()) !== null) sync.push(entry.name);
      syncDirectory.closeSync();
      const promisedDirectory = await fs.promises.opendir(directory);
      const promised = [];
      for await (const promisedEntry of promisedDirectory) promised.push(promisedEntry.name);
      console.log(JSON.stringify({ promised, sync }));
    `;

    const recorded = runInlineHook({ archive, root: recordRoot, script });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);
    const recordedResult = JSON.parse(recorded.stdout);
    expect(recordedResult.sync).toHaveLength(4);

    fs.rmSync(recordRoot, { force: true, recursive: true });
    fs.mkdirSync(replayRoot);
    const replayed = runInlineHook({ archive, root: replayRoot, script });
    expect(replayed.stderr).toBe('');
    expect(replayed.status).toBe(0);
    expect(JSON.parse(replayed.stdout)).toEqual(recordedResult);
  });

  it('supports omitted-buffer and options-only FileHandle reads during replay', () => {
    const temporary = temporaryDirectory();
    const recordRoot = path.join(temporary, 'record-root');
    const replayRoot = path.join(temporary, 'replay-root');
    const archive = path.join(temporary, 'file-handle-read.fscache');
    fs.mkdirSync(recordRoot);
    fs.writeFileSync(path.join(recordRoot, 'input.ts'), 'recorded content');
    const script = `
      import fs from 'node:fs';
      import path from 'node:path';
      const file = path.join(filesystemCacheRoot, 'input.ts');
      const defaultHandle = await fs.promises.open(file);
      const defaultRead = await defaultHandle.read();
      await defaultHandle.close();
      const positionedHandle = await fs.promises.open(file);
      const positionedRead = await positionedHandle.read({ position: 0 });
      await positionedHandle.close();
      console.log(JSON.stringify({
        defaultRead: defaultRead.buffer.subarray(0, defaultRead.bytesRead).toString(),
        positionedRead: positionedRead.buffer.subarray(0, positionedRead.bytesRead).toString(),
      }));
    `;

    const recorded = runInlineHook({ archive, root: recordRoot, script });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);

    fs.rmSync(recordRoot, { force: true, recursive: true });
    fs.mkdirSync(replayRoot);
    const replayed = runInlineHook({ archive, root: replayRoot, script });
    expect(replayed.stderr).toBe('');
    expect(replayed.status).toBe(0);
    expect(JSON.parse(replayed.stdout)).toEqual(JSON.parse(recorded.stdout));
  });

  it('shares cache entries across equivalent read-only open flags and API forms', () => {
    const temporary = temporaryDirectory();
    const recordRoot = path.join(temporary, 'record-root');
    const replayRoot = path.join(temporary, 'replay-root');
    const archive = path.join(temporary, 'open-flags.fscache');
    fs.mkdirSync(recordRoot);
    fs.writeFileSync(path.join(recordRoot, 'input.ts'), 'recorded content');
    const recordScript = `
      import fs from 'node:fs';
      import path from 'node:path';
      const file = path.join(filesystemCacheRoot, 'input.ts');
      const fd = fs.openSync(file, fs.constants.O_RDONLY);
      console.log(fs.readFileSync(fd, 'utf8'));
      fs.closeSync(fd);
    `;
    const replayScript = `
      import fs from 'node:fs';
      import path from 'node:path';
      const file = path.join(filesystemCacheRoot, 'input.ts');
      const handle = await fs.promises.open(file);
      console.log(await handle.readFile('utf8'));
      await handle.close();
    `;

    const recorded = runInlineHook({
      archive,
      root: recordRoot,
      script: recordScript,
    });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);

    fs.rmSync(recordRoot, { force: true, recursive: true });
    fs.mkdirSync(replayRoot);
    const replayed = runInlineHook({
      archive,
      root: replayRoot,
      script: replayScript,
    });
    expect(replayed.stderr).toBe('');
    expect(replayed.status).toBe(0);
    expect(replayed.stdout).toBe(recorded.stdout);
  });

  it('recovers stale archive locks', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'root');
    const archive = path.join(temporary, 'stale-lock.fscache');
    const lock = `${archive}.lock`;
    fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, 'input.ts'), 'recorded content');
    fs.writeFileSync(lock, 'orphaned lock');
    const staleTime = new Date(Date.now() - 60_000);
    fs.utimesSync(lock, staleTime, staleTime);
    const script = `
      import fs from 'node:fs';
      import path from 'node:path';
      console.log(fs.readFileSync(path.join(filesystemCacheRoot, 'input.ts'), 'utf8'));
    `;

    const recorded = runInlineHook({ archive, root, script });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);
    expect(recorded.stdout.trim()).toBe('recorded content');
    expect(fs.existsSync(archive)).toBe(true);
    expect(fs.existsSync(lock)).toBe(false);
  });

  it('keeps exit-time archive flush failures nonfatal', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'root');
    const archive = path.join(temporary, 'broken-at-exit.fscache');
    fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, 'input.ts'), 'analysis result');
    const script = `
      import { execFileSync } from 'node:child_process';
      import fs from 'node:fs';
      import path from 'node:path';
      import { installFsCache } from ${JSON.stringify(hookModule)};
      const [filesystemCacheRoot, filesystemCacheArchive] = process.argv.slice(2);
      installFsCache().beginAnalysis({
        archivePath: filesystemCacheArchive,
        rootDir: filesystemCacheRoot,
      });
      const result = fs.readFileSync(
        path.join(filesystemCacheRoot, 'input.ts'),
        'utf8',
      );
      execFileSync(process.execPath, [
        '--eval',
        "require('node:fs').writeFileSync(process.argv[1], 'not an archive')",
        filesystemCacheArchive,
      ]);
      console.log(result);
    `;

    const scriptPath = path.join(temporary, 'fail-exit-flush.mjs');
    fs.writeFileSync(scriptPath, script);
    const recorded = spawnSync(process.execPath, [scriptPath, root, archive], {
      encoding: 'utf8',
    });
    expect(recorded.status).toBe(0);
    expect(recorded.stdout.trim()).toBe('analysis result');
    expect(recorded.stderr).toContain('Cannot write filesystem cache archive');
    expect(recorded.stderr).toContain('Cannot read filesystem cache archive');
  });

  it('keeps session-end archive flush failures nonfatal and returns to native fs', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'root');
    const archive = path.join(temporary, 'broken-at-end.fscache');
    const afterSession = path.join(temporary, 'after-session.txt');
    fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, 'input.ts'), 'analysis result');
    const script = `
      import { execFileSync } from 'node:child_process';
      import fs from 'node:fs';
      import path from 'node:path';
      import { installFsCache } from ${JSON.stringify(hookModule)};
      const [filesystemCacheRoot, filesystemCacheArchive, afterSession] = process.argv.slice(2);
      const session = installFsCache().beginAnalysis({
        archivePath: filesystemCacheArchive,
        rootDir: filesystemCacheRoot,
      });
      const result = fs.readFileSync(path.join(filesystemCacheRoot, 'input.ts'), 'utf8');
      execFileSync(process.execPath, [
        '--eval',
        "require('node:fs').writeFileSync(process.argv[1], 'not an archive')",
        filesystemCacheArchive,
      ]);
      session.end();
      fs.writeFileSync(afterSession, 'native fs restored');
      console.log(result);
    `;

    const scriptPath = path.join(temporary, 'fail-end-flush.mjs');
    fs.writeFileSync(scriptPath, script);
    const recorded = spawnSync(process.execPath, [scriptPath, root, archive, afterSession], {
      encoding: 'utf8',
    });
    expect(recorded.status).toBe(0);
    expect(recorded.stdout.trim()).toBe('analysis result');
    expect(recorded.stderr).toContain('Cannot write filesystem cache archive');
    expect(recorded.stderr).toContain('Cannot read filesystem cache archive');
    expect(fs.readFileSync(afterSession, 'utf8')).toBe('native fs restored');
  });

  it('records and replays filesystem access from a worker session', () => {
    const temporary = temporaryDirectory();
    const recordRoot = path.join(temporary, 'record-root');
    const replayRoot = path.join(temporary, 'replay-root');
    const archive = path.join(temporary, 'worker.fscache');
    fs.mkdirSync(recordRoot);
    fs.writeFileSync(path.join(recordRoot, 'main-input.ts'), 'read in main');
    fs.writeFileSync(path.join(recordRoot, 'worker-input.ts'), 'read in worker');
    const recorded = spawnSync(
      process.execPath,
      [fixtureRunner, archive, recordRoot, workerFixture, recordRoot, archive],
      { encoding: 'utf8' },
    );
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);
    expect(recorded.stdout.trim()).toBe('read in main|read in worker');
    expect(fs.existsSync(archive)).toBe(true);

    fs.rmSync(recordRoot, { force: true, recursive: true });
    fs.mkdirSync(replayRoot);
    const replayed = spawnSync(
      process.execPath,
      [fixtureRunner, archive, replayRoot, workerFixture, replayRoot, archive],
      { encoding: 'utf8' },
    );
    expect(replayed.status).toBe(0);
    expect(replayed.stdout.trim()).toBe('read in main|read in worker');
  });

  it('replays read errors for descriptors whose contents could not be captured', t => {
    if (process.platform === 'win32') {
      t.skip('Windows does not allow directories to be opened as read-only descriptors');
      return;
    }

    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'root');
    const archive = path.join(temporary, 'directory.fscache');
    fs.mkdirSync(root);
    const script = `
      import fs from 'node:fs';
      const fd = fs.openSync(filesystemCacheRoot, 'r');
      try {
        fs.readSync(fd, Buffer.alloc(1), 0, 1, null);
      } catch (error) {
        console.log(error.code);
      } finally {
        fs.closeSync(fd);
      }
    `;
    const recorded = runInlineHook({ archive, root, script });
    expect(recorded.status).toBe(0);
    expect(recorded.stdout.trim()).toBe('EISDIR');

    const replayed = runInlineHook({ archive, root, script });
    expect(replayed.status).toBe(0);
    expect(replayed.stdout.trim()).toBe('EISDIR');
    expect(replayed.stderr).not.toContain('ERR_SONARJS_FS_CACHE_MISS');
  });

  it('rejects unrecorded paths when an archive already exists', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'root');
    const archive = path.join(temporary, 'analysis.fscache');
    const outside = path.join(temporary, 'outside.txt');
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', 'input.ts'), 'content');
    fs.writeFileSync(outside, 'outside');
    const recorded = runHook({ archive, outside, root });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);

    const document = path.join(root, 'unrecorded.json');
    fs.writeFileSync(document, '{}');
    const script = `import fs from 'node:fs'; console.log(fs.readFileSync(${JSON.stringify(document)}, 'utf8'));`;
    const replayed = runInlineHook({ archive, root, script });
    expect(replayed.status).not.toBe(0);
    expect(replayed.stderr).toContain('ERR_SONARJS_FS_CACHE_MISS');
  });

  it('keeps the analyzer output tree fully native while rejecting crossing operations', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'root');
    const passthrough = path.join(root, '.scannerwork');
    const archive = path.join(temporary, 'analysis.fscache');
    fs.mkdirSync(root);
    const script = `
      import fs from 'node:fs';
      import path from 'node:path';
      const outputDirectory = path.join(filesystemCacheRoot, '.scannerwork', 'architecture', 'ts');
      fs.mkdirSync(outputDirectory, { recursive: true });
      const output = path.join(outputDirectory, 'main.udg');
      fs.writeFileSync(output, 'generated');
      fs.appendFileSync(output, '-appended');
      const callbackOutput = path.join(outputDirectory, 'callback.udg');
      await new Promise((resolve, reject) => fs.writeFile(callbackOutput, 'callback', error =>
        error ? reject(error) : resolve()));
      const promiseDirectory = path.join(outputDirectory, 'promise');
      await fs.promises.mkdir(promiseDirectory);
      const promiseOutput = path.join(promiseDirectory, 'promise.udg');
      await fs.promises.writeFile(promiseOutput, 'promise');
      const copiedOutput = path.join(outputDirectory, 'copied.udg');
      fs.copyFileSync(output, copiedOutput);
      const renamedOutput = path.join(outputDirectory, 'renamed.udg');
      fs.renameSync(copiedOutput, renamedOutput);
      const streamOutput = path.join(outputDirectory, 'stream.udg');
      await new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(streamOutput);
        stream.on('error', reject);
        stream.end('stream', resolve);
      });
      const descriptorOutput = path.join(outputDirectory, 'descriptor.udg');
      const descriptor = fs.openSync(descriptorOutput, 'w');
      fs.writeSync(descriptor, 'descriptor');
      fs.closeSync(descriptor);
      const handleOutput = path.join(outputDirectory, 'handle.udg');
      const handle = await fs.promises.open(handleOutput, 'w');
      await handle.writeFile('handle');
      await handle.close();
      let projectMutation;
      try {
        fs.mkdirSync(path.join(filesystemCacheRoot, 'generated'));
      } catch (error) {
        projectMutation = { code: error.code, message: error.message };
      }
      let crossingMutation;
      try {
        fs.copyFileSync(output, path.join(filesystemCacheRoot, 'copied-out.udg'));
      } catch (error) {
        crossingMutation = { code: error.code, message: error.message };
      }
      console.log(JSON.stringify({
        content: fs.readFileSync(output, 'utf8'),
        crossingMutation,
        futurePromise: await fs.promises.futureRead(output),
        futureSync: fs.futureRead(output),
        projectMutation,
      }));
    `;
    const result = runInlineHook({
      archive,
      passthroughDirs: [passthrough],
      preloads: [futureFsMethodFixture],
      root,
      script,
    });

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      content: 'generated-appended',
      crossingMutation: {
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs.copyFileSync from Node ${process.version}`,
      },
      futurePromise: 'unexpected native result',
      futureSync: 'unexpected native result',
      projectMutation: {
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs.mkdirSync from Node ${process.version}`,
      },
    });
    expect(fs.readFileSync(path.join(passthrough, 'architecture', 'ts', 'main.udg'), 'utf8')).toBe(
      'generated-appended',
    );
    const outputDirectory = path.join(passthrough, 'architecture', 'ts');
    expect(fs.readFileSync(path.join(outputDirectory, 'callback.udg'), 'utf8')).toBe('callback');
    expect(fs.readFileSync(path.join(outputDirectory, 'promise', 'promise.udg'), 'utf8')).toBe(
      'promise',
    );
    expect(fs.readFileSync(path.join(outputDirectory, 'renamed.udg'), 'utf8')).toBe(
      'generated-appended',
    );
    expect(fs.readFileSync(path.join(outputDirectory, 'stream.udg'), 'utf8')).toBe('stream');
    expect(fs.readFileSync(path.join(outputDirectory, 'descriptor.udg'), 'utf8')).toBe(
      'descriptor',
    );
    expect(fs.readFileSync(path.join(outputDirectory, 'handle.udg'), 'utf8')).toBe('handle');
    expect(fs.existsSync(path.join(root, 'copied-out.udg'))).toBe(false);
  });

  it('rejects every unpatched filesystem operation', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'root');
    const archive = path.join(temporary, 'analysis.fscache');
    fs.mkdirSync(root);
    const script = `
      import fs from 'node:fs';
      import fsPromises from 'node:fs/promises';
      import { createRequire } from 'node:module';
      const commonJsFs = createRequire(import.meta.url)('node:fs');
      const fsNamespace = await import('node:fs');
      const fsPromisesNamespace = await import('node:fs/promises');
      const capture = async operation => {
        try {
          await operation();
          return { calledNative: true };
        } catch (error) {
          return { code: error.code, message: error.message, name: error.name };
        }
      };
      const captureRejection = operation => operation().then(
        () => ({ calledNative: true }),
        error => ({ code: error.code, message: error.message, name: error.name }),
      );
      const captureSynchronousThrow = operation => {
        try {
          operation();
          return { calledNative: true };
        } catch (error) {
          return { code: error.code, message: error.message, name: error.name };
        }
      };
      fs.writeSync(1, 'stdio writeSync stays available\\n');
      console.log(JSON.stringify({
        asyncIterables: [
          captureSynchronousThrow(() => fsPromises.glob('*')),
          captureSynchronousThrow(() => fsPromises.watch('.')),
        ],
        baseline: await Promise.all([
          capture(() => fs.cpSync('unused-source', 'unused-target')),
          capture(() => commonJsFs.createReadStream('unused')),
          captureRejection(() => fsPromises.cp('unused-source', 'unused-target')),
          capture(() => fs.writeSync(42, 'unused')),
          capture(() => fs.openSync('unused', 'w')),
          capture(() => fs.readSync(42, Buffer.alloc(1), 0, 1, null)),
          capture(() => fs.readFileSync(42)),
          capture(() => fs.fstatSync(42)),
          capture(() => fs.closeSync(42)),
          captureRejection(() => fsPromises.open('unused', 'w')),
          captureRejection(() => fsPromises.readFile({ fd: 42, readFile() {} })),
        ]),
        runtime: {
          fs: typeof fsNamespace.mkdtempDisposableSync === 'function'
            ? await capture(() => fsNamespace.mkdtempDisposableSync('unused'))
            : null,
          promises: typeof fsPromisesNamespace.mkdtempDisposable === 'function'
            ? await capture(() => fsPromisesNamespace.mkdtempDisposable('unused'))
            : null,
        },
        simulated: await Promise.all([
          capture(() => fs.futureRead()),
          capture(() => commonJsFs.futureRead()),
          capture(() => fs.futureLazyRead()),
          captureRejection(() => fsPromises.futureRead()),
        ]),
      }));
    `;
    const result = runInlineHook({ archive, preloads: [futureFsMethodFixture], root, script });

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    const [writeSyncOutput, jsonOutput] = result.stdout.trimEnd().split(/\r?\n/);
    expect(writeSyncOutput).toBe('stdio writeSync stays available');
    const output = JSON.parse(jsonOutput);
    expect(output.asyncIterables).toEqual([
      {
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs/promises.glob from Node ${process.version}`,
        name: 'UnsupportedFsOperationError',
      },
      {
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs/promises.watch from Node ${process.version}`,
        name: 'UnsupportedFsOperationError',
      },
    ]);
    expect(output.baseline).toEqual([
      {
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs.cpSync from Node ${process.version}`,
        name: 'UnsupportedFsOperationError',
      },
      {
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs.createReadStream from Node ${process.version}`,
        name: 'UnsupportedFsOperationError',
      },
      {
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs/promises.cp from Node ${process.version}`,
        name: 'UnsupportedFsOperationError',
      },
      {
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs.writeSync outside stdout or stderr from Node ${process.version}`,
        name: 'UnsupportedFsOperationError',
      },
      {
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs.openSync with write-capable flags from Node ${process.version}`,
        name: 'UnsupportedFsOperationError',
      },
      {
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs.readSync with an unknown descriptor from Node ${process.version}`,
        name: 'UnsupportedFsOperationError',
      },
      {
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs.readFileSync with an unknown descriptor from Node ${process.version}`,
        name: 'UnsupportedFsOperationError',
      },
      {
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs.fstatSync with an unknown descriptor from Node ${process.version}`,
        name: 'UnsupportedFsOperationError',
      },
      {
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs.closeSync with an unknown descriptor from Node ${process.version}`,
        name: 'UnsupportedFsOperationError',
      },
      {
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs/promises.open with write-capable flags from Node ${process.version}`,
        name: 'UnsupportedFsOperationError',
      },
      {
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs/promises.readFile with an unknown FileHandle from Node ${process.version}`,
        name: 'UnsupportedFsOperationError',
      },
    ]);
    expect(output.simulated).toEqual([
      {
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs.futureRead from Node ${process.version}`,
        name: 'UnsupportedFsOperationError',
      },
      {
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs.futureRead from Node ${process.version}`,
        name: 'UnsupportedFsOperationError',
      },
      {
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs.futureLazyRead from Node ${process.version}`,
        name: 'UnsupportedFsOperationError',
      },
      {
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs/promises.futureRead from Node ${process.version}`,
        name: 'UnsupportedFsOperationError',
      },
    ]);
    if (typeof fs.mkdtempDisposableSync === 'function') {
      expect(output.runtime.fs).toEqual({
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs.mkdtempDisposableSync from Node ${process.version}`,
        name: 'UnsupportedFsOperationError',
      });
    } else {
      expect(output.runtime.fs).toBeNull();
    }
    if (typeof fs.promises.mkdtempDisposable === 'function') {
      expect(output.runtime.promises).toEqual({
        code: 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION',
        message: `Filesystem cache does not support fs/promises.mkdtempDisposable from Node ${process.version}`,
        name: 'UnsupportedFsOperationError',
      });
    } else {
      expect(output.runtime.promises).toBeNull();
    }
  });
});
