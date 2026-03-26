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
import { warn } from '../../../shared/src/helpers/logging.js';
import {
  type NormalizedAbsolutePath,
  normalizeToAbsolutePath,
  readFile,
} from '../../../shared/src/helpers/files.js';
import type { FileType } from '../contracts/file.js';
import {
  createConfiguration,
  type Configuration,
  getFilterPathParams,
  getShouldIgnoreParams,
} from './configuration.js';
import { filterPathAndGetFileType } from './filter/filter-path.js';
import { shouldIgnoreFile } from './filter/filter.js';
import {
  isObject,
  isString,
  isStringArray,
  sanitizePaths,
} from '../../../shared/src/helpers/sanitize.js';
import { initFileStores } from '../file-stores/index.js';
import { type FileStatus, JSTS_ANALYSIS_DEFAULTS } from '../../jsts/src/analysis/analysis.js';
import type { RuleConfig as CssRuleConfig } from '../../css/src/linter/config.js';
import type { RuleConfig } from '../../jsts/src/linter/config/rule-config.js';
import { type AnalyzableFiles, createAnalyzableFiles } from '../projectAnalysis.js';

function isFileStatus(value: unknown): value is FileStatus {
  return value === 'SAME' || value === 'CHANGED' || value === 'ADDED';
}

function isFileType(value: unknown): value is FileType {
  return value === 'MAIN' || value === 'TEST';
}

/**
 * Validates a single JSTS RuleConfig object.
 */
function isJsTsRuleConfig(value: unknown): boolean {
  return (
    isObject(value) &&
    isString(value.key) &&
    Array.isArray(value.configurations) &&
    Array.isArray(value.fileTypeTargets) &&
    isString(value.language) &&
    Array.isArray(value.analysisModes) &&
    (value.blacklistedExtensions === undefined || isStringArray(value.blacklistedExtensions))
  );
}

function isJsTsRuleConfigArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(isJsTsRuleConfig);
}

function isCssRuleConfig(value: unknown): boolean {
  return isObject(value) && isString(value.key) && Array.isArray(value.configurations);
}

function isCssRuleConfigArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(isCssRuleConfig);
}

interface SanitizedProjectAnalysisInput {
  rules: RuleConfig[];
  cssRules: CssRuleConfig[];
  baseDir: NormalizedAbsolutePath;
  bundles: NormalizedAbsolutePath[];
  rulesWorkdir?: NormalizedAbsolutePath;
  configuration: Configuration;
}

export async function sanitizeProjectAnalysisInput(
  raw: unknown,
): Promise<SanitizedProjectAnalysisInput> {
  if (!isObject(raw)) {
    throw new Error('Invalid project analysis input: expected object');
  }
  if (!isObject(raw.configuration)) {
    throw new Error('Invalid project analysis input: configuration is required');
  }

  const configuration = createConfiguration(raw.configuration);
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
    configuration,
  };
}

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
    if (!isObject(rawFile) || !isString(rawFile.filePath)) {
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
