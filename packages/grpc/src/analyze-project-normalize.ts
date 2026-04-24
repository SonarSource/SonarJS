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

import {
  createConfigurationFromInput,
  type AnalysisMode as InternalAnalysisMode,
  type ConfigurationInput,
  type JsTsLanguage as InternalJsTsLanguage,
} from '../../analysis/src/common/configuration.js';
import {
  dependencyManifestStore,
  initFileStores,
  sourceFileStore,
  tsConfigStore,
} from '../../analysis/src/file-stores/index.js';
import {
  sanitizeInputFiles,
  type ProjectAnalysisFileInput as SanitizableProjectFileInput,
  type SanitizedProjectAnalysisInput,
} from '../../analysis/src/common/input-sanitize.js';
import type { FileType as InternalFileType } from '../../analysis/src/contracts/file.js';
import type { FileStatus as InternalFileStatus } from '../../analysis/src/jsts/analysis/analysis.js';
import type { RuleConfig as JsTsRuleConfig } from '../../analysis/src/jsts/linter/config/rule-config.js';
import type { RuleConfig as CssRuleConfig } from '../../analysis/src/css/linter/config.js';
import {
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../shared/src/helpers/files.js';
import { google, sonarjs } from './proto/analyze-project.js';

type AnalyzeProjectRequest = sonarjs.analyzeproject.v1.IAnalyzeProjectRequest;
type ProjectConfiguration = sonarjs.analyzeproject.v1.IProjectConfiguration;
type ProjectFileInput = sonarjs.analyzeproject.v1.IProjectFileInput;
type JsTsRule = sonarjs.analyzeproject.v1.IJsTsRule;
type CssRule = sonarjs.analyzeproject.v1.ICssRule;
type StringList = sonarjs.analyzeproject.v1.IStringList;
type ProtoValue = google.protobuf.IValue;

const { AnalysisMode, FileStatus, FileType, JsTsLanguage } = sonarjs.analyzeproject.v1;

export class InvalidAnalyzeProjectRequestError extends Error {}

export async function normalizeAnalyzeProjectRequest(
  request: AnalyzeProjectRequest,
): Promise<SanitizedProjectAnalysisInput> {
  const configuration = createConfigurationFromProto(request.configuration);
  const filesPresent = hasExplicitFiles(request.files, configuration.canAccessFileSystem);
  const sanitizedFiles = filesPresent
    ? await sanitizeInputFiles(normalizeProtoInputFiles(request.files), configuration)
    : undefined;
  const inputFiles = sanitizedFiles?.files;
  const rules = normalizeJsTsRules(request.rules);
  const cssRules = normalizeCssRules(request.cssRules);
  const bundles = normalizePathList(request.bundles, configuration.baseDir);
  const rulesWorkdir = normalizeOptionalPath(request.rulesWorkdir, configuration.baseDir);

  if (!filesPresent && configuration.canAccessFileSystem) {
    resetFileStoresForFileSystemDiscovery();
  }
  await initFileStores(configuration, inputFiles);

  return {
    rules,
    cssRules,
    baseDir: configuration.baseDir,
    bundles,
    rulesWorkdir,
    configuration,
    pathMap: sanitizedFiles?.pathMap ?? new Map(),
  };
}

function createConfigurationFromProto(configuration: ProjectConfiguration | null | undefined) {
  if (!configuration?.baseDir) {
    throw new InvalidAnalyzeProjectRequestError('configuration.base_dir is required');
  }

  const input: ConfigurationInput = {
    baseDir: configuration.baseDir,
    sonarlint: optionalBoolean(configuration.sonarlint),
    fsEvents: repeatedStringValues(configuration.fsEvents),
    allowTsParserJsFiles: optionalBoolean(configuration.allowTsParserJsFiles),
    analysisMode: normalizeAnalysisMode(configuration.analysisMode),
    skipAst: optionalBoolean(configuration.skipAst),
    ignoreHeaderComments: optionalBoolean(configuration.ignoreHeaderComments),
    maxFileSize: toOptionalNumber(configuration.maxFileSize, 'configuration.max_file_size'),
    environments: stringListValues(configuration.environments),
    globals: stringListValues(configuration.globals),
    tsSuffixes: stringListValues(configuration.tsSuffixes),
    jsSuffixes: stringListValues(configuration.jsSuffixes),
    cssSuffixes: stringListValues(configuration.cssSuffixes),
    htmlSuffixes: stringListValues(configuration.htmlSuffixes),
    yamlSuffixes: stringListValues(configuration.yamlSuffixes),
    cssAdditionalSuffixes: stringListValues(configuration.cssAdditionalSuffixes),
    tsConfigPaths: repeatedStringValues(configuration.tsConfigPaths),
    jsTsExclusions: stringListValues(configuration.jsTsExclusions),
    sources: repeatedStringValues(configuration.sources),
    inclusions: repeatedStringValues(configuration.inclusions),
    exclusions: repeatedStringValues(configuration.exclusions),
    tests: repeatedStringValues(configuration.tests),
    testInclusions: repeatedStringValues(configuration.testInclusions),
    testExclusions: repeatedStringValues(configuration.testExclusions),
    detectBundles: optionalBoolean(configuration.detectBundles),
    canAccessFileSystem: optionalBoolean(configuration.canAccessFileSystem),
    createTSProgramForOrphanFiles: optionalBoolean(configuration.createTsProgramForOrphanFiles),
    disableTypeChecking: optionalBoolean(configuration.disableTypeChecking),
    skipNodeModuleLookupOutsideBaseDir: optionalBoolean(
      configuration.skipNodeModuleLookupOutsideBaseDir,
    ),
    ecmaScriptVersion: optionalString(configuration.ecmaScriptVersion),
    clearDependenciesCache: optionalBoolean(configuration.clearDependenciesCache),
    clearTsConfigCache: optionalBoolean(configuration.clearTsConfigCache),
    reportNclocForTestFiles: optionalBoolean(configuration.reportNclocForTestFiles),
  };

  try {
    return createConfigurationFromInput(input);
  } catch (error) {
    if (error instanceof Error) {
      throw new InvalidAnalyzeProjectRequestError(error.message);
    }
    throw error;
  }
}

function normalizeProtoInputFiles(
  files: Record<string, ProjectFileInput> | null | undefined,
): Record<string, SanitizableProjectFileInput> {
  const normalizedFiles: Record<string, SanitizableProjectFileInput> = {};

  for (const [filePathKey, fileInput] of Object.entries(files ?? {})) {
    if (!filePathKey) {
      throw new InvalidAnalyzeProjectRequestError('files contains an empty file path');
    }

    normalizedFiles[filePathKey] = {
      filePath: filePathKey,
      fileContent: optionalString(fileInput?.fileContent),
      fileType: normalizeFileType(fileInput?.fileType),
      fileStatus: normalizeFileStatus(fileInput?.fileStatus),
    };
  }

  return normalizedFiles;
}

function normalizeJsTsRules(rules: JsTsRule[] | null | undefined): JsTsRuleConfig[] {
  return (rules ?? []).map((rule, index) => {
    if (!rule?.key) {
      throw new InvalidAnalyzeProjectRequestError(`rules[${index}].key is required`);
    }

    const language = normalizeJsTsLanguage(rule.language);
    if (!language) {
      throw new InvalidAnalyzeProjectRequestError(`rules[${index}].language is required`);
    }

    return {
      key: rule.key,
      configurations: (rule.configurations ?? []).map(valueFromProto),
      fileTypeTargets: (rule.fileTypeTargets ?? []).map((fileType, fileTypeIndex) =>
        normalizeRequiredFileType(fileType, `rules[${index}].file_type_targets[${fileTypeIndex}]`),
      ),
      language,
      analysisModes: (rule.analysisModes ?? []).map((analysisMode, analysisModeIndex) =>
        normalizeRequiredAnalysisMode(
          analysisMode,
          `rules[${index}].analysis_modes[${analysisModeIndex}]`,
        ),
      ),
      blacklistedExtensions: [...(rule.blacklistedExtensions ?? [])],
    };
  });
}

function normalizeCssRules(rules: CssRule[] | null | undefined): CssRuleConfig[] {
  return (rules ?? []).map((rule, index) => {
    if (!rule?.key) {
      throw new InvalidAnalyzeProjectRequestError(`css_rules[${index}].key is required`);
    }

    return {
      key: rule.key,
      configurations: (rule.configurations ?? []).map(valueFromProto),
    };
  });
}

function valueFromProto(value: ProtoValue | null | undefined): unknown {
  if (value == null) {
    return null;
  }
  if (value.nullValue != null) {
    return null;
  }
  if (value.numberValue != null) {
    return value.numberValue;
  }
  if (value.stringValue != null) {
    return value.stringValue;
  }
  if (value.boolValue != null) {
    return value.boolValue;
  }
  if (value.structValue != null) {
    return Object.fromEntries(
      Object.entries(value.structValue.fields ?? {}).map(([key, fieldValue]) => [
        key,
        valueFromProto(fieldValue),
      ]),
    );
  }
  if (value.listValue != null) {
    return (value.listValue.values ?? []).map(valueFromProto);
  }
  return null;
}

function normalizePathList(
  paths: string[] | null | undefined,
  baseDir: NormalizedAbsolutePath,
): NormalizedAbsolutePath[] {
  return (paths ?? []).map(path => normalizeToAbsolutePath(path, baseDir));
}

function normalizeOptionalPath(
  path: string | null | undefined,
  baseDir: NormalizedAbsolutePath,
): NormalizedAbsolutePath | undefined {
  if (path == null) {
    return undefined;
  }
  return normalizeToAbsolutePath(path, baseDir);
}

function normalizeAnalysisMode(
  analysisMode: sonarjs.analyzeproject.v1.AnalysisMode | null | undefined,
): InternalAnalysisMode | undefined {
  switch (analysisMode) {
    case undefined:
    case null:
    case AnalysisMode.ANALYSIS_MODE_UNSPECIFIED:
      return undefined;
    case AnalysisMode.ANALYSIS_MODE_DEFAULT:
      return 'DEFAULT';
    case AnalysisMode.ANALYSIS_MODE_SKIP_UNCHANGED:
      return 'SKIP_UNCHANGED';
    default:
      throw new InvalidAnalyzeProjectRequestError(`Invalid analysis mode: ${analysisMode}`);
  }
}

function normalizeRequiredAnalysisMode(
  analysisMode: sonarjs.analyzeproject.v1.AnalysisMode | null | undefined,
  path: string,
): InternalAnalysisMode {
  const normalized = normalizeAnalysisMode(analysisMode);
  if (!normalized) {
    throw new InvalidAnalyzeProjectRequestError(`${path} must not be unspecified`);
  }
  return normalized;
}

function normalizeFileType(
  fileType: sonarjs.analyzeproject.v1.FileType | null | undefined,
): InternalFileType | undefined {
  switch (fileType) {
    case undefined:
    case null:
    case FileType.FILE_TYPE_UNSPECIFIED:
      return undefined;
    case FileType.FILE_TYPE_MAIN:
      return 'MAIN';
    case FileType.FILE_TYPE_TEST:
      return 'TEST';
    default:
      throw new InvalidAnalyzeProjectRequestError(`Invalid file type: ${fileType}`);
  }
}

function normalizeRequiredFileType(
  fileType: sonarjs.analyzeproject.v1.FileType | null | undefined,
  path: string,
): InternalFileType {
  const normalized = normalizeFileType(fileType);
  if (!normalized) {
    throw new InvalidAnalyzeProjectRequestError(`${path} must not be unspecified`);
  }
  return normalized;
}

function normalizeFileStatus(
  fileStatus: sonarjs.analyzeproject.v1.FileStatus | null | undefined,
): InternalFileStatus | undefined {
  switch (fileStatus) {
    case undefined:
    case null:
    case FileStatus.FILE_STATUS_UNSPECIFIED:
      return undefined;
    case FileStatus.FILE_STATUS_SAME:
      return 'SAME';
    case FileStatus.FILE_STATUS_CHANGED:
      return 'CHANGED';
    case FileStatus.FILE_STATUS_ADDED:
      return 'ADDED';
    default:
      throw new InvalidAnalyzeProjectRequestError(`Invalid file status: ${fileStatus}`);
  }
}

function normalizeJsTsLanguage(
  language: sonarjs.analyzeproject.v1.JsTsLanguage | null | undefined,
): InternalJsTsLanguage | undefined {
  switch (language) {
    case undefined:
    case null:
    case JsTsLanguage.JS_TS_LANGUAGE_UNSPECIFIED:
      return undefined;
    case JsTsLanguage.JS_TS_LANGUAGE_JS:
      return 'js';
    case JsTsLanguage.JS_TS_LANGUAGE_TS:
      return 'ts';
    default:
      throw new InvalidAnalyzeProjectRequestError(`Invalid JS/TS language: ${language}`);
  }
}

function repeatedStringValues(values: string[] | null | undefined): string[] | undefined {
  if (values == null) {
    return undefined;
  }
  return [...values];
}

// Wrapped StringList fields preserve presence for defaulted settings. Plain repeated string fields
// are used where omitted and empty are equivalent after request normalization.
function stringListValues(list: StringList | null | undefined): string[] | undefined {
  if (list == null) {
    return undefined;
  }
  return [...(list.values ?? [])];
}

function optionalBoolean(value: boolean | null | undefined): boolean | undefined {
  return value ?? undefined;
}

function optionalString(value: string | null | undefined): string | undefined {
  return value ?? undefined;
}

// protobufjs decodes int64 values as Long-like objects with helpers such as toNumber(). After a
// worker structured-clone hop those helpers are stripped and only the raw low/high/unsigned shape remains.
type StructuredCloneLongLike = {
  high: number;
  low: number;
  unsigned: boolean;
};

function toOptionalNumber(value: unknown, path: string): number | undefined {
  if (value == null) {
    return undefined;
  }

  let numberValue: number;
  if (typeof value === 'number') {
    numberValue = value;
  } else if (isLongLike(value)) {
    numberValue = value.toNumber();
  } else if (isStructuredCloneLongLike(value)) {
    numberValue = toNumberFromStructuredCloneLong(value);
  } else {
    numberValue = Number(value);
  }
  if (!Number.isFinite(numberValue) || !Number.isSafeInteger(numberValue)) {
    throw new InvalidAnalyzeProjectRequestError(`${path} must be a safe integer`);
  }
  return numberValue;
}

function isLongLike(value: unknown): value is { toNumber: () => number } {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function'
  );
}

function isStructuredCloneLongLike(value: unknown): value is StructuredCloneLongLike {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof (value as StructuredCloneLongLike).low === 'number' &&
    typeof (value as StructuredCloneLongLike).high === 'number' &&
    typeof (value as StructuredCloneLongLike).unsigned === 'boolean'
  );
}

function toNumberFromStructuredCloneLong(value: StructuredCloneLongLike) {
  const low = value.low >>> 0;
  const high = value.unsigned ? value.high >>> 0 : Math.trunc(value.high);
  return high * 0x100000000 + low;
}

function hasExplicitFiles(
  files: Record<string, ProjectFileInput> | null | undefined,
  canAccessFileSystem: boolean,
) {
  if (files == null) {
    return false;
  }

  // protobufjs 8 decodes omitted map fields as own empty objects, so with filesystem
  // access enabled the closest production behavior to "files omitted" is an empty map.
  return Object.keys(files).length > 0 || !canAccessFileSystem;
}

function resetFileStoresForFileSystemDiscovery() {
  sourceFileStore.clearCache();
  dependencyManifestStore.clearCache();
  tsConfigStore.clearCache();
}
