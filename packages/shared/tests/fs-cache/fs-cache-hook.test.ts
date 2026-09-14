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

const register = pathToFileURL(
  path.resolve(import.meta.dirname, '../../src/fs-cache/register.mjs'),
).href;
const fixture = path.resolve(import.meta.dirname, 'fixtures/exercise-hook.mjs');
const workerFixture = path.resolve(import.meta.dirname, 'fixtures/exercise-worker-hook.mjs');
const futureFsMethodFixture = pathToFileURL(
  path.resolve(import.meta.dirname, 'fixtures/add-future-fs-method.mjs'),
).href;
const temporaryDirectories: string[] = [];

function temporaryDirectory() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sonarjs-fs-cache-'));
  temporaryDirectories.push(directory);
  return directory;
}

function runHook({
  archive,
  mode,
  outside,
  root,
  analyzerVersion = 'test-analyzer',
  strict = true,
}: {
  archive: string;
  mode: 'record' | 'replay';
  outside: string;
  root: string;
  analyzerVersion?: string;
  strict?: boolean;
}) {
  return spawnSync(process.execPath, ['--import', register, fixture], {
    encoding: 'utf8',
    env: {
      ...process.env,
      FS_CACHE_OUTSIDE_FILE: outside,
      SONARJS_FS_CACHE_ANALYZER_VERSION: analyzerVersion,
      SONARJS_FS_CACHE_ARCHIVE: archive,
      SONARJS_FS_CACHE_MODE: mode,
      SONARJS_FS_CACHE_ROOT: root,
      SONARJS_FS_CACHE_STRICT: strict ? '1' : '0',
    },
  });
}

function runInlineHook({
  archive,
  analyzerVersion = 'test-analyzer',
  mode,
  root,
  script,
  strict = true,
}: {
  archive: string;
  analyzerVersion?: string;
  mode: 'record' | 'replay';
  root: string;
  script: string;
  strict?: boolean;
}) {
  return spawnSync(process.execPath, ['--import', register, '--eval', script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SONARJS_FS_CACHE_ANALYZER_VERSION: analyzerVersion,
      SONARJS_FS_CACHE_ARCHIVE: archive,
      SONARJS_FS_CACHE_MODE: mode,
      SONARJS_FS_CACHE_ROOT: root,
      SONARJS_FS_CACHE_STRICT: strict ? '1' : '0',
    },
  });
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

describe('filesystem cache preload', () => {
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

    const recorded = runHook({ archive, mode: 'record', outside, root: recordRoot });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);
    const recordedResult = JSON.parse(recorded.stdout);
    expect(fs.statSync(archive).size).toBeGreaterThan(0);
    const archiveDocument = JSON.parse(gunzipSync(fs.readFileSync(archive)).toString('utf8'));
    expect(archiveDocument.formatVersion).toBe(4);
    const inputNode = archiveDocument.entries.find(
      (entry: { path: string }) => entry.path === 'src/input.ts',
    ).node;
    expect(inputNode.exists).toBe(true);
    expect(inputNode.content.ok).toBe(true);
    expect(inputNode.stats['stat:number'].ok).toBe(true);
    expect(inputNode.operations).toBeUndefined();
    expect(recordedResult.openedDirectoryIsDir).toBe(true);

    fs.rmSync(recordRoot, { force: true, recursive: true });
    fs.mkdirSync(replayRoot, { recursive: true });
    fs.writeFileSync(path.join(replayRoot, 'missing.ts'), 'this did not exist during recording');
    fs.writeFileSync(outside, 'outside during replay');

    const replayed = runHook({ archive, mode: 'replay', outside, root: replayRoot });
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
      import fs from 'node:fs';
      const file = ${JSON.stringify(file)};
      const directory = ${JSON.stringify(directory)};
      const content = fs.readFileSync(file, 'utf8');
      const size = fs.statSync(file).size;
      fs.statSync(file, { bigint: true });
      const names = fs.readdirSync(directory, { withFileTypes: true }).map(entry => entry.name);

      // Mutations only make native fallbacks observable. Hooked analyses treat the root as stable.
      fs.renameSync(file, file + '.moved');
      fs.renameSync(directory, directory + '.moved');

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

    const recorded = runInlineHook({ archive, mode: 'record', root, script });
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

    const recorded = runInlineHook({ archive, mode: 'record', root, script });
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
      const link = path.join(process.env.SONARJS_FS_CACHE_ROOT, 'dangling-link');
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

    const recorded = runInlineHook({ archive, mode: 'record', root: recordRoot, script });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);
    expect(JSON.parse(recorded.stdout)).toEqual({
      exists: false,
      isSymbolicLink: true,
      statCode: 'ENOENT',
      target: 'missing-target',
    });
    const archiveDocument = JSON.parse(gunzipSync(fs.readFileSync(archive)).toString('utf8'));
    const linkNode = archiveDocument.entries.find(
      (entry: { path: string }) => entry.path === 'dangling-link',
    ).node;
    expect(linkNode.exists).toBe(false);
    expect(linkNode.linkExists).toBe(true);

    fs.rmSync(recordRoot, { force: true, recursive: true });
    fs.mkdirSync(replayRoot);
    const replayed = runInlineHook({ archive, mode: 'replay', root: replayRoot, script });
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
      const target = path.join(process.env.SONARJS_FS_CACHE_ROOT, 'target');
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

    const recorded = runInlineHook({ archive, mode: 'record', root: recordRoot, script });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);
    const recordedResult = JSON.parse(recorded.stdout);
    expect(recordedResult.regular).toEqual(encodedResults(recordedResult.regular.utf8));
    expect(recordedResult.native).toEqual(encodedResults(recordedResult.native.utf8));

    fs.rmSync(recordRoot, { force: true, recursive: true });
    fs.mkdirSync(replayRoot);
    const replayed = runInlineHook({ archive, mode: 'replay', root: replayRoot, script });
    expect(replayed.stderr).toBe('');
    expect(replayed.status).toBe(0);
    expect(JSON.parse(replayed.stdout)).toEqual({
      regular: encodedResults(recordedResult.regular.utf8.replace(recordRoot, replayRoot)),
      native: encodedResults(recordedResult.native.utf8.replace(recordRoot, replayRoot)),
    });
  });

  it('keeps merged archive entries out of the live recording cache after flush', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'root');
    const archive = path.join(temporary, 'flush-isolation.fscache');
    const existing = path.join(root, 'existing.ts');
    const current = path.join(root, 'current.ts');
    fs.mkdirSync(root);
    fs.writeFileSync(existing, 'previous analysis');
    const initial = runInlineHook({
      archive,
      mode: 'record',
      root,
      script: `
        import fs from 'node:fs';
        fs.readFileSync(${JSON.stringify(existing)}, 'utf8');
      `,
    });
    expect(initial.stderr).toBe('');
    expect(initial.status).toBe(0);

    fs.writeFileSync(existing, 'current analysis');
    fs.writeFileSync(current, 'make the new archive dirty');
    const afterFlush = runInlineHook({
      archive,
      mode: 'record',
      root,
      script: `
        import fs from 'node:fs';
        fs.readFileSync(${JSON.stringify(current)}, 'utf8');
        globalThis[Symbol.for('sonarjs.filesystemCache.installation')].flush();
        console.log(fs.readFileSync(${JSON.stringify(existing)}, 'utf8'));
      `,
    });
    expect(afterFlush.stderr).toBe('');
    expect(afterFlush.status).toBe(0);
    expect(afterFlush.stdout.trim()).toBe('current analysis');
  });

  it('replaces valid archives that are incompatible with a new recording', () => {
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
      analyzerVersion: 'analyzer-one',
      archive,
      mode: 'record',
      root,
      script,
    });
    expect(initial.stderr).toBe('');
    expect(initial.status).toBe(0);

    const changedAnalyzer = runInlineHook({
      analyzerVersion: 'analyzer-two',
      archive,
      mode: 'record',
      root,
      script,
    });
    expect(changedAnalyzer.stderr).toBe('');
    expect(changedAnalyzer.status).toBe(0);
    let document = JSON.parse(gunzipSync(fs.readFileSync(archive)).toString('utf8'));
    expect(document.analyzerVersion).toBe('analyzer-two');
    expect(document.formatVersion).toBe(4);

    document.formatVersion = 3;
    fs.writeFileSync(archive, gzipSync(Buffer.from(JSON.stringify(document))));
    const changedFormat = runInlineHook({
      analyzerVersion: 'analyzer-three',
      archive,
      mode: 'record',
      root,
      script,
    });
    expect(changedFormat.stderr).toBe('');
    expect(changedFormat.status).toBe(0);
    document = JSON.parse(gunzipSync(fs.readFileSync(archive)).toString('utf8'));
    expect(document.analyzerVersion).toBe('analyzer-three');
    expect(document.formatVersion).toBe(4);
  });

  it('rejects corrupt and analyzer-incompatible archives', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'root');
    const archive = path.join(temporary, 'analysis.fscache');
    const outside = path.join(temporary, 'outside.txt');
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', 'input.ts'), 'content');
    fs.writeFileSync(outside, 'outside');

    fs.writeFileSync(archive, 'not an archive');
    const corrupt = runHook({ archive, mode: 'replay', outside, root });
    expect(corrupt.status).not.toBe(0);
    expect(corrupt.stderr).toContain('Cannot read filesystem cache archive');

    fs.rmSync(archive);
    const recorded = runHook({
      analyzerVersion: 'analyzer-one',
      archive,
      mode: 'record',
      outside,
      root,
    });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);
    const incompatible = runHook({
      analyzerVersion: 'analyzer-two',
      archive,
      mode: 'replay',
      outside,
      root,
    });
    expect(incompatible.status).not.toBe(0);
    expect(incompatible.stderr).toContain('does not match analyzer-two');

    const oldDocument = JSON.parse(gunzipSync(fs.readFileSync(archive)).toString('utf8'));
    oldDocument.formatVersion = 1;
    fs.writeFileSync(archive, gzipSync(Buffer.from(JSON.stringify(oldDocument))));
    const oldFormat = runHook({ archive, mode: 'replay', outside, root });
    expect(oldFormat.status).not.toBe(0);
    expect(oldFormat.stderr).toContain('Unsupported filesystem cache format 1; expected 4');
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
      const directory = path.join(process.env.SONARJS_FS_CACHE_ROOT, 'entries');
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

    const recorded = runInlineHook({ archive, mode: 'record', root: recordRoot, script });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);
    const recordedResult = JSON.parse(recorded.stdout);
    expect(recordedResult.sync).toHaveLength(4);

    fs.rmSync(recordRoot, { force: true, recursive: true });
    fs.mkdirSync(replayRoot);
    const replayed = runInlineHook({ archive, mode: 'replay', root: replayRoot, script });
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
      const file = path.join(process.env.SONARJS_FS_CACHE_ROOT, 'input.ts');
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

    const recorded = runInlineHook({ archive, mode: 'record', root: recordRoot, script });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);

    fs.rmSync(recordRoot, { force: true, recursive: true });
    fs.mkdirSync(replayRoot);
    const replayed = runInlineHook({ archive, mode: 'replay', root: replayRoot, script });
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
      const file = path.join(process.env.SONARJS_FS_CACHE_ROOT, 'input.ts');
      const fd = fs.openSync(file, fs.constants.O_RDONLY);
      console.log(fs.readFileSync(fd, 'utf8'));
      fs.closeSync(fd);
    `;
    const replayScript = `
      import fs from 'node:fs';
      import path from 'node:path';
      const file = path.join(process.env.SONARJS_FS_CACHE_ROOT, 'input.ts');
      const handle = await fs.promises.open(file);
      console.log(await handle.readFile('utf8'));
      await handle.close();
    `;

    const recorded = runInlineHook({
      archive,
      mode: 'record',
      root: recordRoot,
      script: recordScript,
    });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);

    fs.rmSync(recordRoot, { force: true, recursive: true });
    fs.mkdirSync(replayRoot);
    const replayed = runInlineHook({
      archive,
      mode: 'replay',
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
      console.log(fs.readFileSync(path.join(process.env.SONARJS_FS_CACHE_ROOT, 'input.ts'), 'utf8'));
    `;

    const recorded = runInlineHook({ archive, mode: 'record', root, script });
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
      import fs from 'node:fs';
      import path from 'node:path';
      const result = fs.readFileSync(
        path.join(process.env.SONARJS_FS_CACHE_ROOT, 'input.ts'),
        'utf8',
      );
      fs.writeFileSync(process.env.SONARJS_FS_CACHE_ARCHIVE, 'not an archive');
      console.log(result);
    `;

    const recorded = runInlineHook({ archive, mode: 'record', root, script });
    expect(recorded.status).toBe(0);
    expect(recorded.stdout.trim()).toBe('analysis result');
    expect(recorded.stderr).toContain('Cannot write filesystem cache archive');
    expect(recorded.stderr).toContain('Cannot read filesystem cache archive');
  });

  it('records and replays filesystem access from an inherited worker preload', () => {
    const temporary = temporaryDirectory();
    const recordRoot = path.join(temporary, 'record-root');
    const replayRoot = path.join(temporary, 'replay-root');
    const archive = path.join(temporary, 'worker.fscache');
    fs.mkdirSync(recordRoot);
    fs.writeFileSync(path.join(recordRoot, 'main-input.ts'), 'read in main');
    fs.writeFileSync(path.join(recordRoot, 'worker-input.ts'), 'read in worker');
    const environment = {
      ...process.env,
      SONARJS_FS_CACHE_ANALYZER_VERSION: 'test-analyzer',
      SONARJS_FS_CACHE_ARCHIVE: archive,
      SONARJS_FS_CACHE_ROOT: recordRoot,
      SONARJS_FS_CACHE_STRICT: '1',
    };

    const recorded = spawnSync(process.execPath, ['--import', register, workerFixture], {
      encoding: 'utf8',
      env: { ...environment, SONARJS_FS_CACHE_MODE: 'record' },
    });
    expect(recorded.status).toBe(0);
    expect(recorded.stdout.trim()).toBe('read in main|read in worker');
    expect(fs.existsSync(archive)).toBe(true);

    fs.rmSync(recordRoot, { force: true, recursive: true });
    fs.mkdirSync(replayRoot);
    const replayed = spawnSync(process.execPath, ['--import', register, workerFixture], {
      encoding: 'utf8',
      env: {
        ...environment,
        SONARJS_FS_CACHE_MODE: 'replay',
        SONARJS_FS_CACHE_ROOT: replayRoot,
      },
    });
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
      const fd = fs.openSync(process.env.SONARJS_FS_CACHE_ROOT, 'r');
      try {
        fs.readSync(fd, Buffer.alloc(1), 0, 1, null);
      } catch (error) {
        console.log(error.code);
      } finally {
        fs.closeSync(fd);
      }
    `;
    const environment = {
      ...process.env,
      SONARJS_FS_CACHE_ANALYZER_VERSION: 'test-analyzer',
      SONARJS_FS_CACHE_ARCHIVE: archive,
      SONARJS_FS_CACHE_ROOT: root,
      SONARJS_FS_CACHE_STRICT: '1',
    };

    const recorded = spawnSync(process.execPath, ['--import', register, '--eval', script], {
      encoding: 'utf8',
      env: { ...environment, SONARJS_FS_CACHE_MODE: 'record' },
    });
    expect(recorded.status).toBe(0);
    expect(recorded.stdout.trim()).toBe('EISDIR');

    const replayed = spawnSync(process.execPath, ['--import', register, '--eval', script], {
      encoding: 'utf8',
      env: { ...environment, SONARJS_FS_CACHE_MODE: 'replay' },
    });
    expect(replayed.status).toBe(0);
    expect(replayed.stdout.trim()).toBe('EISDIR');
    expect(replayed.stderr).not.toContain('ERR_SONARJS_FS_CACHE_MISS');
  });

  it('passes unrecorded paths through unless strict replay is requested', () => {
    const temporary = temporaryDirectory();
    const root = path.join(temporary, 'root');
    const archive = path.join(temporary, 'analysis.fscache');
    const outside = path.join(temporary, 'outside.txt');
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', 'input.ts'), 'content');
    fs.writeFileSync(outside, 'outside');
    const recorded = runHook({ archive, mode: 'record', outside, root });
    expect(recorded.stderr).toBe('');
    expect(recorded.status).toBe(0);

    const document = path.join(root, 'unrecorded.json');
    fs.writeFileSync(document, '{}');
    const script = `import fs from 'node:fs'; console.log(fs.readFileSync(${JSON.stringify(document)}, 'utf8'));`;
    const baseEnvironment = {
      ...process.env,
      SONARJS_FS_CACHE_ANALYZER_VERSION: 'test-analyzer',
      SONARJS_FS_CACHE_ARCHIVE: archive,
      SONARJS_FS_CACHE_MODE: 'replay',
      SONARJS_FS_CACHE_ROOT: root,
    };
    const passthrough = spawnSync(process.execPath, ['--import', register, '--eval', script], {
      encoding: 'utf8',
      env: { ...baseEnvironment, SONARJS_FS_CACHE_STRICT: '0' },
    });
    expect(passthrough.status).toBe(0);
    expect(passthrough.stdout.trim()).toBe('{}');

    const strict = spawnSync(process.execPath, ['--import', register, '--eval', script], {
      encoding: 'utf8',
      env: { ...baseEnvironment, SONARJS_FS_CACHE_STRICT: '1' },
    });
    expect(strict.status).not.toBe(0);
    expect(strict.stderr).toContain('ERR_SONARJS_FS_CACHE_MISS');
  });

  it('rejects callable filesystem exports added after the Node 22.12 baseline', () => {
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
      console.log(JSON.stringify({
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
    const result = spawnSync(
      process.execPath,
      ['--import', futureFsMethodFixture, '--import', register, '--eval', script],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          SONARJS_FS_CACHE_ANALYZER_VERSION: 'test-analyzer',
          SONARJS_FS_CACHE_ARCHIVE: archive,
          SONARJS_FS_CACHE_MODE: 'record',
          SONARJS_FS_CACHE_ROOT: root,
          SONARJS_FS_CACHE_STRICT: '1',
        },
      },
    );

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
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
