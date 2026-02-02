/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type {
  FileStatus,
  JsTsAnalysisOutput,
  JsTsAnalysisOutputWithAst,
  RawJsTsAnalysisInput,
} from '../analysis.js';
import type { RuleConfig } from '../../linter/config/rule-config.js';
import type { EmbeddedAnalysisOutput } from '../../embedded/analysis/analysis.js';
import type { ErrorCode } from '../../../../shared/src/errors/error.js';
import type { RawConfiguration } from '../../../../shared/src/helpers/configuration.js';
import type { FileType, NormalizedAbsolutePath } from '../../../../shared/src/helpers/files.js';

export type ProjectAnalysisMeta = {
  warnings: string[];
};

// Brand for the FileResults container - ensures type-safe iteration
declare const FileResultsBrand: unique symbol;

/**
 * Branded type for file analysis results keyed by NormalizedAbsolutePath.
 * The brand ensures compile-time type safety when iterating over the object.
 */
export type FileResults = { [key: NormalizedAbsolutePath]: FileResult } & {
  readonly [FileResultsBrand]: never;
};

export type ProjectAnalysisOutput = {
  files: FileResults;
  meta: ProjectAnalysisMeta;
};

export type FileResult =
  | JsTsAnalysisOutput
  | JsTsAnalysisOutputWithAst
  | EmbeddedAnalysisOutput
  | ParsingError
  | { error: string };

type ParsingError = {
  parsingError: {
    message: string;
    code: ErrorCode;
    line?: number;
  };
};

/**
 * Partial file input used for intermediate storage during project analysis.
 * Contains the per-file fields needed for storage and analysis.
 * The remaining fields are filled from configuration when actually analyzing the file.
 */
export type StoredJsTsFile = {
  filePath: NormalizedAbsolutePath;
  fileContent: string;
  fileType: FileType;
  fileStatus: FileStatus;
};

// Brand for the JsTsFiles container - ensures type-safe iteration
declare const JsTsFilesBrand: unique symbol;

/**
 * Branded type for JS/TS files keyed by NormalizedAbsolutePath.
 * The brand ensures compile-time type safety when iterating over the object.
 */
export type JsTsFiles = { [key: NormalizedAbsolutePath]: StoredJsTsFile } & {
  readonly [JsTsFilesBrand]: never;
};

/**
 * Creates an empty branded JsTsFiles object.
 */
export function createJsTsFiles(): JsTsFiles {
  return {} as JsTsFiles;
}

/**
 * Creates an empty branded FileResults object.
 */
export function createFileResults(): FileResults {
  return {} as FileResults;
}

/**
 * Type-safe iteration helper for FileResults.
 * Returns entries with properly typed keys as NormalizedAbsolutePath.
 */
export function entriesOfFileResults(files: FileResults): [NormalizedAbsolutePath, FileResult][] {
  return Object.entries(files) as [NormalizedAbsolutePath, FileResult][];
}

export type RawJsTsFiles = { [key: string]: RawJsTsAnalysisInput };

/**
 * Raw project analysis input as received from JSON.
 * Contains unsanitized paths and configuration.
 */
export type RawProjectAnalysisInput = {
  files?: RawJsTsFiles;
  rules: RuleConfig[];
  configuration?: RawConfiguration;
  bundles?: string[];
  rulesWorkdir?: string;
};

/**
 * Sanitized project analysis input.
 * All paths are normalized, configuration is already set globally.
 */
export type ProjectAnalysisInput = {
  filesToAnalyze: JsTsFiles;
  pendingFiles: Set<NormalizedAbsolutePath>;
  rules: RuleConfig[];
  bundles: NormalizedAbsolutePath[];
  rulesWorkdir?: NormalizedAbsolutePath;
};
