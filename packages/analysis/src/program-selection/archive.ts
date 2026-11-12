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
import {
  nativeFs,
  writeFileWithNativePrimitives,
  ARCHIVE_FILE_MODE,
} from '../../../shared/src/fs-cache/archive-types.js';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import type ts from 'typescript';
import { escapeGlobPath, parsePathPattern } from '../common/path-pattern.js';
import {
  isAbsolutePath,
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../../shared/src/helpers/files.js';
import { sonarjs } from './analysis-metadata-proto.js';
import {
  readContextConfiguration,
  PROJECT_CONFIGURATION_PATHS,
  PROJECT_RELATIVE_PATH_PREFIX,
  REPLAYABLE_CONFIGURATION_FIELDS,
  type ReplayableConfiguration,
} from './configuration-fields.js';
import { structFromObject } from './struct-conversion.js';
import { compilerOptionsForStorage, restoreCompilerOptions } from './compiler-options-paths.js';
import {
  normalizeProjectRoot,
  relativeProjectPath,
  replayProjectRoot,
} from '../../../shared/src/helpers/project-paths.js';

import {
  canonicalFileName,
  isFileSystemCaseSensitive,
  FileSystemMap,
} from '../common/filesystem.js';

const MAGIC = 'sonarjs-analysis-metadata';

type ConfiguredProgram = {
  kind: 'configured';
  tsconfig: NormalizedAbsolutePath;
  compilerOptions: ts.CompilerOptions;
};

type OrphanProgram = {
  kind: 'orphan';
  compilerOptions: ts.CompilerOptions;
};

export type RecordedProgram = ConfiguredProgram | OrphanProgram;

export function isConfigured(program: RecordedProgram): program is ConfiguredProgram {
  return program.kind === 'configured';
}

export type RestoredProgramSelection = {
  id: number;
  program: RecordedProgram;
  rootNames: NormalizedAbsolutePath[];
  requestedFiles: NormalizedAbsolutePath[];
};

type StoredProgram = {
  id: number;
  program: RecordedProgram;
};

/**
 * Records portable TypeScript program selections relative to the analysis base directory.
 * Selections containing files or tsconfigs outside that directory are omitted, while other
 * selections remain replayable.
 */
export class ProgramSelectionArchive {
  private readonly archivePath: string;
  private baseDir: NormalizedAbsolutePath;
  private recordedBaseDir?: NormalizedAbsolutePath;
  private readonly mode: 'record' | 'replay';
  private readonly programs = new Map<number, StoredProgram>();
  private readonly selections = new Map<NormalizedAbsolutePath, number>();
  private readonly noProgramFiles = new Set<NormalizedAbsolutePath>();
  private readonly filesByProgram = new Map<number, NormalizedAbsolutePath[]>();
  private readonly configuredProgramIds = new FileSystemMap<NormalizedAbsolutePath, number>();
  private configuration: ReplayableConfiguration = {};
  private readonly pathsByCanonicalName = new Map<string, NormalizedAbsolutePath>();
  private canonicalPathsCaseSensitive?: boolean;
  private nextProgramId = 1;

  constructor(
    archivePath: string,
    baseDir: NormalizedAbsolutePath,
    mode?: 'record' | 'replay',
    restoreOriginalPaths = false,
    contextMetadata?: string,
  ) {
    this.archivePath = path.resolve(archivePath);
    this.baseDir = baseDir;
    this.mode = mode ?? (fs.existsSync(this.archivePath) ? 'replay' : 'record');
    if (this.isReplay()) {
      this.load(restoreOriginalPaths, contextMetadata);
    }
  }

  isReplay(): boolean {
    return this.mode === 'replay';
  }

  isRecord(): boolean {
    return this.mode === 'record';
  }

  restoredConfiguration(): ReplayableConfiguration | undefined {
    if (!this.isReplay()) {
      return undefined;
    }
    const configuration = { ...this.configuration };
    const recordedBaseDir = this.recordedBaseDir;
    if (recordedBaseDir && recordedBaseDir !== this.baseDir) {
      for (const field of PROJECT_CONFIGURATION_PATHS) {
        configuration[field] = this.relocateConfigurationValue(
          configuration[field],
          recordedBaseDir,
          field !== 'sources' && field !== 'tests',
        );
      }
    }
    return configuration;
  }

  restoredBaseDir(): NormalizedAbsolutePath | undefined {
    return this.recordedBaseDir;
  }

  replayBaseDir(): NormalizedAbsolutePath | undefined {
    return this.recordedBaseDir ? this.baseDir : undefined;
  }

  canonicalRequestedFile(file: NormalizedAbsolutePath): NormalizedAbsolutePath {
    const caseSensitive = isFileSystemCaseSensitive();
    if (this.canonicalPathsCaseSensitive !== caseSensitive) {
      // Metadata is read before replay starts. Build its lookup only once the filesystem's
      // capability is available, retaining all original spellings while loading.
      this.pathsByCanonicalName.clear();
      for (const stored of [...this.selections.keys(), ...this.noProgramFiles]) {
        const key = canonicalFileName(stored);
        if (this.pathsByCanonicalName.has(key)) {
          throw new Error(`Duplicate program outcome for ${stored}`);
        }
        this.pathsByCanonicalName.set(key, stored);
      }
      this.canonicalPathsCaseSensitive = caseSensitive;
    }
    return this.pathsByCanonicalName.get(canonicalFileName(file)) ?? file;
  }

  recordConfigured(
    file: NormalizedAbsolutePath,
    tsconfig: NormalizedAbsolutePath,
    compilerOptions: ts.CompilerOptions,
  ): void {
    if (!this.isRecord()) {
      return;
    }
    if (!this.isProjectRelative(file) || !this.isProjectRelative(tsconfig)) {
      return;
    }
    let id = this.configuredProgramIds.get(tsconfig);
    if (id === undefined) {
      id = this.addProgram({ kind: 'configured', tsconfig, compilerOptions });
      this.configuredProgramIds.set(tsconfig, id);
    }
    this.addSelection(file, id);
  }

  recordOrphanGroup(files: NormalizedAbsolutePath[], compilerOptions: ts.CompilerOptions): void {
    if (!this.isRecord()) {
      return;
    }
    const projectFiles = files.filter(file => this.isProjectRelative(file));
    if (projectFiles.length === 0) {
      return;
    }
    const id = this.addProgram({ kind: 'orphan', compilerOptions });
    for (const file of projectFiles) {
      this.addSelection(file, id);
    }
  }

  getRestoredSelections(files: Iterable<NormalizedAbsolutePath>): RestoredProgramSelection[] {
    if (!this.isReplay()) {
      return [];
    }
    const requestedFilesByProgram = new Map<number, NormalizedAbsolutePath[]>();
    for (const file of files) {
      const id = this.selections.get(this.canonicalRequestedFile(file));
      if (id !== undefined) {
        const requestedFiles = requestedFilesByProgram.get(id) ?? [];
        requestedFiles.push(file);
        requestedFilesByProgram.set(id, requestedFiles);
      }
    }
    return [...requestedFilesByProgram].map(([id, requestedFiles]) => {
      const stored = this.programs.get(id);
      if (!stored) {
        throw new Error(`Program selection references unknown program ${id}`);
      }
      return {
        id,
        program: stored.program,
        rootNames: this.filesByProgram.get(id) ?? [],
        requestedFiles,
      };
    });
  }

  hasSelection(file: NormalizedAbsolutePath): boolean {
    return this.selections.has(this.canonicalRequestedFile(file));
  }

  hasNoProgram(file: NormalizedAbsolutePath): boolean {
    return this.noProgramFiles.has(this.canonicalRequestedFile(file));
  }

  recordNoProgram(file: NormalizedAbsolutePath): void {
    if (!this.isRecord() || !this.isProjectRelative(file)) {
      return;
    }
    if (this.hasSelection(file)) {
      throw new Error(`File has both a program and no-program outcome: ${file}`);
    }
    const original = this.canonicalRequestedFile(file);
    this.noProgramFiles.add(original);
    this.pathsByCanonicalName.set(canonicalFileName(original), original);
  }

  end(): void {
    if (!this.isRecord()) {
      return;
    }
    const metadata = sonarjs.programselection.AnalysisMetadata.fromObject({
      programSelection: {
        magic: MAGIC,
        programs: [...this.programs.values()].map(({ id, program }) =>
          isConfigured(program)
            ? {
                id,
                configured: {
                  tsconfigPath: this.toRelative(program.tsconfig),
                  compilerOptions: structFromObject(
                    this.storableCompilerOptions(program.compilerOptions),
                  ),
                },
              }
            : {
                id,
                orphan: {
                  compilerOptions: structFromObject(
                    this.storableCompilerOptions(program.compilerOptions),
                  ),
                },
              },
        ),
        files: [...this.selections.entries()].map(([file, programId]) => ({
          filePath: this.toRelative(file),
          programId,
        })),
        noProgramFiles: [...this.noProgramFiles].map(file => this.toRelative(file)),
      },
    });
    const bytes = gzipSync(sonarjs.programselection.AnalysisMetadata.encode(metadata).finish());
    nativeFs.mkdirSync(path.dirname(this.archivePath), { recursive: true });
    writeFileWithNativePrimitives(this.archivePath, bytes, ARCHIVE_FILE_MODE);
  }

  private addProgram(program: RecordedProgram): number {
    const id = this.nextProgramId;
    this.nextProgramId += 1;
    this.programs.set(id, { id, program });
    return id;
  }

  private addSelection(file: NormalizedAbsolutePath, programId: number): void {
    if (this.hasNoProgram(file)) {
      throw new Error(`File has both a program and no-program outcome: ${file}`);
    }
    const existingProgramId = this.selections.get(this.canonicalRequestedFile(file));
    if (existingProgramId !== undefined) {
      if (existingProgramId === programId) {
        return;
      }
      throw new Error(`Multiple program selections recorded for ${file}`);
    }
    this.storeSelection(file, programId);
  }

  private storeSelection(file: NormalizedAbsolutePath, programId: number): void {
    this.selections.set(file, programId);
    if (this.canonicalPathsCaseSensitive !== undefined) {
      this.pathsByCanonicalName.set(canonicalFileName(file), file);
    }
    const files = this.filesByProgram.get(programId) ?? [];
    files.push(file);
    this.filesByProgram.set(programId, files);
  }

  private load(restoreOriginalPaths: boolean, contextMetadata?: string): void {
    const metadata = sonarjs.programselection.AnalysisMetadata.decode(
      gunzipSync(nativeFs.readFileSync(this.archivePath)),
    );
    if (metadata.programSelection?.magic !== MAGIC) {
      throw new Error(`Not a SonarJS analysis metadata archive: ${this.archivePath}`);
    }
    this.loadConfiguration(restoreOriginalPaths, contextMetadata);
    for (const entry of metadata.programSelection.programs ?? []) {
      const id = entry.id;
      if (id == null || id === 0 || this.programs.has(id)) {
        throw new Error(`Invalid or duplicate program id ${entry.id}`);
      }
      const program = this.restoreProgram(entry);
      this.programs.set(id, { id, program });
    }
    for (const selection of metadata.programSelection.files ?? []) {
      const programId = selection.programId;
      if (!selection.filePath || programId == null || !this.programs.has(programId)) {
        throw new Error(`Invalid selection for ${selection.filePath || '<empty path>'}`);
      }
      const file = this.fromRelative(selection.filePath);
      if (this.selections.has(file)) {
        throw new Error(`Duplicate program selection for ${selection.filePath}`);
      }
      this.storeSelection(file, programId);
    }
    for (const relativePath of metadata.programSelection.noProgramFiles ?? []) {
      const file = this.fromRelative(relativePath);
      if (this.selections.has(file) || this.noProgramFiles.has(file)) {
        throw new Error(`Duplicate or conflicting no-program outcome for ${relativePath}`);
      }
      this.noProgramFiles.add(file);
      this.canonicalPathsCaseSensitive = undefined;
    }
  }

  private loadConfiguration(restoreOriginalPaths: boolean, contextMetadata?: string): void {
    const configuration = readContextConfiguration(contextMetadata);
    if (configuration) {
      if (!isAbsolutePath(configuration.baseDir)) {
        throw new Error('Invalid SonarJS analysis metadata base directory');
      }
      this.recordedBaseDir = normalizeProjectRoot(configuration.baseDir);
      if (restoreOriginalPaths) {
        this.baseDir = replayProjectRoot(this.recordedBaseDir, this.baseDir);
      }
    }
    this.configuration = Object.fromEntries(
      REPLAYABLE_CONFIGURATION_FIELDS.map(field => [field, configuration?.[field] ?? null]),
    );
  }

  private relocateConfigurationValue(
    value: unknown,
    recordedBaseDir: NormalizedAbsolutePath,
    isGlob: boolean,
  ): unknown {
    const relocate = (item: unknown) =>
      this.relocateConfigurationPath(item, recordedBaseDir, isGlob);
    if (Array.isArray(value)) {
      return value.map(relocate);
    }
    if (value && typeof value === 'object' && 'values' in value && Array.isArray(value.values)) {
      return { values: value.values.map(relocate) };
    }
    return value;
  }

  private relocateConfigurationPath(
    item: unknown,
    recordedBaseDir: NormalizedAbsolutePath,
    isGlobSetting: boolean,
  ): unknown {
    if (typeof item !== 'string') {
      return item;
    }
    const { prefix, value: original, isDirectory } = parsePathPattern(item);
    const isGlob = isGlobSetting && !isDirectory;
    if (!isAbsolutePath(original)) {
      return item;
    }
    // Literal absolute globs can contain a bracket-escaped project root. Relocate only
    // that root, preserving the pattern suffix and escaping the new root as well.
    const relative =
      relativeProjectPath(original, isGlob ? escapeGlobPath(recordedBaseDir) : recordedBaseDir) ??
      relativeProjectPath(original, recordedBaseDir);
    const replayRoot = isGlob ? escapeGlobPath(this.baseDir) : this.baseDir;
    return relative === undefined
      ? item
      : `${prefix}${normalizeToAbsolutePath(relative, replayRoot)}`;
  }

  private restoreProgram(entry: sonarjs.programselection.IProgram): RecordedProgram {
    if (entry.configured?.tsconfigPath && entry.configured.compilerOptions) {
      return {
        kind: 'configured',
        tsconfig: this.fromRelative(entry.configured.tsconfigPath),
        compilerOptions: this.restoredCompilerOptions(entry.configured.compilerOptions),
      };
    }
    if (entry.orphan?.compilerOptions) {
      return {
        kind: 'orphan',
        compilerOptions: this.restoredCompilerOptions(entry.orphan.compilerOptions),
      };
    }
    throw new Error(`Program ${entry.id} has no descriptor`);
  }

  private toRelative(absolutePath: NormalizedAbsolutePath): string {
    const relativePath = relativeProjectPath(absolutePath, this.baseDir);
    if (relativePath === undefined) {
      throw new Error(`Program selection path is outside the project: ${absolutePath}`);
    }
    return relativePath;
  }

  private isProjectRelative(absolutePath: NormalizedAbsolutePath): boolean {
    try {
      this.toRelative(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  private fromRelative(relativePath: string): NormalizedAbsolutePath {
    if (!relativePath || isAbsolutePath(relativePath) || relativePath.includes('\\')) {
      throw new Error(`Invalid relative program selection path: ${relativePath}`);
    }
    const absolutePath = normalizeToAbsolutePath(relativePath, this.baseDir);
    this.toRelative(absolutePath);
    return absolutePath;
  }

  private storableCompilerOptions(options: ts.CompilerOptions): Record<string, unknown> {
    return compilerOptionsForStorage(options, item => this.portableCompilerOptionPath(item));
  }

  private restoredCompilerOptions(struct: {
    fields?: Record<string, unknown> | null;
  }): ts.CompilerOptions {
    return restoreCompilerOptions(struct, item => this.restoreCompilerOptionPath(item));
  }

  private portableCompilerOptionPath(value: string): string {
    if (!isAbsolutePath(value)) {
      return value;
    }
    const normalized = normalizeProjectRoot(value);
    try {
      return PROJECT_RELATIVE_PATH_PREFIX + this.toRelative(normalized);
    } catch {
      return value;
    }
  }

  private restoreCompilerOptionPath(value: string): string {
    if (!value.startsWith(PROJECT_RELATIVE_PATH_PREFIX)) {
      return value;
    }
    const relativePath = value.slice(PROJECT_RELATIVE_PATH_PREFIX.length);
    return relativePath === '' ? this.baseDir : this.fromRelative(relativePath);
  }
}
