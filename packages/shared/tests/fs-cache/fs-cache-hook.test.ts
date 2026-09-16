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
import { FS_CACHE_FORMAT_VERSION, FsCacheArchive } from '../../src/fs-cache/archive.mjs';

const fixture = path.resolve(import.meta.dirname, 'fixtures/exercise-hook.mjs');
const fixtureRunner = path.resolve(import.meta.dirname, 'fixtures/run-with-fs-cache.mjs');
const workerFixture = path.resolve(import.meta.dirname, 'fixtures/exercise-worker-hook.mjs');
const workerBootstrapFixture = path.resolve(
  import.meta.dirname,
  'fixtures/exercise-worker-bootstrap.mjs',
);
const hookModule = pathToFileURL(
  path.resolve(import.meta.dirname, '../../src/fs-cache/hook.mjs'),
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
  preloads = [],
  root,
  script,
}: {
  archive: string;
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
    { encoding: 'utf8' },
  );
}

function captureError(operation: () => unknown) {
  try {
    operation();
  } catch (error) {
    const filesystemError = error as NodeJS.ErrnoException;
    return {
      code: filesystemError.code,
      errno: filesystemError.errno,
      message: filesystemError.message,
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
  it('installs dormant filesystem wrappers when the analysis worker starts', () => {
    const result = spawnSync(process.execPath, [workerBootstrapFixture], {
      encoding: 'utf8',
    });

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      active: false,
      installed: true,
      nativePassthrough: true,
    });
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
    const inputNode = loadArchive(archive, recordRoot).entries.get('src/input.ts');
    expect(inputNode.exists).toBe(true);
    expect(inputNode.content.ok).toBe(true);
    expect(inputNode.stats['stat:number'].ok).toBe(true);
    expect(inputNode.operations).toBeUndefined();
    expect(recordedResult.openedDirectoryIsDir).toBe(true);

    fs.rmSync(recordRoot, { force: true, recursive: true });
    fs.mkdirSync(replayRoot, { recursive: true });
    fs.writeFileSync(path.join(replayRoot, 'missing.ts'), 'this did not exist during recording');
    fs.writeFileSync(outside, 'outside during replay');

    const replayed = runHook({ archive, outside, root: replayRoot });
    expect(replayed.stderr).toBe('');
    expect(replayed.status).toBe(0);
    const replayedResult = JSON.parse(replayed.stdout);

    expect({ ...replayedResult, outside: recordedResult.outside }).toEqual(recordedResult);
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
      const captureError = operation => {
        try {
          operation();
        } catch (error) {
          return {
            code: error.code,
            errno: error.errno,
            message: error.message,
            syscall: error.syscall,
          };
        }
        throw new Error('Expected a filesystem error');
      };
      fs.existsSync(missing);
      console.log(JSON.stringify({
        readFile: captureError(() => fs.readFileSync(missing)),
        realpath: captureError(() => fs.realpathSync(missing)),
        realpathNative: captureError(() => fs.realpathSync.native(missing)),
      }));
    `;

    const recorded = runInlineHook({ archive, root, script });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);
    expect(JSON.parse(recorded.stdout)).toEqual(nativeErrors);
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
    const linkNode = loadArchive(archive, recordRoot).entries.get('dangling-link');
    expect(linkNode.exists).toBe(false);
    expect(linkNode.linkExists).toBe(true);

    fs.rmSync(recordRoot, { force: true, recursive: true });
    fs.mkdirSync(replayRoot);
    const replayed = runInlineHook({ archive, root: replayRoot, script });
    expect(replayed.stderr).toBe('');
    expect(replayed.status).toBe(0);
    expect(JSON.parse(replayed.stdout)).toEqual(JSON.parse(recorded.stdout));
  });

  it('reuses portable realpaths across result encodings', () => {
    const temporary = temporaryDirectory();
    const recordRoot = path.join(temporary, 'record-root');
    const replayRoot = path.join(temporary, 'replay-root');
    const archive = path.join(temporary, 'realpath-encodings.fscache');
    const target = path.join(recordRoot, 'target');
    fs.mkdirSync(target, { recursive: true });
    const script = `
      import fs from 'node:fs';
      import path from 'node:path';
      const target = path.join(filesystemCacheRoot, 'target');
      console.log(JSON.stringify({
        regular: {
          utf8: fs.realpathSync(target),
          buffer: fs.realpathSync(target, 'buffer').toString(),
          hex: fs.realpathSync(target, 'hex'),
          base64: await fs.promises.realpath(target, 'base64'),
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

    fs.rmSync(recordRoot, { force: true, recursive: true });
    fs.mkdirSync(replayRoot);
    const replayed = runInlineHook({ archive, root: replayRoot, script });
    expect(replayed.stderr).toBe('');
    expect(replayed.status).toBe(0);
    expect(JSON.parse(replayed.stdout)).toEqual({
      regular: encodedResults(recordedResult.regular.utf8.replace(recordRoot, replayRoot)),
      native: encodedResults(recordedResult.native.utf8.replace(recordRoot, replayRoot)),
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
