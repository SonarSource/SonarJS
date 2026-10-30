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
import {
  canonicalFileName,
  FileSystemMap,
  FileSystemSet,
  isFileSystemCaseSensitive,
  pathsEqual,
  pathIsUnder,
} from '../../src/common/filesystem.js';
import { installFsCache } from '../../../shared/src/fs-cache/hook.js';
import { DirectoryIndex, normalizeToAbsolutePath } from '../../../shared/src/helpers/files.js';
import { relativeProjectPath } from '../../../shared/src/helpers/project-paths.js';
import { createConfiguration } from '../../src/common/configuration.js';
import { findFiles } from '../../src/common/find-files.js';
import { readDirectory } from '../../src/jsts/program/filesystem.js';
import { createProgramOptions } from '../../src/jsts/program/tsconfig/options.js';
import { clearProgramOptionsCache } from '../../src/jsts/program/cache/programOptionsCache.js';
import { createProgramFromSingleFile } from '../../src/jsts/program/factory.js';
import { IncrementalCompilerHost } from '../../src/jsts/program/compilerHost.js';
import {
  setSourceFilesContext,
  clearSourceFileContentCache,
} from '../../src/jsts/program/cache/sourceFileCache.js';
import { SourceFileStore } from '../../src/file-stores/source-files.js';
import { TsConfigStore } from '../../src/file-stores/tsconfigs.js';
import { createAnalyzableFiles, promoteToAnalyzableFile } from '../../src/projectAnalysis.js';
import { ProgramSelectionArchive } from '../../src/program-selection/archive.js';

describe('filesystem identity across analysis layers', () => {
  for (const code of ['ELOOP', 'EACCES']) {
    it(`keeps readable siblings and subdirectories when a symlink stat fails with ${code}`, context => {
      const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'filesystem-symlink-'));
      const root = normalizeToAbsolutePath(temporary);
      try {
        fs.writeFileSync(path.join(root, 'main.ts'), 'export {};');
        fs.writeFileSync(path.join(root, 'broken.ts'), '');
        fs.mkdirSync(path.join(root, 'nested'));
        fs.writeFileSync(path.join(root, 'nested/child.ts'), 'export {};');
        // Simulate the symlink without requiring Windows symlink privileges.
        context.mock.method(fs.Dirent.prototype, 'isSymbolicLink', function (this: fs.Dirent) {
          return this.name === 'broken.ts';
        });
        context.mock.method(fs, 'statSync', () => {
          throw Object.assign(new Error('Cannot stat symlink'), { code });
        });
        expect(readDirectory(root, ['.ts'], undefined, ['**/*.ts']).sort()).toEqual([
          `${root}/main.ts`,
          `${root}/nested/child.ts`,
        ]);
      } finally {
        context.mock.restoreAll();
        fs.rmSync(temporary, { recursive: true, force: true });
      }
    });
  }

  for (const caseSensitivePaths of [true, false]) {
    it(`shares path identity across TypeScript, stores and metadata (case sensitive: ${caseSensitivePaths})`, async () => {
      const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'filesystem-identity-'));
      const root = normalizeToAbsolutePath(temporary);
      const installation = installFsCache();
      const session = installation.beginAnalysis({
        archivePath: path.join(root, 'fs.pb.gz'),
        rootDir: root,
        mode: 'record',
        caseSensitivePaths,
      });
      const file = normalizeToAbsolutePath('src/Main.ts', root);
      const alternate = normalizeToAbsolutePath('SRC/main.ts', root);
      const responsePaths = new FileSystemMap<string, string>();
      const responseFiles = new FileSystemSet<string>();
      try {
        responsePaths.set(file, 'original request key');
        responseFiles.add(file);
        expect(isFileSystemCaseSensitive()).toBe(caseSensitivePaths);
        expect(pathsEqual(file, alternate)).toBe(!caseSensitivePaths);
        expect(pathIsUnder(alternate, normalizeToAbsolutePath('src', root))).toBe(
          !caseSensitivePaths,
        );
        expect(pathIsUnder(`${root}/src-other/Main.ts`, `${root}/src`)).toBe(false);
        expect(relativeProjectPath(file, `${root}/SRC`)).toBe(
          caseSensitivePaths ? undefined : 'Main.ts',
        );
        const map = new FileSystemMap([[file, 1]]);
        const set = new FileSystemSet([file]);
        expect(map.get(alternate)).toBe(caseSensitivePaths ? undefined : 1);
        expect(set.has(alternate)).toBe(!caseSensitivePaths);
        map.set(alternate, 2);
        set.add(alternate);
        expect(map.size).toBe(caseSensitivePaths ? 2 : 1);
        expect(set.size).toBe(map.size);
        expect([...map.keys()][0]).toBe(file);
        expect([...set][0]).toBe(file);
        map.delete(alternate);
        set.delete(alternate);
        expect(map.has(file)).toBe(caseSensitivePaths);
        expect(set.has(file)).toBe(caseSensitivePaths);

        const index = new DirectoryIndex();
        index.addFile(file);
        expect(
          index.getFilesInDirectory(normalizeToAbsolutePath('SRC', root))?.has('Main.ts'),
        ).toBe(caseSensitivePaths ? undefined : true);
        expect(
          index.getFilesInDirectory(normalizeToAbsolutePath('src', root))?.has('main.ts'),
        ).toBe(!caseSensitivePaths);
        const config = createConfiguration({ baseDir: root });
        const input = createAnalyzableFiles();
        input[file] = promoteToAnalyzableFile(
          { filePath: file, fileContent: 'const edited = 42;' },
          'MAIN',
          'MAIN',
          'SAME',
        );
        const store = new SourceFileStore();
        await store.isInitialized(config, input);
        expect(store.getFile(alternate)?.fileContent).toBe(
          caseSensitivePaths ? undefined : 'const edited = 42;',
        );
        expect(
          new TsConfigStore().filenameMatchesTsConfig(
            normalizeToAbsolutePath('TSCONFIG.JSON', root),
          ),
        ).toBe(!caseSensitivePaths);

        setSourceFilesContext(input);
        const host = new IncrementalCompilerHost({}, root);
        expect(host.useCaseSensitiveFileNames()).toBe(caseSensitivePaths);
        const basic = createProgramFromSingleFile(file, 'export const n = 1;');
        expect(basic.getSourceFile(alternate)).toBe(
          caseSensitivePaths ? undefined : basic.getSourceFile(file),
        );
        expect(host.readFile(alternate)).toBe(
          caseSensitivePaths ? undefined : 'const edited = 42;',
        );
        host.updateFile(file, 'const edited = 43;');
        expect(host.getFileVersion(alternate)).toBe(caseSensitivePaths ? '0' : '1');
        const selection = new ProgramSelectionArchive(
          path.join(root, 'selection.pb.gz'),
          root,
          'record',
        );
        selection.recordNoProgram(file);
        expect(selection.hasNoProgram(alternate)).toBe(!caseSensitivePaths);
      } finally {
        clearSourceFileContentCache();
        session.end();
        fs.rmSync(temporary, { recursive: true, force: true });
      }
      // Transport conversion happens after the replay session ends.
      expect(responsePaths.get(alternate)).toBe(
        caseSensitivePaths ? undefined : 'original request key',
      );
      expect(responseFiles.has(alternate)).toBe(!caseSensitivePaths);
      responsePaths.clear();
      responsePaths.set(file, 'native request key');
      expect(responsePaths.has(alternate)).toBe(!ts.sys.useCaseSensitiveFileNames);
      expect(isFileSystemCaseSensitive()).toBe(ts.sys.useCaseSensitiveFileNames);
      const nativeHost = ts.createCompilerHost({});
      for (const name of ['C:/Project/Main.ts', '/project/İıß.ts', '/project/Ä.ts']) {
        expect(canonicalFileName(name)).toBe(nativeHost.getCanonicalFileName(name));
      }
    });

    it(`replays directory discovery and TypeScript globs using the producer setting (case sensitive: ${caseSensitivePaths})`, async () => {
      const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'filesystem-walk-'));
      const root = normalizeToAbsolutePath(path.join(temporary, 'project'));
      const archivePath = path.join(temporary, 'fs.pb.gz');
      fs.mkdirSync(path.join(root, 'src'), { recursive: true });
      fs.mkdirSync(path.join(root, 'Build'));
      fs.writeFileSync(path.join(root, 'src/Main.ts'), 'export const n = 1;');
      fs.writeFileSync(path.join(root, 'Build/hidden.ts'), 'export {};');
      const installation = installFsCache();
      const inspect = async () => {
        clearProgramOptionsCache();
        const config = createConfiguration({
          baseDir: root,
          jsTsExclusions: [`directory:${root}/build`],
        });
        const walked: string[] = [];
        await findFiles(root, config.jsTsExclusions, async (entry, file) => {
          if (entry.isFile()) walked.push(file);
        });
        const matched = readDirectory(root, ['.ts'], undefined, ['**/MAIN.ts']);
        const options = createProgramOptions(
          `${root}/tsconfig.json`,
          JSON.stringify({ files: ['src/Main.ts', 'SRC/main.ts'], include: [] }),
          true,
          undefined,
          root,
        );
        expect(options.rootNames).toHaveLength(caseSensitivePaths ? 2 : 1);
        expect(walked.length).toBe(caseSensitivePaths ? 2 : 1);
        expect(matched).toEqual(caseSensitivePaths ? [] : [`${root}/src/Main.ts`]);
        // User globs intentionally retain scanner-compatible case-insensitive matching.
        const userConfig = createConfiguration({ baseDir: root, jsTsExclusions: ['**/BUILD/**'] });
        expect(userConfig.jsTsExclusions.some(glob => glob.match(`${root}/Build/hidden.ts`))).toBe(
          true,
        );
        return walked.sort();
      };
      try {
        const recording = installation.beginAnalysis({
          archivePath,
          rootDir: root,
          mode: 'record',
          caseSensitivePaths,
        });
        let recorded: string[];
        try {
          recorded = await inspect();
        } finally {
          recording.end();
        }
        fs.rmSync(root, { recursive: true });
        const replay = installation.beginAnalysis({
          archivePath,
          rootDir: root,
          mode: 'replay',
          caseSensitivePaths: !caseSensitivePaths,
          restrictNativeReads: true,
        });
        try {
          expect(isFileSystemCaseSensitive()).toBe(caseSensitivePaths);
          expect(await inspect()).toEqual(recorded);
        } finally {
          replay.end();
        }
      } finally {
        fs.rmSync(temporary, { recursive: true, force: true });
      }
    });
  }
});
