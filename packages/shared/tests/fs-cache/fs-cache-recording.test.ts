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
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { expect } from 'expect';
import { FsCacheArchive } from '../../src/fs-cache/archive.js';
import { installFsCache } from '../../src/fs-cache/hook.js';

const writeNative = fs.writeFileSync.bind(fs);
const unlinkNative = fs.unlinkSync.bind(fs);
const mkdirNative = fs.mkdirSync.bind(fs);
const cache = installFsCache();
let temporary: string;
let rootDir: string;
let currentPath: string;

beforeEach(() => {
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'sonarjs-fresh-recording-'));
  rootDir = path.join(temporary, 'project');
  fs.mkdirSync(rootDir);
  currentPath = path.join(temporary, 'current.pb.gz');
});
afterEach(() => {
  mock.restoreAll();
  fs.rmSync(temporary, { recursive: true, force: true });
});

function record(archivePath: string, observe: () => void) {
  const session = cache.beginAnalysis({
    mode: 'record',
    caseSensitivePaths: true,
    rootDir,
    archivePath,
  });
  try {
    observe();
  } finally {
    session.end();
  }
}

function load(archivePath: string) {
  const archive = new FsCacheArchive({
    mode: 'replay',
    caseSensitivePaths: true,
    rootDir,
    archivePath,
  });
  archive.load();
  return archive;
}

describe('fresh filesystem recording', () => {
  it('uses current native contents for repeated reads and opens while recording', async () => {
    const source = path.join(rootDir, 'source.ts');
    fs.writeFileSync(source, 'baseline');
    const session = cache.beginAnalysis({
      mode: 'record',
      caseSensitivePaths: true,
      rootDir,
      archivePath: currentPath,
    });
    try {
      fs.readFileSync(source);
      fs.statSync(source);
      writeNative(source, 'first native update');
      expect(fs.readFileSync(source, 'utf8')).toBe('first native update');
      writeNative(source, 'second native update');
      expect(await fs.promises.readFile(source, 'utf8')).toBe('second native update');
      writeNative(source, 'opened native update');
      let fd = fs.openSync(source, 'r');
      expect(fs.readFileSync(fd, 'utf8')).toBe('opened native update');
      fs.closeSync(fd);
      writeNative(source, 'final native update');
      fd = fs.openSync(source, 'r');
      expect(fs.readFileSync(fd, 'utf8')).toBe('final native update');
      fs.closeSync(fd);
      expect(fs.statSync(source).size).toBe(Buffer.byteLength('final native update'));
    } finally {
      session.end();
    }
    expect(load(currentPath).get('source.ts', 'readFile')).toEqual({
      ok: true,
      value: Buffer.from('final native update'),
    });
    expect(load(currentPath).entries.get('source.ts')?.stats?.['stat:number']).toMatchObject({
      ok: true,
      value: { fields: { size: String(Buffer.byteLength('final native update')) } },
    });
  });

  it('replaces earlier positive and negative observations with actual existence changes', () => {
    const removed = path.join(rootDir, 'removed.ts');
    const added = path.join(rootDir, 'added.ts');
    fs.writeFileSync(removed, 'baseline');
    record(currentPath, () => {
      expect(fs.existsSync(added)).toBe(false);
      fs.statSync(removed);
      expect(fs.readFileSync(removed, 'utf8')).toBe('baseline');
      unlinkNative(removed);
      expect(fs.existsSync(removed)).toBe(false);
      expect(() => fs.readFileSync(removed)).toThrow();
      writeNative(added, 'new source');
      expect(fs.existsSync(added)).toBe(true);
      expect(fs.readFileSync(added, 'utf8')).toBe('new source');
    });
    const current = load(currentPath);
    expect(current.getExists('removed.ts')).toBe(false);
    expect(current.get('removed.ts', 'readFile')).toBeUndefined();
    expect(current.get('removed.ts', 'stat')).toBeUndefined();
    expect(current.getExists('added.ts')).toBe(true);
    expect(current.get('added.ts', 'readFile')).toEqual({
      ok: true,
      value: Buffer.from('new source'),
    });
  });

  for (const bigint of [false, true]) {
    it('drops contradictory observations after a native type change; bigint=' + bigint, () => {
      const source = path.join(rootDir, 'source.ts');
      fs.writeFileSync(source, 'baseline');
      record(currentPath, () => {
        fs.readFileSync(source);
        fs.statSync(source);
        unlinkNative(source);
        mkdirNative(source);
        expect(fs.statSync(source, { bigint }).isDirectory()).toBe(true);
      });
      const current = load(currentPath);
      expect(current.get('source.ts', 'readFile')).toBeUndefined();
      expect(
        current.entries.get('source.ts')?.stats?.[`stat:${bigint ? 'bigint' : 'number'}`],
      ).toMatchObject({
        ok: true,
        value: { types: { directory: true, file: false } },
      });
    });
  }
});
