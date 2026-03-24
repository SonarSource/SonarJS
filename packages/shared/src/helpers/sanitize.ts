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
import { warn } from './logging.js';
import {
  type FileType,
  type NormalizedAbsolutePath,
  normalizeToAbsolutePath,
  readFile,
} from './files.js';
import {
  isJsFile,
  isTsFile,
  createConfiguration,
  type JsTsLanguage,
  type Configuration,
  getFilterPathParams,
  getShouldIgnoreParams,
} from './configuration.js';
import { filterPathAndGetFileType } from './filter/filter-path.js';
import { initFileStores } from '../../../jsts/src/analysis/projectAnalysis/file-stores/index.js';

import {
  type FileStatus,
  type AnalysisMode,
  JSTS_ANALYSIS_DEFAULTS,
} from '../../../jsts/src/analysis/analysis.js';
import type { RuleConfig as CssRuleConfig } from '../../../css/src/linter/config.js';
import type { RuleConfig } from '../../../jsts/src/linter/config/rule-config.js';
import {
  type AnalyzableFiles,
  createAnalyzableFiles,
} from '../../../jsts/src/analysis/projectAnalysis/projectAnalysis.js';
import { shouldIgnoreFile } from './filter/filter.js';

// Type guards for runtime validation of JSON-deserialized values
// These ensure values from untrusted sources (JSON, protobuf) match expected types

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFileStatus(value: unknown): value is FileStatus {
  return value === 'SAME' || value === 'CHANGED' || value === 'ADDED';
}

/**
 * Type guard to validate FileType values.
 */
function isFileType(value: unknown): value is FileType {
  return value === 'MAIN' || value === 'TEST';
}

export function isAnalysisMode(value: unknown): value is AnalysisMode {
  return value === 'DEFAULT' || value === 'SKIP_UNCHANGED';
}

/**
 * Sanitizes an array of paths to normalized absolute paths.
 * @param paths the raw paths to sanitize (accepts unknown for runtime validation)
 * @param baseDir the base directory to resolve relative paths against
 * @returns an array of normalized absolute paths
 */
export function sanitizePaths(
  paths: unknown,
  baseDir: NormalizedAbsolutePath,
): NormalizedAbsolutePath[] {
  if (!isStringArray(paths)) {
    return [];
  }
  return paths.map(p => normalizeToAbsolutePath(p, baseDir));
}

/**
 * Infers the language (js or ts) from the file path and content.
 * @param explicit explicitly provided language, if any
 * @param filePath the normalized file path
 * @param fileContent the file content (needed for Vue files to detect TS)
 * @param jsSuffixes configured JS file suffixes
 * @param tsSuffixes configured TS file suffixes
 * @returns the inferred or explicit language
 * @throws Error if language cannot be inferred
 */
export function inferLanguage(
  explicit: JsTsLanguage | undefined,
  filePath: NormalizedAbsolutePath,
  fileContent: string,
  jsSuffixes?: string[],
  tsSuffixes?: string[],
): JsTsLanguage {
  if (explicit) {
    return explicit;
  }
  if (isTsFile(filePath, fileContent, tsSuffixes)) {
    return 'ts';
  }
  if (isJsFile(filePath, jsSuffixes)) {
    return 'js';
  }
  throw new Error(`Unable to infer language for file ${filePath}`);
}

/**
 * Validates a single JSTS RuleConfig object.
 * RuleConfig has: key (string), configurations (any[]), fileTypeTargets (array),
 * language (string), analysisModes (array), blacklistedExtensions? (string[])
 */
function isJsTsRuleConfig(value: unknown): boolean {
  return (
    isObject(value) &&
    isString(value.key) &&
    Array.isArray(value.configurations) &&
    Array.isArray(value.fileTypeTargets) &&
    isString(value.language) &&
    Array.isArray(value.analysisModes) &&
    // blacklistedExtensions is optional
    (value.blacklistedExtensions === undefined || isStringArray(value.blacklistedExtensions))
  );
}

/**
 * Validates an array of JSTS RuleConfig objects.
 */
function isJsTsRuleConfigArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(isJsTsRuleConfig);
}

/**
 * Validates a single CSS RuleConfig object.
 * CssRuleConfig has: key (string), configurations (any[])
 */
function isCssRuleConfig(value: unknown): boolean {
  return isObject(value) && isString(value.key) && Array.isArray(value.configurations);
}

/**
 * Validates an array of CSS RuleConfig objects.
 */
function isCssRuleConfigArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(isCssRuleConfig);
}

/**
 * Sanitized input for project analysis.
 */
interface SanitizedProjectAnalysisInput {
  rules: RuleConfig[];
  cssRules: CssRuleConfig[];
  baseDir: NormalizedAbsolutePath;
  bundles: NormalizedAbsolutePath[];
  rulesWorkdir?: NormalizedAbsolutePath;
  configuration: Configuration; // Ready-to-use Configuration instance
}

/**
 * Sanitizes project analysis request data and initializes file stores.
 *
 * Returns a ready-to-use Configuration instance. The configuration is fully
 * validated and normalized. File stores are initialized with the provided
 * input files or by scanning the file system.
 */
export async function sanitizeProjectAnalysisInput(
  raw: unknown,
): Promise<SanitizedProjectAnalysisInput> {
  if (!isObject(raw)) {
    throw new Error('Invalid project analysis input: expected object');
  }

  // Configuration is required and contains baseDir
  if (!isObject(raw.configuration)) {
    throw new Error('Invalid project analysis input: configuration is required');
  }

  // Create a fully validated Configuration instance
  const configuration = createConfiguration(raw.configuration);

  // Sanitize raw input files first (if provided), then initialize file stores
  const inputFiles = isObject(raw.files)
    ? (await sanitizeRawInputFiles(raw.files, configuration)).files
    : undefined;

  await initFileStores(configuration, inputFiles);

  return {
    rules: isJsTsRuleConfigArray(raw.rules) ? (raw.rules as RuleConfig[]) : [],
    cssRules: isCssRuleConfigArray(raw.cssRules) ? (raw.cssRules as CssRuleConfig[]) : [],
    baseDir: configuration.baseDir,
    bundles: sanitizePaths(raw.bundles, configuration.baseDir),
    rulesWorkdir: isString(raw.rulesWorkdir)
      ? normalizeToAbsolutePath(raw.rulesWorkdir, configuration.baseDir)
      : undefined,
    configuration, // Ready-to-use Configuration instance
  };
}

/**
 * Sanitizes raw input files and filters them before returning.
 * This handles the conversion from raw input (HTTP/gRPC) to AnalyzableFiles,
 * applying path normalization, default values, and file filtering in one pass.
 *
 * Files with invalid structure (missing or non-string filePath) are skipped with a warning.
 *
 * @param rawFiles - The raw input files from the request (Record<string, unknown>)
 * @param configuration - The project configuration for path normalization and filtering
 * @returns A promise of sanitized AnalyzableFiles ready to use
 */
type SanitizedInputFiles = {
  files: AnalyzableFiles;
  pathMap: Map<string, string>;
};

export async function sanitizeRawInputFiles(
  rawFiles: Record<string, unknown> | undefined,
  configuration: Configuration,
): Promise<SanitizedInputFiles> {
  const { baseDir } = configuration;
  const files = createAnalyzableFiles();
  const pathMap = new Map<string, string>();

  if (!rawFiles) {
    return { files, pathMap };
  }

  for (const [key, rawFile] of Object.entries(rawFiles)) {
    // Validate the raw file structure - must be an object with filePath string
    if (!isObject(rawFile) || !isString(rawFile.filePath)) {
      // Skip invalid entries - they're missing required filePath
      warn(`Skipping invalid file entry '${key}': missing or invalid filePath`);
      continue;
    }
    const filePath = normalizeToAbsolutePath(rawFile.filePath, baseDir);

    const fileContent = isString(rawFile.fileContent)
      ? rawFile.fileContent
      : await readFile(filePath);
    const rawFileType = isFileType(rawFile.fileType)
      ? rawFile.fileType
      : filterPathAndGetFileType(filePath, getFilterPathParams(configuration));
    const rawFileStatus = isFileStatus(rawFile.fileStatus) ? rawFile.fileStatus : undefined;

    // Apply filters to files from the request
    if (await shouldIgnoreFile({ filePath, fileContent }, getShouldIgnoreParams(configuration))) {
      continue;
    }

    files[filePath] = {
      filePath,
      fileContent,
      fileType: rawFileType ?? JSTS_ANALYSIS_DEFAULTS.fileType,
      fileStatus: rawFileStatus ?? JSTS_ANALYSIS_DEFAULTS.fileStatus,
    };
    pathMap.set(filePath, key);
  }

  return { files, pathMap };
}
