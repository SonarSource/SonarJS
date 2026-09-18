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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { ProgramSelectionArchive } from '../src/program-selection/archive.js';
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';

describe('ProgramSelectionArchive', () => {
  it('deduplicates configured programs and restores project-relative paths', () => {
    const firstRoot = normalizeToAbsolutePath(fs.mkdtempSync(path.join(os.tmpdir(), 'selection-')));
    const archivePath = path.join(firstRoot, 'selection.pb.gz');
    const firstFile = normalizeToAbsolutePath('src/first.ts', firstRoot);
    const secondFile = normalizeToAbsolutePath('src/second.ts', firstRoot);
    const tsconfig = normalizeToAbsolutePath('tsconfig.json', firstRoot);

    const recorder = new ProgramSelectionArchive(archivePath, firstRoot);
    recorder.recordConfigured(firstFile, tsconfig, {
      baseUrl: normalizeToAbsolutePath('src', firstRoot),
      paths: { '@/*': [normalizeToAbsolutePath('src/*', firstRoot)] },
      rootDirs: [normalizeToAbsolutePath('src', firstRoot)],
      strict: true,
    });
    recorder.recordConfigured(secondFile, tsconfig, {
      baseUrl: normalizeToAbsolutePath('src', firstRoot),
      paths: { '@/*': [normalizeToAbsolutePath('src/*', firstRoot)] },
      rootDirs: [normalizeToAbsolutePath('src', firstRoot)],
      strict: true,
    });
    recorder.end();

    const secondRoot = normalizeToAbsolutePath(
      fs.mkdtempSync(path.join(os.tmpdir(), 'selection-restored-')),
    );
    const restoredArchivePath = path.join(secondRoot, 'selection.pb.gz');
    fs.copyFileSync(archivePath, restoredArchivePath);
    const replay = new ProgramSelectionArchive(restoredArchivePath, secondRoot);
    const restored = replay.restoredSelections([
      normalizeToAbsolutePath('src/second.ts', secondRoot),
    ]);

    expect(restored).toEqual([
      {
        id: 1,
        program: {
          kind: 'configured',
          tsconfig: normalizeToAbsolutePath('tsconfig.json', secondRoot),
          compilerOptions: {
            baseUrl: normalizeToAbsolutePath('src', secondRoot),
            paths: { '@/*': [normalizeToAbsolutePath('src/*', secondRoot)] },
            rootDirs: [normalizeToAbsolutePath('src', secondRoot)],
            strict: true,
          },
        },
        rootNames: [
          normalizeToAbsolutePath('src/first.ts', secondRoot),
          normalizeToAbsolutePath('src/second.ts', secondRoot),
        ],
        requestedFiles: [normalizeToAbsolutePath('src/second.ts', secondRoot)],
      },
    ]);
  });

  it('restores effective orphan compiler options and derives roots from file selections', () => {
    const root = normalizeToAbsolutePath(fs.mkdtempSync(path.join(os.tmpdir(), 'selection-')));
    const archivePath = path.join(root, 'selection.pb.gz');
    const files = [
      normalizeToAbsolutePath('src/first.ts', root),
      normalizeToAbsolutePath('src/second.ts', root),
    ];
    const compilerOptions: ts.CompilerOptions = {
      allowJs: true,
      lib: ['lib.es2022.d.ts'],
      paths: { '@/*': ['src/*'] },
      strict: false,
      target: ts.ScriptTarget.ES2022,
    };

    const recorder = new ProgramSelectionArchive(archivePath, root);
    recorder.recordOrphanGroup(files, compilerOptions);
    recorder.end();

    const replay = new ProgramSelectionArchive(archivePath, root);
    expect(replay.restoredSelections([files[0]])).toEqual([
      {
        id: 1,
        program: { kind: 'orphan', compilerOptions },
        rootNames: files,
        requestedFiles: [files[0]],
      },
    ]);
  });

  it('preserves portable selections when another program is outside the project', () => {
    const root = normalizeToAbsolutePath(fs.mkdtempSync(path.join(os.tmpdir(), 'selection-')));
    const archivePath = path.join(root, 'selection.pb.gz');
    const portableFile = normalizeToAbsolutePath('src/portable.ts', root);
    const portableTsconfig = normalizeToAbsolutePath('tsconfig.json', root);
    const outsideRoot = normalizeToAbsolutePath(
      fs.mkdtempSync(path.join(os.tmpdir(), 'selection-outside-')),
    );
    const outsideFile = normalizeToAbsolutePath('outside.ts', outsideRoot);
    const outsideTsconfig = normalizeToAbsolutePath('tsconfig.json', outsideRoot);

    const recorder = new ProgramSelectionArchive(archivePath, root);
    recorder.recordConfigured(portableFile, portableTsconfig, { strict: true });
    recorder.recordConfigured(portableFile, outsideTsconfig, { strict: false });
    recorder.recordOrphanGroup([outsideFile], { allowJs: true });
    recorder.end();

    const replay = new ProgramSelectionArchive(archivePath, root);
    expect(replay.restoredSelections([portableFile, outsideFile])).toEqual([
      {
        id: 1,
        program: {
          kind: 'configured',
          tsconfig: portableTsconfig,
          compilerOptions: { strict: true },
        },
        rootNames: [portableFile],
        requestedFiles: [portableFile],
      },
    ]);
    expect(replay.hasSelection(outsideFile)).toBe(false);
  });
});
