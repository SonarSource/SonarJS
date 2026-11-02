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
import { FsCacheArchive, type CachedDirectoryEntry } from '../../src/fs-cache/archive.js';
import { installFsCache, refreshFilesystemBaseline } from '../../src/fs-cache/hook.js';

const cache = installFsCache();
let temporary: string;
let rootDir: string;
const options = { mode: 'record' as const, caseSensitivePaths: true };

beforeEach(() => {
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'sonarjs-directory-refresh-'));
  rootDir = path.join(temporary, 'project');
  fs.mkdirSync(rootDir);
  fs.writeFileSync(path.join(rootDir, 'a.ts'), '');
  fs.writeFileSync(path.join(rootDir, 'b.ts'), '');
});
afterEach(() => fs.rmSync(temporary, { recursive: true, force: true }));

function load(archivePath: string) {
  const archive = new FsCacheArchive({ ...options, rootDir, archivePath });
  archive.load();
  return archive;
}

function record(withFileTypes: boolean) {
  const archivePath = path.join(temporary, 'baseline.pb.gz');
  const session = cache.beginAnalysis({ ...options, rootDir, archivePath });
  try {
    if (withFileTypes) fs.readdirSync(rootDir, { withFileTypes: true });
    else fs.readdirSync(rootDir);
  } finally {
    session.end();
  }
  return archivePath;
}

function refresh(archivePath: string) {
  const session = cache.beginAnalysis({
    ...options,
    rootDir,
    archivePath: path.join(temporary, 'current.pb.gz'),
  });
  try {
    return refreshFilesystemBaseline(archivePath, () => false);
  } finally {
    session.end();
  }
}

describe('context baseline directory refresh', () => {
  for (const withFileTypes of [false, true]) {
    it('accepts reordered entries and records fresh order; withFileTypes=' + withFileTypes, () => {
      const archivePath = record(withFileTypes);
      const operation = `readdir:utf8:${withFileTypes}:false`;
      const baseline = load(archivePath);
      const outcome = baseline.get<CachedDirectoryEntry[]>('.', operation)!;
      if (!outcome.ok) throw new Error('Expected a recorded directory');
      const original = outcome.value;
      baseline.set('.', operation, { ok: true, value: original.toReversed() });
      baseline.flush();
      const bytes = fs.readFileSync(archivePath);

      expect(refresh(archivePath)).toBe(true);
      expect(load(path.join(temporary, 'current.pb.gz')).get('.', operation)).toEqual({
        ok: true,
        value: original,
      });
      expect(fs.readFileSync(archivePath)).toEqual(bytes);
    });
  }

  for (const change of ['added', 'removed', 'type'] as const) {
    it('rejects ' + change + ' directory entries', () => {
      const archivePath = record(true);
      if (change === 'added') fs.writeFileSync(path.join(rootDir, 'c.ts'), '');
      else {
        fs.unlinkSync(path.join(rootDir, 'a.ts'));
        if (change === 'type') fs.mkdirSync(path.join(rootDir, 'a.ts'));
      }
      expect(refresh(archivePath)).toBe(false);
    });
  }
});
