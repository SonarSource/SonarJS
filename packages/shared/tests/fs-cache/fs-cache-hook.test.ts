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
import { expect } from 'expect';

const register = pathToFileURL(
  path.resolve(import.meta.dirname, '../../src/fs-cache/register.mjs'),
).href;
const fixture = path.resolve(import.meta.dirname, 'fixtures/exercise-hook.mjs');
const workerFixture = path.resolve(import.meta.dirname, 'fixtures/exercise-worker-hook.mjs');
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
});
