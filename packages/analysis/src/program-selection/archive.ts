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
import { sonarjs } from './program-selection-proto.js';

const MAGIC = 'sonarjs-typescript-program-selection';
const FORMAT_VERSION = 1;
const PROJECT_RELATIVE_PATH_PREFIX = '\0project-relative:';
const COMPILER_OPTION_PATHS = new Set([
  'baseUrl',
  'configFilePath',
  'declarationDir',
  'mapRoot',
  'outDir',
  'pathsBasePath',
  'rootDir',
  'sourceRoot',
  'tsBuildInfoFile',
]);
const COMPILER_OPTION_PATH_LISTS = new Set(['rootDirs', 'typeRoots']);

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
  private readonly baseDir: NormalizedAbsolutePath;
  private readonly mode: 'record' | 'replay';
  private readonly programs = new Map<number, StoredProgram>();
  private readonly selections = new Map<NormalizedAbsolutePath, number>();
  private readonly filesByProgram = new Map<number, NormalizedAbsolutePath[]>();
  private readonly configuredProgramIds = new Map<NormalizedAbsolutePath, number>();
  private nextProgramId = 1;

  constructor(archivePath: string, baseDir: NormalizedAbsolutePath) {
    this.archivePath = path.resolve(archivePath);
    this.baseDir = baseDir;
    this.mode = fs.existsSync(this.archivePath) ? 'replay' : 'record';
    if (this.mode === 'replay') {
      this.load();
    }
  }

  isReplay(): boolean {
    return this.mode === 'replay';
  }

  recordConfigured(
    file: NormalizedAbsolutePath,
    tsconfig: NormalizedAbsolutePath,
    compilerOptions: ts.CompilerOptions,
  ): void {
    if (this.mode !== 'record') {
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
    if (this.mode !== 'record') {
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

  restoredSelections(files: Iterable<NormalizedAbsolutePath>): RestoredProgramSelection[] {
    if (this.mode !== 'replay') {
      return [];
    }
    const requestedFilesByProgram = new Map<number, NormalizedAbsolutePath[]>();
    for (const file of files) {
      const id = this.selections.get(file);
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
    return this.selections.has(file);
  }

  end(): void {
    if (this.mode !== 'record') {
      return;
    }
    const archive = sonarjs.programselection.Archive.fromObject({
      magic: MAGIC,
      formatVersion: FORMAT_VERSION,
      programs: [...this.programs.values()].map(({ id, program }) =>
        program.kind === 'configured'
          ? {
              id,
              configured: {
                tsconfigPath: this.toRelative(program.tsconfig),
                compilerOptions: structFromObject(
                  this.compilerOptionsForStorage(program.compilerOptions),
                ),
              },
            }
          : {
              id,
              orphan: {
                compilerOptions: structFromObject(
                  this.compilerOptionsForStorage(program.compilerOptions),
                ),
              },
            },
      ),
      files: [...this.selections.entries()].map(([file, programId]) => ({
        filePath: this.toRelative(file),
        programId,
      })),
    });
    const bytes = gzipSync(sonarjs.programselection.Archive.encode(archive).finish());
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
    const existingProgramId = this.selections.get(file);
    if (existingProgramId !== undefined) {
      if (existingProgramId === programId) {
        return;
      }
      throw new Error(`Multiple program selections recorded for ${file}`);
    }
    this.selections.set(file, programId);
    const files = this.filesByProgram.get(programId) ?? [];
    files.push(file);
    this.filesByProgram.set(programId, files);
  }

  private load(): void {
    const bytes = gunzipSync(fs.readFileSync(this.archivePath));
    const archive = sonarjs.programselection.Archive.decode(bytes);
    if (archive.magic !== MAGIC) {
      throw new Error(`Not a SonarJS program selection archive: ${this.archivePath}`);
    }
    if (archive.formatVersion !== FORMAT_VERSION) {
      throw new Error(
        `Unsupported program selection archive version ${archive.formatVersion}; expected ${FORMAT_VERSION}`,
      );
    }
    for (const entry of archive.programs) {
      const id = entry.id;
      if (id == null || id === 0 || this.programs.has(id)) {
        throw new Error(`Invalid or duplicate program id ${entry.id}`);
      }
      let program: RecordedProgram;
      if (entry.configured?.tsconfigPath && entry.configured.compilerOptions) {
        program = {
          kind: 'configured',
          tsconfig: this.fromRelative(entry.configured.tsconfigPath),
          compilerOptions: this.restoreCompilerOptions(entry.configured.compilerOptions),
        };
      } else if (entry.orphan?.compilerOptions) {
        program = {
          kind: 'orphan',
          compilerOptions: this.restoreCompilerOptions(entry.orphan.compilerOptions),
        };
      } else {
        throw new Error(`Program ${id} has no descriptor`);
      }
      this.programs.set(id, { id, program });
    }
    for (const selection of archive.files) {
      const programId = selection.programId;
      if (!selection.filePath || programId == null || !this.programs.has(programId)) {
        throw new Error(`Invalid selection for ${selection.filePath || '<empty path>'}`);
      }
      const file = this.fromRelative(selection.filePath);
      if (this.selections.has(file)) {
        throw new Error(`Duplicate program selection for ${selection.filePath}`);
      }
      this.addSelection(file, programId);
    }
  }

  private toRelative(absolutePath: NormalizedAbsolutePath): string {
    const relativePath = path.posix.relative(this.baseDir, absolutePath);
    if (
      relativePath === '..' ||
      relativePath.startsWith('../') ||
      path.posix.isAbsolute(relativePath)
    ) {
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
    if (!relativePath || path.posix.isAbsolute(relativePath)) {
      throw new Error(`Invalid relative program selection path: ${relativePath}`);
    }
    const absolutePath = normalizeToAbsolutePath(relativePath, this.baseDir);
    this.toRelative(absolutePath);
    return absolutePath;
  }

  private compilerOptionsForStorage(options: ts.CompilerOptions): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(options).map(([key, value]) => {
        if (COMPILER_OPTION_PATHS.has(key) && typeof value === 'string') {
          return [key, this.portableCompilerOptionPath(value)];
        }
        if (COMPILER_OPTION_PATH_LISTS.has(key) && Array.isArray(value)) {
          return [
            key,
            value.map(item =>
              typeof item === 'string' ? this.portableCompilerOptionPath(item) : item,
            ),
          ];
        }
        if (key === 'paths' && value && typeof value === 'object') {
          return [
            key,
            this.mapCompilerOptionPaths(value, item => this.portableCompilerOptionPath(item)),
          ];
        }
        return [key, value];
      }),
    );
  }

  private restoreCompilerOptions(struct: {
    fields?: Record<string, unknown> | null;
  }): ts.CompilerOptions {
    const options = objectFromStruct(struct);
    for (const [key, value] of Object.entries(options)) {
      if (COMPILER_OPTION_PATHS.has(key) && typeof value === 'string') {
        options[key] = this.restoreCompilerOptionPath(value);
      } else if (COMPILER_OPTION_PATH_LISTS.has(key) && Array.isArray(value)) {
        options[key] = value.map(item =>
          typeof item === 'string' ? this.restoreCompilerOptionPath(item) : item,
        );
      } else if (key === 'paths' && value && typeof value === 'object') {
        options[key] = this.mapCompilerOptionPaths(value, item =>
          this.restoreCompilerOptionPath(item),
        );
      }
    }
    return options as ts.CompilerOptions;
  }

  private portableCompilerOptionPath(value: string): string {
    if (!isAbsolutePath(value)) {
      return value;
    }
    const normalized = normalizeToAbsolutePath(value);
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

  private mapCompilerOptionPaths(
    value: object,
    transform: (path: string) => string,
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).map(([key, paths]) => [
        key,
        Array.isArray(paths)
          ? paths.map(item => (typeof item === 'string' ? transform(item) : item))
          : paths,
      ]),
    );
  }
}

function structFromObject(value: object): { fields: Record<string, unknown> } {
  return {
    fields: Object.fromEntries(
      Object.entries(value).flatMap(([key, item]) => {
        const converted = valueFromUnknown(item);
        return converted === undefined ? [] : [[key, converted]];
      }),
    ),
  };
}

function valueFromUnknown(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    return undefined;
  }
  if (value === null) {
    return { nullValue: 0 };
  }
  if (typeof value === 'boolean') {
    return { boolValue: value };
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Cannot serialize non-finite compiler option value ${value}`);
    }
    return { numberValue: value };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (Array.isArray(value)) {
    return {
      listValue: { values: value.map(valueFromUnknown).filter(item => item !== undefined) },
    };
  }
  if (typeof value === 'object') {
    return { structValue: structFromObject(value) };
  }
  return undefined;
}

function objectFromStruct(struct: {
  fields?: Record<string, unknown> | null;
}): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(struct.fields ?? {}).map(([key, value]) => [key, unknownFromValue(value)]),
  );
}

function unknownFromValue(value: unknown): unknown {
  const typed = value as {
    nullValue?: number | null;
    boolValue?: boolean | null;
    numberValue?: number | null;
    stringValue?: string | null;
    listValue?: { values?: unknown[] | null } | null;
    structValue?: { fields?: Record<string, unknown> | null } | null;
  };
  if (typed.nullValue != null) {
    return null;
  }
  if (typed.boolValue != null) {
    return typed.boolValue;
  }
  if (typed.numberValue != null) {
    return typed.numberValue;
  }
  if (typed.stringValue != null) {
    return typed.stringValue;
  }
  if (typed.listValue != null) {
    return (typed.listValue.values ?? []).map(unknownFromValue);
  }
  if (typed.structValue != null) {
    return objectFromStruct(typed.structValue);
  }
  throw new Error('Invalid compiler option value in program selection archive');
}
