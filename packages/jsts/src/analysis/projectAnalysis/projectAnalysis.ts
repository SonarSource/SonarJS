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
import type { FileStatus, JsTsAnalysisOutput } from '../analysis.js';
import type { RuleConfig } from '../../linter/config/rule-config.js';
import type { RuleConfig as CssRuleConfig } from '../../../../css/src/linter/config.js';
import type { EmbeddedAnalysisOutput } from '../../embedded/analysis/analysis.js';
import type { CssAnalysisOutput } from '../../../../css/src/analysis/analysis.js';
import type { ErrorCode } from '../../../../shared/src/errors/error.js';
import type { FileType, NormalizedAbsolutePath } from '../../../../shared/src/helpers/files.js';

// Re-export for backward compatibility
export { type JsTsConfigFields } from '../../../../shared/src/helpers/configuration.js';

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

export type FileResult = AnalysisOutputWithParsingErrors | ParsingErrors | { error: string };

export type ParsingErrorLanguage = 'js' | 'ts' | 'css';

export type ParsingError = {
  message: string;
  code: ErrorCode;
  line?: number;
  language: ParsingErrorLanguage;
};

export type ParsingErrors = {
  /**
   * A file can be analyzed by more than one language pipeline (for example
   * HTML/Vue can run both JS/TS and CSS analysis), so we keep parsing errors
   * as an array to preserve every parser failure found in a single file.
   */
  parsingErrors: ParsingError[];
};

type AnalysisOutputWithParsingErrors =
  | (JsTsAnalysisOutput & { parsingErrors?: ParsingError[] })
  | (EmbeddedAnalysisOutput & { parsingErrors?: ParsingError[] })
  | (CssAnalysisOutput & { parsingErrors?: ParsingError[] });

/**
 * Partial file input used for intermediate storage during project analysis.
 * Contains the per-file fields needed for storage and analysis.
 * The remaining fields are filled from configuration when actually analyzing the file.
 */
export type AnalyzableFile = {
  filePath: NormalizedAbsolutePath;
  fileContent: string;
  fileType: FileType;
  fileStatus: FileStatus;
};

// Brand for the AnalyzableFiles container - ensures type-safe iteration
declare const AnalyzableFilesBrand: unique symbol;

/**
 * Branded type for files keyed by NormalizedAbsolutePath.
 * The brand ensures compile-time type safety when iterating over the object.
 */
export type AnalyzableFiles = { [key: NormalizedAbsolutePath]: AnalyzableFile } & {
  readonly [AnalyzableFilesBrand]: never;
};

/**
 * Creates an empty branded AnalyzableFiles object.
 */
export function createAnalyzableFiles(): AnalyzableFiles {
  return {} as AnalyzableFiles;
}

// Backward-compatible aliases kept during transition.
export type JsTsFile = AnalyzableFile;
export type JsTsFiles = AnalyzableFiles;
export const createJsTsFiles = createAnalyzableFiles;

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

/**
 * Sanitized project analysis input.
 * All paths are normalized, configuration is already set globally.
 * Files are retrieved internally from the sourceFileStore.
 */
export type ProjectAnalysisInput = {
  rules: RuleConfig[];
  cssRules?: CssRuleConfig[];
  bundles: NormalizedAbsolutePath[];
  rulesWorkdir?: NormalizedAbsolutePath;
};
