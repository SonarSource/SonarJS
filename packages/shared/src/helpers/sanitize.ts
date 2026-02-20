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
  dirnamePath,
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

import type { AnalysisInput } from '../types/analysis.js';
import {
  type JsTsAnalysisInput,
  type FileStatus,
  type AnalysisMode,
  JSTS_ANALYSIS_DEFAULTS,
} from '../../../jsts/src/analysis/analysis.js';
import type { CssAnalysisInput } from '../../../css/src/analysis/analysis.js';
import type { RuleConfig as CssRuleConfig } from '../../../css/src/linter/config.js';
import type { RuleConfig } from '../../../jsts/src/linter/config/rule-config.js';
import {
  type JsTsFiles,
  createJsTsFiles,
} from '../../../jsts/src/analysis/projectAnalysis/projectAnalysis.js';
import { shouldIgnoreFile, type ShouldIgnoreFileParams } from './filter/filter.js';

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
 * Sanitized single-file analysis input containing the normalized file path and configuration.
 */
interface SanitizedSingleFileInput {
  filePath: NormalizedAbsolutePath;
  configuration: Configuration;
}

/**
 * Sanitizes and validates a single-file analysis request.
 * - Validates that data is an object with a filePath string
 * - Creates configuration from data.configuration if provided, otherwise derives from filePath
 * - Normalizes the file path relative to the configuration's baseDir
 *
 * @param data the raw request data
 * @returns the sanitized file path and configuration
 */
function sanitizeSingleFileAnalysisInput(data: unknown): SanitizedSingleFileInput {
  if (!isObject(data)) {
    throw new Error('Invalid request data: expected object');
  }
  if (!isString(data.filePath)) {
    throw new Error('Invalid request data: filePath must be a string');
  }

  const configuration = data.configuration
    ? createConfiguration(data.configuration)
    : createConfiguration({ baseDir: dirnamePath(normalizeToAbsolutePath(data.filePath)) });

  const filePath = normalizeToAbsolutePath(data.filePath, configuration.baseDir);

  return { filePath, configuration };
}

/**
 * Sanitized analysis input with configuration.
 */
interface SanitizedAnalysisInput {
  input: AnalysisInput;
  configuration: Configuration;
}

/**
 * Sanitizes a raw analysis input into a complete, validated input.
 * - Validates that input is an object with required fields
 * - Normalizes file path
 * - Reads file content if not provided
 * - Sets defaults for optional fields
 *
 * @param raw the raw analysis input from JSON deserialization
 * @returns a promise of the sanitized analysis input with configuration
 */
export async function sanitizeAnalysisInput(raw: unknown): Promise<SanitizedAnalysisInput> {
  const { filePath, configuration } = sanitizeSingleFileAnalysisInput(raw);
  const rawObj = raw as Record<string, unknown>;

  const fileContent = isString(rawObj.fileContent) ? rawObj.fileContent : await readFile(filePath);

  return {
    input: {
      filePath,
      fileContent,
      sonarlint: isBoolean(rawObj.sonarlint) ? rawObj.sonarlint : JSTS_ANALYSIS_DEFAULTS.sonarlint,
    },
    configuration,
  };
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
 * Infers the file type (MAIN or TEST) from the file path.
 * Uses the filter path logic to determine if a file is a test file.
 * @param filePath the normalized file path
 * @param configuration the configuration containing path filtering parameters
 * @param explicit explicitly provided file type, if any
 * @returns the inferred or explicit file type, defaults to MAIN
 */
function inferFileType(
  filePath: NormalizedAbsolutePath,
  configuration: Configuration,
  explicit?: FileType,
): FileType {
  if (explicit) {
    return explicit;
  }
  return (
    filterPathAndGetFileType(filePath, {
      sourcesPaths: configuration.sources.length ? configuration.sources : [configuration.baseDir],
      testPaths: configuration.tests,
      inclusions: configuration.inclusions,
      exclusions: configuration.exclusions,
      testInclusions: configuration.testInclusions,
      testExclusions: configuration.testExclusions,
    }) ?? 'MAIN'
  );
}

/**
 * Sanitized JS/TS analysis input with configuration.
 */
interface SanitizedJsTsAnalysisInput {
  input: JsTsAnalysisInput;
  configuration: Configuration;
}

/**
 * Sanitizes a raw JS/TS analysis input into a complete, validated input.
 * - Validates that input is an object with required fields
 * - Normalizes all paths (filePath, tsConfigs)
 * - Reads file content if not provided
 * - Infers language from file extension if not provided
 * - Infers file type from path if not provided
 * - Sets defaults for all optional fields using JSTS_ANALYSIS_DEFAULTS
 *
 * @param raw the raw JS/TS analysis input from JSON deserialization
 * @returns a promise of the sanitized JS/TS analysis input with configuration
 */
export async function sanitizeJsTsAnalysisInput(raw: unknown): Promise<SanitizedJsTsAnalysisInput> {
  const { filePath, configuration } = sanitizeSingleFileAnalysisInput(raw);
  const rawObj = raw as Record<string, unknown>;

  const fileContent = isString(rawObj.fileContent) ? rawObj.fileContent : await readFile(filePath);

  // Validate and extract language if provided
  const rawLanguage = rawObj.language;
  const language = inferLanguage(
    rawLanguage === 'js' || rawLanguage === 'ts' ? rawLanguage : undefined,
    filePath,
    fileContent,
    configuration.jsSuffixes,
    configuration.tsSuffixes,
  );

  // Validate and extract fileType if provided
  const rawFileType = rawObj.fileType;
  const fileType = inferFileType(
    filePath,
    configuration,
    rawFileType === 'MAIN' || rawFileType === 'TEST' ? rawFileType : undefined,
  );

  const defaults = JSTS_ANALYSIS_DEFAULTS;

  return {
    input: {
      filePath,
      fileContent,
      sonarlint: isBoolean(rawObj.sonarlint) ? rawObj.sonarlint : defaults.sonarlint,
      fileType,
      fileStatus: isFileStatus(rawObj.fileStatus) ? rawObj.fileStatus : defaults.fileStatus,
      language,
      analysisMode: isAnalysisMode(rawObj.analysisMode)
        ? rawObj.analysisMode
        : defaults.analysisMode,
      ignoreHeaderComments: isBoolean(rawObj.ignoreHeaderComments)
        ? rawObj.ignoreHeaderComments
        : defaults.ignoreHeaderComments,
      allowTsParserJsFiles: isBoolean(rawObj.allowTsParserJsFiles)
        ? rawObj.allowTsParserJsFiles
        : defaults.allowTsParserJsFiles,
      tsConfigs: sanitizePaths(
        isStringArray(rawObj.tsConfigs) ? rawObj.tsConfigs : undefined,
        configuration.baseDir,
      ),
      program: rawObj.program as JsTsAnalysisInput['program'],
      skipAst: isBoolean(rawObj.skipAst) ? rawObj.skipAst : defaults.skipAst,
      clearDependenciesCache: isBoolean(rawObj.clearDependenciesCache)
        ? rawObj.clearDependenciesCache
        : defaults.clearDependenciesCache,
      reportNclocForTestFiles: defaults.reportNclocForTestFiles,
    },
    configuration,
  };
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
 * Sanitized CSS analysis input with configuration.
 */
interface SanitizedCssAnalysisInput {
  input: CssAnalysisInput;
  configuration: Configuration;
}

/**
 * Sanitizes CSS analysis input.
 */
export async function sanitizeCssAnalysisInput(raw: unknown): Promise<SanitizedCssAnalysisInput> {
  const { input: baseInput, configuration } = await sanitizeAnalysisInput(raw);
  const rawObj = raw as Record<string, unknown>;

  return {
    input: {
      ...baseInput,
      rules: isCssRuleConfigArray(rawObj.rules) ? (rawObj.rules as CssRuleConfig[]) : [],
    },
    configuration,
  };
}

/**
 * Sanitized input for Linter.initialize()
 */
interface SanitizedInitLinterInput {
  rules: RuleConfig[];
  environments: string[];
  globals: string[];
  baseDir: NormalizedAbsolutePath;
  sonarlint: boolean;
  bundles: NormalizedAbsolutePath[];
  rulesWorkdir?: NormalizedAbsolutePath;
}

/**
 * Sanitizes the init-linter request data.
 */
export function sanitizeInitLinterInput(raw: unknown): SanitizedInitLinterInput {
  if (!isObject(raw)) {
    throw new Error('Invalid init-linter input: expected object');
  }

  // baseDir is required
  if (!isString(raw.baseDir)) {
    throw new Error('Invalid init-linter input: baseDir must be a string');
  }
  const baseDir = normalizeToAbsolutePath(raw.baseDir);

  return {
    rules: isJsTsRuleConfigArray(raw.rules) ? (raw.rules as RuleConfig[]) : [],
    environments: isStringArray(raw.environments) ? raw.environments : [],
    globals: isStringArray(raw.globals) ? raw.globals : [],
    baseDir,
    sonarlint: isBoolean(raw.sonarlint) ? raw.sonarlint : false,
    bundles: sanitizePaths(raw.bundles, baseDir),
    rulesWorkdir: isString(raw.rulesWorkdir)
      ? normalizeToAbsolutePath(raw.rulesWorkdir, baseDir)
      : undefined,
  };
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
    ? await sanitizeRawInputFiles(raw.files, configuration)
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
 * This handles the conversion from raw input (HTTP/gRPC) to JsTsFiles,
 * applying path normalization, default values, and file filtering in one pass.
 *
 * Files with invalid structure (missing or non-string filePath) are skipped with a warning.
 *
 * @param rawFiles - The raw input files from the request (Record<string, unknown>)
 * @param configuration - The project configuration for path normalization and filtering
 * @returns A promise of sanitized JsTsFiles ready to use
 */
export async function sanitizeRawInputFiles(
  rawFiles: Record<string, unknown> | undefined,
  configuration: Configuration,
): Promise<JsTsFiles> {
  const { baseDir } = configuration;
  const shouldIgnoreParams: ShouldIgnoreFileParams = getShouldIgnoreParams(configuration);
  const files = createJsTsFiles();

  if (!rawFiles) {
    return files;
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
    if (await shouldIgnoreFile({ filePath, fileContent }, shouldIgnoreParams)) {
      continue;
    }

    files[filePath] = {
      filePath,
      fileContent,
      fileType: rawFileType ?? JSTS_ANALYSIS_DEFAULTS.fileType,
      fileStatus: rawFileStatus ?? JSTS_ANALYSIS_DEFAULTS.fileStatus,
    };
  }

  return files;
}
