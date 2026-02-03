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
import {
  isJsFile,
  isTsFile,
  setGlobalConfiguration,
  getBaseDir,
  type JsTsLanguage,
} from './configuration.js';
import { filterPathAndGetFileType } from './filter/filter-path.js';
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
 * Sanitizes a raw analysis input into a complete, validated input.
 * - Validates that input is an object with required fields
 * - Normalizes file path
 * - Reads file content if not provided
 * - Sets defaults for optional fields
 *
 * @param raw the raw analysis input from JSON deserialization
 * @param baseDir the base directory to resolve relative paths against
 * @returns a promise of the sanitized analysis input with all fields required
 */
export async function sanitizeAnalysisInput(
  raw: unknown,
  baseDir: NormalizedAbsolutePath,
): Promise<AnalysisInput> {
  if (!isObject(raw)) {
    throw new Error('Invalid analysis input: expected object');
  }

  if (!isString(raw.filePath)) {
    throw new Error('Invalid analysis input: filePath must be a string');
  }

  const filePath = normalizeToAbsolutePath(raw.filePath, baseDir);
  const fileContent = isString(raw.fileContent) ? raw.fileContent : await readFile(filePath);

  return {
    filePath,
    fileContent,
    sonarlint: isBoolean(raw.sonarlint) ? raw.sonarlint : JSTS_ANALYSIS_DEFAULTS.sonarlint,
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
 * - Validates that input is an object with required fields
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
  raw: unknown,
  baseDir: NormalizedAbsolutePath,
): Promise<JsTsAnalysisInput> {
  if (!isObject(raw)) {
    throw new Error('Invalid JS/TS analysis input: expected object');
  }

  if (!isString(raw.filePath)) {
    throw new Error('Invalid JS/TS analysis input: filePath must be a string');
  }

  const filePath = normalizeToAbsolutePath(raw.filePath, baseDir);
  const fileContent = isString(raw.fileContent) ? raw.fileContent : await readFile(filePath);

  // Validate and extract language if provided
  const rawLanguage = raw.language;
  const language = inferLanguage(
    rawLanguage === 'js' || rawLanguage === 'ts' ? rawLanguage : undefined,
    filePath,
    fileContent,
  );

  // Validate and extract fileType if provided
  const rawFileType = raw.fileType;
  const fileType = inferFileType(
    filePath,
    rawFileType === 'MAIN' || rawFileType === 'TEST' ? rawFileType : undefined,
  );

  const defaults = JSTS_ANALYSIS_DEFAULTS;

  return {
    filePath,
    fileContent,
    sonarlint: isBoolean(raw.sonarlint) ? raw.sonarlint : defaults.sonarlint,
    fileType,
    fileStatus: isFileStatus(raw.fileStatus) ? raw.fileStatus : defaults.fileStatus,
    language,
    analysisMode: isAnalysisMode(raw.analysisMode) ? raw.analysisMode : defaults.analysisMode,
    ignoreHeaderComments: isBoolean(raw.ignoreHeaderComments)
      ? raw.ignoreHeaderComments
      : defaults.ignoreHeaderComments,
    allowTsParserJsFiles: isBoolean(raw.allowTsParserJsFiles)
      ? raw.allowTsParserJsFiles
      : defaults.allowTsParserJsFiles,
    tsConfigs: sanitizePaths(isStringArray(raw.tsConfigs) ? raw.tsConfigs : undefined, baseDir),
    program: raw.program as JsTsAnalysisInput['program'],
    skipAst: isBoolean(raw.skipAst) ? raw.skipAst : defaults.skipAst,
    clearDependenciesCache: isBoolean(raw.clearDependenciesCache)
      ? raw.clearDependenciesCache
      : defaults.clearDependenciesCache,
  };
}

/**
 * Validates a single JSTS RuleConfig object.
 * RuleConfig has: key (string), configurations (any[]), fileTypeTargets (array),
 * language (string), analysisModes (array), blacklistedExtensions? (string[])
 */
export function isJsTsRuleConfig(value: unknown): boolean {
  if (!isObject(value)) return false;
  if (!isString(value.key)) return false;
  if (!Array.isArray(value.configurations)) return false;
  if (!Array.isArray(value.fileTypeTargets)) return false;
  if (!isString(value.language)) return false;
  if (!Array.isArray(value.analysisModes)) return false;
  // blacklistedExtensions is optional
  if (value.blacklistedExtensions !== undefined && !isStringArray(value.blacklistedExtensions))
    return false;
  return true;
}

/**
 * Validates an array of JSTS RuleConfig objects.
 */
export function isJsTsRuleConfigArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(isJsTsRuleConfig);
}

/**
 * Validates a single CSS RuleConfig object.
 * CssRuleConfig has: key (string), configurations (any[])
 */
export function isCssRuleConfig(value: unknown): boolean {
  if (!isObject(value)) return false;
  if (!isString(value.key)) return false;
  if (!Array.isArray(value.configurations)) return false;
  return true;
}

/**
 * Validates an array of CSS RuleConfig objects.
 */
export function isCssRuleConfigArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(isCssRuleConfig);
}

/**
 * Sanitizes JSTS rules array - returns empty array if invalid.
 */
export function sanitizeJsTsRules(rules: unknown): unknown[] {
  return isJsTsRuleConfigArray(rules) ? (rules as unknown[]) : [];
}

/**
 * Sanitizes CSS rules array - returns empty array if invalid.
 */
export function sanitizeCssRules(rules: unknown): unknown[] {
  return isCssRuleConfigArray(rules) ? (rules as unknown[]) : [];
}

/**
 * Sanitizes CSS analysis input.
 */
export async function sanitizeCssAnalysisInput(
  raw: unknown,
  baseDir: NormalizedAbsolutePath,
): Promise<CssAnalysisInput> {
  // First sanitize the base analysis input (filePath, fileContent, sonarlint)
  const baseInput = await sanitizeAnalysisInput(raw, baseDir);

  // Then validate and add CSS-specific fields
  const rawObj = raw as Record<string, unknown>;

  return {
    ...baseInput,
    rules: isCssRuleConfigArray(rawObj.rules) ? (rawObj.rules as CssRuleConfig[]) : [],
  };
}

/**
 * Sanitized input for Linter.initialize()
 */
export interface SanitizedInitLinterInput {
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
 * Sanitized input for project analysis (before file store processing).
 */
export interface SanitizedProjectAnalysisInput {
  rules: RuleConfig[];
  baseDir: NormalizedAbsolutePath;
  bundles: NormalizedAbsolutePath[];
  rulesWorkdir?: NormalizedAbsolutePath;
  rawFiles: unknown; // Files are sanitized by the file store
}

/**
 * Sanitizes project analysis request data.
 * Note: files are passed through to be sanitized by the file store.
 */
export function sanitizeProjectAnalysisInput(raw: unknown): SanitizedProjectAnalysisInput {
  if (!isObject(raw)) {
    throw new Error('Invalid project analysis input: expected object');
  }

  // Configuration is required and contains baseDir
  if (!isObject(raw.configuration)) {
    throw new Error('Invalid project analysis input: configuration is required');
  }

  // Set global configuration (validates baseDir internally)
  setGlobalConfiguration(raw.configuration);
  const baseDir = getBaseDir();

  return {
    rules: isJsTsRuleConfigArray(raw.rules) ? (raw.rules as RuleConfig[]) : [],
    baseDir,
    bundles: sanitizePaths(raw.bundles, baseDir),
    rulesWorkdir: isString(raw.rulesWorkdir)
      ? normalizeToAbsolutePath(raw.rulesWorkdir, baseDir)
      : undefined,
    rawFiles: raw.files, // Pass through for file store to sanitize
  };
}
