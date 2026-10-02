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
import { gunzipSync, gzipSync } from 'node:zlib';
import ts from 'typescript';
import { ProgramSelectionArchive } from '../src/program-selection/archive.js';
import { sonarjs } from '../src/program-selection/analysis-metadata-proto.js';
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';

describe('ProgramSelectionArchive', () => {
  it('restores rule classification after relocation only when scanner scope is unchanged', () => {
    const root = normalizeToAbsolutePath(fs.mkdtempSync(path.join(os.tmpdir(), 'rule-scope-')));
    const metadataPath = path.join(root, 'metadata.pb.gz');
    const recorder = new ProgramSelectionArchive(metadataPath, root, 'record');
    recorder.recordConfiguration({});
    recorder.recordRuleFileType(normalizeToAbsolutePath('main.test.ts', root), 'MAIN', 'MAIN');
    recorder.recordRuleFileType(normalizeToAbsolutePath('inferred.test.ts', root), 'MAIN', 'TEST');
    recorder.recordRuleFileType(normalizeToAbsolutePath('scanner.test.ts', root), 'TEST', 'TEST');
    recorder.recordRuleFileType(normalizeToAbsolutePath('../external.ts', root), 'MAIN', 'MAIN');
    for (const file of ['embedded.html', 'embedded.yaml', 'no-program.js']) {
      recorder.recordRuleFileType(normalizeToAbsolutePath(file, root), 'MAIN', 'MAIN');
    }
    recorder.end();
    const relocated = normalizeToAbsolutePath(path.join(root, 'relocated'));
    const replay = new ProgramSelectionArchive(metadataPath, relocated, 'replay');
    expect(
      replay.restoredRuleFileType(normalizeToAbsolutePath('main.test.ts', relocated), 'MAIN'),
    ).toBe('MAIN');
    expect(
      replay.restoredRuleFileType(normalizeToAbsolutePath('main.test.ts', relocated), 'TEST'),
    ).toBeUndefined();
    expect(
      replay.restoredRuleFileType(normalizeToAbsolutePath('inferred.test.ts', relocated), 'MAIN'),
    ).toBe('TEST');
    expect(
      replay.restoredRuleFileType(normalizeToAbsolutePath('scanner.test.ts', relocated), 'MAIN'),
    ).toBeUndefined();
    expect(
      replay.restoredRuleFileType(normalizeToAbsolutePath('scanner.test.ts', relocated), 'TEST'),
    ).toBe('TEST');
    expect(
      replay.restoredRuleFileType(normalizeToAbsolutePath('../external.ts', relocated), 'MAIN'),
    ).toBeUndefined();
    expect(
      replay.restoredRuleFileType(normalizeToAbsolutePath('new.ts', relocated), 'MAIN'),
    ).toBeUndefined();
    for (const file of ['embedded.html', 'embedded.yaml', 'no-program.js']) {
      expect(replay.restoredRuleFileType(normalizeToAbsolutePath(file, relocated), 'MAIN')).toBe(
        'MAIN',
      );
    }
    replay.recordRuleFileType(normalizeToAbsolutePath('main.test.ts', relocated), 'MAIN', 'TEST');
    expect(
      replay.restoredRuleFileType(normalizeToAbsolutePath('main.test.ts', relocated), 'MAIN'),
    ).toBe('MAIN');
    expect(
      recorder.restoredRuleFileType(normalizeToAbsolutePath('main.test.ts', root), 'MAIN'),
    ).toBeUndefined();
  });

  for (const ruleFileTypes of [
    [{ filePath: 'file.ts', fileType: 'OTHER', ruleFileType: 'MAIN' }],
    [{ filePath: 'file.ts', fileType: 'MAIN', ruleFileType: 'OTHER' }],
    [{ filePath: 'file.ts', fileType: 'TEST', ruleFileType: 'MAIN' }],
    [{ filePath: '../file.ts', fileType: 'MAIN', ruleFileType: 'MAIN' }],
    [{ filePath: '', fileType: 'MAIN', ruleFileType: 'MAIN' }],
    Array(2).fill({ filePath: 'file.ts', fileType: 'MAIN', ruleFileType: 'MAIN' }),
  ]) {
    it(`rejects invalid rule classification ${JSON.stringify(ruleFileTypes)}`, () => {
      const root = normalizeToAbsolutePath(fs.mkdtempSync(path.join(os.tmpdir(), 'rule-scope-')));
      const metadataPath = path.join(root, 'metadata.pb.gz');
      const metadata = sonarjs.programselection.AnalysisMetadata.fromObject({
        programSelection: { magic: 'sonarjs-analysis-metadata' },
        configuration: { fields: {} },
        ruleFileTypes,
      });
      fs.writeFileSync(
        metadataPath,
        gzipSync(sonarjs.programselection.AnalysisMetadata.encode(metadata).finish()),
      );
      expect(() => new ProgramSelectionArchive(metadataPath, root, 'replay')).toThrow();
    });
  }

  it('records no-program outcomes and rejects conflicts with selected programs', () => {
    const root = normalizeToAbsolutePath(fs.mkdtempSync(path.join(os.tmpdir(), 'metadata-')));
    const metadataPath = path.join(root, 'analysis-metadata.pb.gz');
    const file = normalizeToAbsolutePath('src/file.ts', root);
    const recorder = new ProgramSelectionArchive(metadataPath, root, 'record');
    recorder.recordNoProgram(file);
    expect(() =>
      recorder.recordConfigured(file, normalizeToAbsolutePath('tsconfig.json', root), {}),
    ).toThrow('both a program and no-program outcome');
    recorder.end();
    expect(new ProgramSelectionArchive(metadataPath, root, 'replay').hasNoProgram(file)).toBe(true);
  });

  it('preserves effective analyzer settings without copying request-owned paths and scope', () => {
    const root = normalizeToAbsolutePath(fs.mkdtempSync(path.join(os.tmpdir(), 'metadata-')));
    const metadataPath = path.join(root, 'analysis-metadata.pb.gz');
    const recorder = new ProgramSelectionArchive(metadataPath, root);
    recorder.recordConfiguration({
      baseDir: root,
      sources: [root],
      canAccessFileSystem: true,
      jsTsExclusions: { values: ['**/generated/**'] },
      detectBundles: false,
      environments: { values: ['browser'] },
    });
    recorder.end();

    const metadata = sonarjs.programselection.AnalysisMetadata.decode(
      gunzipSync(fs.readFileSync(metadataPath)),
    );
    expect(Object.keys(metadata)).toEqual(['ruleFileTypes', 'programSelection', 'configuration']);
    expect(metadata.programSelection?.magic).toBe('sonarjs-analysis-metadata');

    const replay = new ProgramSelectionArchive(metadataPath, root);
    expect(replay.restoredConfiguration()).toMatchObject({
      jsTsExclusions: { values: ['**/generated/**'] },
      detectBundles: false,
      environments: { values: ['browser'] },
    });
    expect(replay.restoredConfiguration()?.ecmaScriptVersion).toBeNull();
    expect(
      replay.restoredRuleFileType(normalizeToAbsolutePath('old.test.ts', root), 'MAIN'),
    ).toBeUndefined();
  });

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
    const restored = replay.getRestoredSelections([
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
    expect(replay.getRestoredSelections([files[0]])).toEqual([
      {
        id: 1,
        program: { kind: 'orphan', compilerOptions },
        rootNames: files,
        requestedFiles: [files[0]],
      },
    ]);
  });

  it('restores compiler option paths that point to the project root', () => {
    const firstRoot = normalizeToAbsolutePath(fs.mkdtempSync(path.join(os.tmpdir(), 'selection-')));
    const archivePath = path.join(firstRoot, 'selection.pb.gz');
    const file = normalizeToAbsolutePath('src/file.ts', firstRoot);
    const tsconfig = normalizeToAbsolutePath('tsconfig.json', firstRoot);

    const recorder = new ProgramSelectionArchive(archivePath, firstRoot);
    recorder.recordConfigured(file, tsconfig, {
      baseUrl: firstRoot,
      paths: { '@/*': [firstRoot] },
      rootDirs: [firstRoot],
    });
    recorder.end();

    const secondRoot = normalizeToAbsolutePath(
      fs.mkdtempSync(path.join(os.tmpdir(), 'selection-restored-')),
    );
    const restoredArchivePath = path.join(secondRoot, 'selection.pb.gz');
    fs.copyFileSync(archivePath, restoredArchivePath);
    const replay = new ProgramSelectionArchive(restoredArchivePath, secondRoot);

    expect(
      replay.getRestoredSelections([normalizeToAbsolutePath('src/file.ts', secondRoot)]),
    ).toEqual([
      {
        id: 1,
        program: {
          kind: 'configured',
          tsconfig: normalizeToAbsolutePath('tsconfig.json', secondRoot),
          compilerOptions: {
            baseUrl: secondRoot,
            paths: { '@/*': [secondRoot] },
            rootDirs: [secondRoot],
          },
        },
        rootNames: [normalizeToAbsolutePath('src/file.ts', secondRoot)],
        requestedFiles: [normalizeToAbsolutePath('src/file.ts', secondRoot)],
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
    expect(replay.getRestoredSelections([portableFile, outsideFile])).toEqual([
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
