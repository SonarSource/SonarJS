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
import {
  type NormalizedAbsolutePath,
  normalizeToAbsolutePath,
  readFile,
  FileType,
} from './files.js';
import { isJsFile, isTsFile, type JsTsLanguage } from './configuration.js';
import { filterPathAndGetFileType } from './filter/filter-path.js';
import type { RawAnalysisInput, AnalysisInput } from '../types/analysis.js';
import {
  type RawJsTsAnalysisInput,
  type JsTsAnalysisInput,
  JSTS_ANALYSIS_DEFAULTS,
} from '../../../jsts/src/analysis/analysis.js';

/**
 * Sanitizes an array of paths to normalized absolute paths.
 * @param paths the raw paths to sanitize
 * @param baseDir the base directory to resolve relative paths against
 * @returns an array of normalized absolute paths
 */
export function sanitizePaths(
  paths: string[] | undefined,
  baseDir: NormalizedAbsolutePath,
): NormalizedAbsolutePath[] {
  return (paths ?? []).map(p => normalizeToAbsolutePath(p, baseDir));
}

/**
 * Sanitizes a raw analysis input into a complete, validated input.
 * - Normalizes file path
 * - Reads file content if not provided
 * - Sets defaults for optional fields
 *
 * @param raw the raw analysis input from JSON deserialization
 * @param baseDir the base directory to resolve relative paths against
 * @returns a promise of the sanitized analysis input with all fields required
 */
export async function sanitizeAnalysisInput(
  raw: RawAnalysisInput,
  baseDir: NormalizedAbsolutePath,
): Promise<AnalysisInput> {
  const filePath = normalizeToAbsolutePath(raw.filePath, baseDir);
  const fileContent = raw.fileContent ?? (await readFile(filePath));

  return {
    filePath,
    fileContent,
    sonarlint: raw.sonarlint ?? JSTS_ANALYSIS_DEFAULTS.sonarlint,
  };
}

/**
 * Infers the language (js or ts) from the file path and content.
 * @param explicit explicitly provided language, if any
 * @param filePath the normalized file path
 * @param fileContent the file content (needed for Vue files to detect TS)
 * @returns the inferred or explicit language
 * @throws Error if language cannot be inferred
 */
export function inferLanguage(
  explicit: JsTsLanguage | undefined,
  filePath: NormalizedAbsolutePath,
  fileContent: string,
): JsTsLanguage {
  if (explicit) return explicit;
  if (isTsFile(filePath, fileContent)) return 'ts';
  if (isJsFile(filePath)) return 'js';
  throw new Error(`Unable to infer language for file ${filePath}`);
}

/**
 * Infers the file type (MAIN or TEST) from the file path.
 * Uses the filter path logic to determine if a file is a test file.
 * @param filePath the normalized file path
 * @param explicit explicitly provided file type, if any
 * @returns the inferred or explicit file type, defaults to MAIN
 */
function inferFileType(filePath: NormalizedAbsolutePath, explicit?: FileType): FileType {
  if (explicit) return explicit;
  return filterPathAndGetFileType(filePath) ?? 'MAIN';
}

/**
 * Sanitizes a raw JS/TS analysis input into a complete, validated input.
 * - Normalizes all paths (filePath, tsConfigs)
 * - Reads file content if not provided
 * - Infers language from file extension if not provided
 * - Infers file type from path if not provided
 * - Sets defaults for all optional fields using JSTS_ANALYSIS_DEFAULTS
 *
 * @param raw the raw JS/TS analysis input from JSON deserialization
 * @param baseDir the base directory to resolve relative paths against
 * @returns a promise of the sanitized JS/TS analysis input with all fields required
 */
export async function sanitizeJsTsAnalysisInput(
  raw: RawJsTsAnalysisInput,
  baseDir: NormalizedAbsolutePath,
): Promise<JsTsAnalysisInput> {
  const filePath = normalizeToAbsolutePath(raw.filePath, baseDir);
  const fileContent = raw.fileContent ?? (await readFile(filePath));
  const language = inferLanguage(raw.language, filePath, fileContent);
  const fileType = inferFileType(filePath, raw.fileType);

  return {
    filePath,
    fileContent,
    sonarlint: raw.sonarlint ?? JSTS_ANALYSIS_DEFAULTS.sonarlint,
    fileType,
    fileStatus: raw.fileStatus ?? JSTS_ANALYSIS_DEFAULTS.fileStatus,
    language,
    analysisMode: raw.analysisMode ?? JSTS_ANALYSIS_DEFAULTS.analysisMode,
    ignoreHeaderComments: raw.ignoreHeaderComments ?? JSTS_ANALYSIS_DEFAULTS.ignoreHeaderComments,
    allowTsParserJsFiles: raw.allowTsParserJsFiles ?? JSTS_ANALYSIS_DEFAULTS.allowTsParserJsFiles,
    tsConfigs: sanitizePaths(raw.tsConfigs, baseDir),
    program: raw.program,
    skipAst: raw.skipAst ?? JSTS_ANALYSIS_DEFAULTS.skipAst,
    clearDependenciesCache:
      raw.clearDependenciesCache ?? JSTS_ANALYSIS_DEFAULTS.clearDependenciesCache,
  };
}
