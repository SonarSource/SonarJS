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
import { ProgramSelectionArchive as Archive } from '../src/program-selection/archive.js';
import { sonarjs } from '../src/program-selection/analysis-metadata-proto.js';
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';
import { normalizeProjectRoot, replayProjectRoot } from '../../shared/src/helpers/project-paths.js';

// Stand-in for Java's collector JSON, kept separate from the Node-only attachment.
class ProgramSelectionArchive extends Archive {
  private readonly root;
  private rawConfiguration: Record<string, unknown> = {};
  constructor(...args: ConstructorParameters<typeof Archive>) {
    super(...args);
    this.root = args[1];
  }
  recordConfiguration(configuration: Record<string, unknown>) {
    this.rawConfiguration = configuration;
  }
  contextMetadata() {
    return JSON.stringify({ configuration: { ...this.rawConfiguration, baseDir: this.root } });
  }
}

describe('ProgramSelectionArchive', () => {
  it('keeps JSON configuration lossless and both attachments independent of shared metadata', () => {
    const root = normalizeToAbsolutePath(fs.mkdtempSync(path.join(os.tmpdir(), 'collector-json-')));
    const archive = path.join(root, 'selection.pb.gz');
    const recorder = new ProgramSelectionArchive(archive, root, 'record');
    recorder.recordConfiguration({
      detectBundles: false,
      maxFileSize: 1234,
      globals: { values: [] },
      environments: { values: ['browser', 'node'] },
      ecmaScriptVersion: '2022',
    });
    recorder.end();
    const json = JSON.parse(recorder.contextMetadata()!);
    expect(json.configuration).toMatchObject({
      detectBundles: false,
      maxFileSize: 1234,
      globals: { values: [] },
      environments: { values: ['browser', 'node'] },
      ecmaScriptVersion: '2022',
    });
    expect(
      Object.keys(
        sonarjs.programselection.AnalysisMetadata.decode(gunzipSync(fs.readFileSync(archive))),
      ),
    ).toEqual(['programSelection']);
    expect(json).not.toHaveProperty('version');
    for (const metadata of ['{', 'null', '[]', '{"baseDir":"/project","configuration":[]}']) {
      expect(() => new ProgramSelectionArchive(archive, root, 'replay', true, metadata)).toThrow();
    }
    const unsupported = new ProgramSelectionArchive(archive, root, 'replay', true, '{}');
    expect(unsupported.replayBaseDir()).toBeUndefined();
  });
  for (const originalRoot of [
    'C:/CI/Project',
    'd:/agent/work/project',
    '//server/share/project',
    '/home/ci/project',
  ]) {
    it(`replays normalized project settings and all program outcomes from ${originalRoot}`, () => {
      const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'foreign-metadata-'));
      const metadataPath = path.join(temporary, 'metadata.pb.gz');
      const origin = normalizeProjectRoot(originalRoot);
      const target = normalizeToAbsolutePath(path.join(temporary, 'sqaa'));
      const recorder = new ProgramSelectionArchive(metadataPath, origin, 'record');
      recorder.recordConfiguration({
        sources: [`${origin}/src`],
        tests: [`${origin}/tests`],
        inclusions: { values: [`file:${origin}/src/**/*.ts`, '**/*.vue'] },
        exclusions: [`${origin}/src/generated/**`],
        testInclusions: [`FILE:${origin}/tests/**/*.ts`],
        testExclusions: [`${origin}/tests/generated/**`],
        jsTsExclusions: [`${origin}/vendor/**`],
        globals: ['window'],
      });
      recorder.recordConfigured(
        normalizeProjectRoot(`${origin}/src/Main.ts`),
        normalizeProjectRoot(`${origin}/tsconfig.json`),
        {
          baseUrl: origin,
          paths: { '@/*': [normalizeProjectRoot(`${origin}/src/*`)] },
          rootDirs: [normalizeProjectRoot(`${origin}/src`)],
        },
      );
      recorder.recordOrphanGroup([normalizeProjectRoot(`${origin}/src/Orphan.ts`)], {
        allowJs: true,
      });
      recorder.recordNoProgram(normalizeProjectRoot(`${origin}/src/Untyped.ts`));
      recorder.end();
      const replay = new ProgramSelectionArchive(
        metadataPath,
        target,
        'replay',
        true,
        recorder.contextMetadata(),
      );
      const root = replayProjectRoot(origin, target);
      expect(replay.restoredBaseDir()).toBe(origin);
      expect(replay.replayBaseDir()).toBe(root);
      expect(replay.restoredConfiguration()).toMatchObject({
        sources: [`${root}/src`],
        tests: [`${root}/tests`],
        inclusions: { values: [`file:${root}/src/**/*.ts`, '**/*.vue'] },
        exclusions: [`${root}/src/generated/**`],
        testInclusions: [`FILE:${root}/tests/**/*.ts`],
        testExclusions: [`${root}/tests/generated/**`],
        jsTsExclusions: [`${root}/vendor/**`],
        globals: ['window'],
      });
      const main = normalizeToAbsolutePath('src/Main.ts', root);
      const orphan = normalizeToAbsolutePath('src/Orphan.ts', root);
      expect(replay.getRestoredSelections([main, orphan])).toMatchObject([
        {
          program: {
            kind: 'configured',
            tsconfig: `${root}/tsconfig.json`,
            compilerOptions: {
              baseUrl: root,
              paths: { '@/*': [`${root}/src/*`] },
              rootDirs: [`${root}/src`],
            },
          },
        },
        { program: { kind: 'orphan', compilerOptions: { allowJs: true } } },
      ]);
      expect(replay.hasNoProgram(normalizeToAbsolutePath('src/Untyped.ts', root))).toBe(true);
      if (!origin.startsWith('/') || origin.startsWith('//')) {
        expect(replay.hasSelection(normalizeToAbsolutePath('SRC/main.ts', root))).toBe(true);
        expect(replay.canonicalRequestedFile(normalizeToAbsolutePath('SRC/main.ts', root))).toBe(
          main,
        );
        expect(replay.hasNoProgram(normalizeToAbsolutePath('SRC/untyped.ts', root))).toBe(true);
      } else {
        expect(replay.hasSelection(normalizeToAbsolutePath('src/main.ts', root))).toBe(false);
      }
    });
  }
  it('restores classification inputs and the original logical namespace, not derived rule scope', () => {
    const root = normalizeToAbsolutePath(fs.mkdtempSync(path.join(os.tmpdir(), 'rule-scope-')));
    const metadataPath = path.join(root, 'metadata.pb.gz');
    const recorder = new ProgramSelectionArchive(metadataPath, root, 'record');
    recorder.recordConfiguration({ sources: [root], inclusions: [`${root}/**/*.ts`] });
    recorder.recordNoProgram(normalizeToAbsolutePath('main.test.ts', root));
    recorder.end();
    const relocated = normalizeToAbsolutePath(path.join(root, 'relocated'));
    const replay = new ProgramSelectionArchive(
      metadataPath,
      relocated,
      'replay',
      true,
      recorder.contextMetadata(),
    );
    expect(replay.restoredBaseDir()).toBe(root);
    expect(replay.restoredConfiguration()).toMatchObject({
      sources: [root],
      inclusions: [`${root}/**/*.ts`],
    });
    expect(replay.hasNoProgram(normalizeToAbsolutePath('main.test.ts', root))).toBe(true);
    expect(replay.hasNoProgram(normalizeToAbsolutePath('main.test.ts', relocated))).toBe(false);
  });

  for (const baseDir of ['relative/project', '../project']) {
    it(`rejects a non-absolute recorded root ${baseDir}`, () => {
      const root = normalizeToAbsolutePath(fs.mkdtempSync(path.join(os.tmpdir(), 'rule-scope-')));
      const metadataPath = path.join(root, 'metadata.pb.gz');
      const metadata = sonarjs.programselection.AnalysisMetadata.fromObject({
        programSelection: { magic: 'sonarjs-analysis-metadata' },
      });
      fs.writeFileSync(
        metadataPath,
        gzipSync(sonarjs.programselection.AnalysisMetadata.encode(metadata).finish()),
      );
      expect(
        () =>
          new ProgramSelectionArchive(
            metadataPath,
            root,
            'replay',
            false,
            JSON.stringify({ configuration: { baseDir } }),
          ),
      ).toThrow();
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

  it('preserves effective analyzer settings and scope without copying runtime paths', () => {
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
    expect(Object.keys(metadata)).toEqual(['programSelection']);
    expect(JSON.parse(recorder.contextMetadata()!)).toMatchObject({
      configuration: { baseDir: root },
    });
    expect(metadata.programSelection?.magic).toBe('sonarjs-analysis-metadata');

    const replay = new ProgramSelectionArchive(
      metadataPath,
      root,
      'replay',
      false,
      recorder.contextMetadata(),
    );
    expect(replay.restoredConfiguration()).toMatchObject({
      jsTsExclusions: { values: ['**/generated/**'] },
      detectBundles: false,
      environments: { values: ['browser'] },
      sources: [root],
    });
    expect(replay.restoredConfiguration()?.ecmaScriptVersion).toBeNull();
    expect(replay.restoredConfiguration()).not.toHaveProperty('canAccessFileSystem');
    expect(replay.restoredConfiguration()).not.toHaveProperty('baseDir');
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
