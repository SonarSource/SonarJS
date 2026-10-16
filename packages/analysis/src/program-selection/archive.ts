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
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import type ts from 'typescript';
import {
  isAbsolutePath,
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../../shared/src/helpers/files.js';
import { sonarjs } from './analysis-metadata-proto.js';
import {
  normalizeProjectRoot,
  relativeProjectPath,
  replayProjectRoot,
  isWindowsProjectPath,
} from '../../../shared/src/helpers/project-paths.js';
import { readContextConfiguration, structFromObject } from './analysis-metadata-struct.js';
import { CompilerOptionPaths } from './compiler-option-paths.js';

const MAGIC = 'sonarjs-analysis-metadata';
const PROJECT_CONFIGURATION_PATHS = [
  'jsTsExclusions',
  'sources',
  'tests',
  'inclusions',
  'exclusions',
  'testInclusions',
  'testExclusions',
] as const;
// These are effective analyzer settings, not arbitrary scanner properties. The request remains
// authoritative for its submitted files and runtime-specific filesystem behavior.
const REPLAYABLE_CONFIGURATION_FIELDS = [
  'allowTsParserJsFiles',
  'ignoreHeaderComments',
  'maxFileSize',
  'environments',
  'globals',
  'tsSuffixes',
  'jsSuffixes',
  'cssSuffixes',
  'htmlSuffixes',
  'yamlSuffixes',
  'cssAdditionalSuffixes',
  'detectBundles',
  'detectGeneratedCode',
  'createTsProgramForOrphanFiles',
  'disableTypeChecking',
  'skipNodeModuleLookupOutsideBaseDir',
  'ecmaScriptVersion',
  ...PROJECT_CONFIGURATION_PATHS,
] as const;
type ReplayableConfiguration = Partial<
  Record<(typeof REPLAYABLE_CONFIGURATION_FIELDS)[number], unknown>
>;

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
  private readonly configuredProgramIds = new Map<NormalizedAbsolutePath, number>();
  private configuration: ReplayableConfiguration = {};
  private readonly pathsByCanonicalName = new Map<string, NormalizedAbsolutePath>();
  private nextProgramId = 1;
  private readonly compilerOptionPaths: CompilerOptionPaths;

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
    this.compilerOptionPaths = new CompilerOptionPaths(
      absolutePath => this.toRelative(absolutePath),
      relativePath => this.fromRelative(relativePath),
      () => this.baseDir,
    );
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
    return this.isReplay() ? this.configuration : undefined;
  }

  restoredBaseDir(): NormalizedAbsolutePath | undefined {
    return this.recordedBaseDir;
  }

  replayBaseDir(): NormalizedAbsolutePath | undefined {
    return this.recordedBaseDir ? this.baseDir : undefined;
  }

  canonicalRequestedFile(file: NormalizedAbsolutePath): NormalizedAbsolutePath {
    return this.pathsByCanonicalName.get(this.canonicalName(file)) ?? file;
  }

  private canonicalName(file: string): string {
    return isWindowsProjectPath(this.recordedBaseDir ?? this.baseDir) ? file.toLowerCase() : file;
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
    if (this.selections.has(file)) {
      throw new Error(`File has both a program and no-program outcome: ${file}`);
    }
    this.noProgramFiles.add(file);
    this.pathsByCanonicalName.set(this.canonicalName(file), file);
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
                    this.compilerOptionPaths.forStorage(program.compilerOptions),
                  ),
                },
              }
            : {
                id,
                orphan: {
                  compilerOptions: structFromObject(
                    this.compilerOptionPaths.forStorage(program.compilerOptions),
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
    fs.mkdirSync(path.dirname(this.archivePath), { recursive: true });
    fs.writeFileSync(this.archivePath, bytes);
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
    this.selections.set(file, programId);
    this.pathsByCanonicalName.set(this.canonicalName(file), file);
    const files = this.filesByProgram.get(programId) ?? [];
    files.push(file);
    this.filesByProgram.set(programId, files);
  }

  private load(restoreOriginalPaths: boolean, contextMetadata?: string): void {
    const metadata = sonarjs.programselection.AnalysisMetadata.decode(
      gunzipSync(fs.readFileSync(this.archivePath)),
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
      if (this.hasSelection(file)) {
        throw new Error(`Duplicate program selection for ${selection.filePath}`);
      }
      this.addSelection(file, programId);
    }
    for (const relativePath of metadata.programSelection.noProgramFiles ?? []) {
      const file = this.fromRelative(relativePath);
      if (this.hasSelection(file) || this.hasNoProgram(file)) {
        throw new Error(`Duplicate or conflicting no-program outcome for ${relativePath}`);
      }
      this.noProgramFiles.add(file);
      this.pathsByCanonicalName.set(this.canonicalName(file), file);
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
    const recordedBaseDir = this.recordedBaseDir;
    if (recordedBaseDir && recordedBaseDir !== this.baseDir) {
      for (const field of PROJECT_CONFIGURATION_PATHS) {
        this.configuration[field] = this.relocateConfigurationValue(
          this.configuration[field],
          recordedBaseDir,
        );
      }
    }
  }

  private relocateConfigurationValue(
    value: unknown,
    recordedBaseDir: NormalizedAbsolutePath,
  ): unknown {
    const relocate = (item: unknown) => this.relocateConfigurationPath(item, recordedBaseDir);
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
  ): unknown {
    if (typeof item !== 'string') {
      return item;
    }
    const prefix = /^file:/i.exec(item)?.[0] ?? '';
    const original = item.slice(prefix.length);
    if (!isAbsolutePath(original)) {
      return item;
    }
    const relative = relativeProjectPath(original, recordedBaseDir);
    return relative === undefined
      ? item
      : `${prefix}${normalizeToAbsolutePath(relative, this.baseDir)}`;
  }

  private restoreProgram(entry: sonarjs.programselection.IProgram): RecordedProgram {
    if (entry.configured?.tsconfigPath && entry.configured.compilerOptions) {
      return {
        kind: 'configured',
        tsconfig: this.fromRelative(entry.configured.tsconfigPath),
        compilerOptions: this.compilerOptionPaths.restore(entry.configured.compilerOptions),
      };
    }
    if (entry.orphan?.compilerOptions) {
      return {
        kind: 'orphan',
        compilerOptions: this.compilerOptionPaths.restore(entry.orphan.compilerOptions),
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
}
