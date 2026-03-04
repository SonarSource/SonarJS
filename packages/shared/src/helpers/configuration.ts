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
import { JSTS_ANALYSIS_DEFAULTS, type AnalysisMode } from '../../../jsts/src/analysis/analysis.js';
import { extname } from 'node:path/posix';
import { type NormalizedAbsolutePath, isAbsolutePath, normalizeToAbsolutePath } from './files.js';
import { Minimatch } from 'minimatch';
import {
  sanitizePaths,
  isBoolean,
  isNumber,
  isString,
  isStringArray,
  isAnalysisMode,
  isObject,
} from './sanitize.js';
import { type ShouldIgnoreFileParams } from './filter/filter.js';
import { type FilterPathParams } from './filter/filter-path.js';

/**
 * A discriminator between JavaScript and TypeScript languages. This is used
 * in rule configuration and analysis input.
 *
 * Analyzing JavaScript and TypeScript code is rather transparent and
 * indistinguishable since we use ESLint-based APIs not only to parse
 * but also to analyze source code. However, there are minor parsing
 * details that require a clear distinction between the two.
 */
export type JsTsLanguage = 'js' | 'ts';

/**
 * Sanitized configuration after validation and normalization.
 * Path fields use branded types (NormalizedAbsolutePath), and glob patterns are compiled to Minimatch instances.
 *
 * Comments indicate the corresponding sonar.* property name where applicable.
 */
export type Configuration = {
  baseDir: NormalizedAbsolutePath;
  canAccessFileSystem: boolean;
  sonarlint: boolean;
  clearDependenciesCache: boolean;
  clearTsConfigCache: boolean;
  fsEvents: NormalizedAbsolutePath[] /* Data filled in file watcher FSListenerImpl.java */;
  allowTsParserJsFiles: boolean;
  analysisMode: AnalysisMode;
  skipAst: boolean;
  ignoreHeaderComments: boolean /* sonar.javascript.ignoreHeaderComments - True to not count file header comments in comment metrics */;
  maxFileSize: number /* sonar.javascript.maxFileSize - Threshold for the maximum size of analyzed files (in kilobytes) */;
  environments: string[] /* sonar.javascript.environments */;
  globals: string[] /* sonar.javascript.globals */;
  tsSuffixes: string[] /* sonar.typescript.file.suffixes */;
  jsSuffixes: string[] /* sonar.javascript.file.suffixes */;
  cssSuffixes: string[] /* sonar.css.file.suffixes */;
  tsConfigPaths: NormalizedAbsolutePath[] /* sonar.typescript.tsconfigPath(s) */;
  jsTsExclusions: Minimatch[] /* sonar.typescript.exclusions and sonar.javascript.exclusions wildcards */;
  sources: NormalizedAbsolutePath[] /* sonar.sources - absolute or relative path to baseDir to look for files */;
  inclusions: Minimatch[] /* sonar.inclusions - WILDCARD to narrow down sonar.sources */;
  exclusions: Minimatch[] /* sonar.exclusions - WILDCARD to narrow down sonar.sources */;
  tests: NormalizedAbsolutePath[] /* sonar.tests - absolute or relative path to baseDir to look for test files */;
  testInclusions: Minimatch[] /* sonar.test.inclusions - WILDCARD to narrow down sonar.tests */;
  testExclusions: Minimatch[] /* sonar.test.exclusions - WILDCARD to narrow down sonar.tests */;
  detectBundles: boolean /* sonar.javascript.detectBundles - whether files looking like bundled code should be ignored */;
  createTSProgramForOrphanFiles: boolean /* sonar.javascript.createTSProgramForOrphanFiles - whether to create a TS program for orphan files */;
  disableTypeChecking: boolean /* sonar.javascript.disableTypeChecking - whether to completely disable TypeScript type checking */;
  reportNclocForTestFiles: boolean /* In gRPC/A3S context, ncloc for test files is computed by the analyzer. In SQ context, ncloc is not computed for tests. */;
};

// Patterns enforced to be ignored no matter what the user configures on sonar.properties
const IGNORED_PATTERNS = ['.scannerwork'];

const DEFAULT_JS_EXTENSIONS = ['.js', '.mjs', '.cjs', '.jsx', '.vue'];
const DEFAULT_TS_EXTENSIONS = ['.ts', '.mts', '.cts', '.tsx'];
const DEFAULT_CSS_EXTENSIONS = ['.css', '.less', '.scss', '.sass'];
const DEFAULT_MAX_FILE_SIZE_KB = 1000; // 1MB, matches Java default in JavaScriptPlugin.java
const VUE_TS_REGEX = /<script[^>]+lang=['"]ts['"][^>]*>/;

const DEFAULT_EXCLUSIONS = [
  '**/*.d.ts',
  '**/.git/**',
  '**/node_modules/**',
  '**/bower_components/**',
  '**/dist/**',
  '**/vendor/**',
  '**/external/**',
  '**/contrib/**',
];

const DEFAULT_ENVIRONMENTS = [
  'amd',
  'applescript',
  'atomtest',
  'browser',
  'commonjs',
  'embertest',
  'greasemonkey',
  'jasmine',
  'jest',
  'jquery',
  'meteor',
  'mocha',
  'mongo',
  'nashorn',
  'node',
  'phantomjs',
  'prototypejs',
  'protractor',
  'qunit',
  'serviceworker',
  'shared-node-browser',
  'shelljs',
  'webextensions',
  'worker',
];

const DEFAULT_GLOBALS = [
  'angular',
  'goog',
  'google',
  'OpenLayers',
  'd3',
  'dojo',
  'dojox',
  'dijit',
  'Backbone',
  'moment',
  'casper',
  '_',
  'sap',
];

/**
 * Creates a new Configuration instance from raw input.
 * Validates and normalizes the input without mutating any global state.
 *
 * @param raw - Raw configuration object with baseDir required
 * @returns A new, validated Configuration instance
 * @throws Error if baseDir is missing, not a string, or not an absolute path
 *
 * @example
 * ```typescript
 * const config = createConfiguration({
 *   baseDir: '/path/to/project',
 *   sonarlint: true,
 *   maxFileSize: 2000,
 * });
 * ```
 */
export function createConfiguration(raw: unknown): Configuration {
  if (!isObject(raw)) {
    throw new Error('Invalid configuration: expected object');
  }
  if (!isString(raw.baseDir)) {
    throw new Error('baseDir is required and must be a string');
  }
  if (!isAbsolutePath(raw.baseDir)) {
    throw new Error(`baseDir is not an absolute path: ${raw.baseDir}`);
  }
  // Normalize baseDir first so it can be used by other normalization functions
  const baseDir = normalizeToAbsolutePath(raw.baseDir);
  return {
    baseDir,
    canAccessFileSystem: isBoolean(raw.canAccessFileSystem) ? raw.canAccessFileSystem : true,
    sonarlint: isBoolean(raw.sonarlint) ? raw.sonarlint : false,
    clearDependenciesCache: isBoolean(raw.clearDependenciesCache)
      ? raw.clearDependenciesCache
      : false,
    clearTsConfigCache: isBoolean(raw.clearTsConfigCache) ? raw.clearTsConfigCache : false,
    fsEvents: normalizeFsEvents(raw.fsEvents, baseDir),
    allowTsParserJsFiles: isBoolean(raw.allowTsParserJsFiles)
      ? raw.allowTsParserJsFiles
      : JSTS_ANALYSIS_DEFAULTS.allowTsParserJsFiles,
    analysisMode: isAnalysisMode(raw.analysisMode)
      ? raw.analysisMode
      : JSTS_ANALYSIS_DEFAULTS.analysisMode,
    skipAst: isBoolean(raw.skipAst) ? raw.skipAst : JSTS_ANALYSIS_DEFAULTS.skipAst,
    ignoreHeaderComments: isBoolean(raw.ignoreHeaderComments)
      ? raw.ignoreHeaderComments
      : JSTS_ANALYSIS_DEFAULTS.ignoreHeaderComments,
    maxFileSize: isNumber(raw.maxFileSize) ? raw.maxFileSize : DEFAULT_MAX_FILE_SIZE_KB,
    environments: isStringArray(raw.environments) ? raw.environments : DEFAULT_ENVIRONMENTS,
    globals: isStringArray(raw.globals) ? raw.globals : DEFAULT_GLOBALS,
    tsSuffixes: isStringArray(raw.tsSuffixes) ? raw.tsSuffixes : DEFAULT_TS_EXTENSIONS,
    jsSuffixes: isStringArray(raw.jsSuffixes) ? raw.jsSuffixes : DEFAULT_JS_EXTENSIONS,
    cssSuffixes: isStringArray(raw.cssSuffixes) ? raw.cssSuffixes : DEFAULT_CSS_EXTENSIONS,
    tsConfigPaths: sanitizePaths(raw.tsConfigPaths, baseDir),
    jsTsExclusions: normalizeGlobs(
      (isStringArray(raw.jsTsExclusions) ? raw.jsTsExclusions : DEFAULT_EXCLUSIONS).concat(
        IGNORED_PATTERNS,
      ),
      baseDir,
    ),
    sources: sanitizePaths(raw.sources, baseDir),
    inclusions: normalizeGlobs(raw.inclusions, baseDir),
    exclusions: normalizeGlobs(raw.exclusions, baseDir),
    tests: sanitizePaths(raw.tests, baseDir),
    testInclusions: normalizeGlobs(raw.testInclusions, baseDir),
    testExclusions: normalizeGlobs(raw.testExclusions, baseDir),
    detectBundles: isBoolean(raw.detectBundles) ? raw.detectBundles : true,
    createTSProgramForOrphanFiles: isBoolean(raw.createTSProgramForOrphanFiles)
      ? raw.createTSProgramForOrphanFiles
      : true,
    disableTypeChecking: isBoolean(raw.disableTypeChecking) ? raw.disableTypeChecking : false,
    reportNclocForTestFiles: isBoolean(raw.reportNclocForTestFiles)
      ? raw.reportNclocForTestFiles
      : false,
  };
}

const HTML_EXTENSIONS = new Set(['.html', '.htm']);
const YAML_EXTENSIONS = new Set(['.yml', '.yaml']);
const SAM_TRANSFORM_FIELD = 'AWS::Serverless-2016-10-31';
const NODEJS_RUNTIME_REGEX = /^\s*Runtime:\s*['"]?nodejs\S*['"]?/;
const HELM_DIRECTIVE_IN_COMMENT_OR_STRING = new RegExp(
  [
    String.raw`#.*\{\{`, // {{ inside a YAML comment
    String.raw`'[^']*\{\{[^']*'`, // {{ inside a single-quoted string
    String.raw`"[^"]*\{\{[^"]*"`, // {{ inside a double-quoted string
    String.raw`\{\{[\w\s]+}}`, // actual Helm directive: {{ .Values.foo }}
  ].join('|'),
);
const CSS_ALSO_EXTENSIONS = new Set(['.vue', '.html', '.htm', '.xhtml']);

/**
 * File suffix configuration for determining file types.
 */
export type FileSuffixes = {
  jsSuffixes: string[];
  tsSuffixes: string[];
  cssSuffixes: string[];
};

export const DEFAULT_FILE_SUFFIXES: FileSuffixes = {
  jsSuffixes: DEFAULT_JS_EXTENSIONS,
  tsSuffixes: DEFAULT_TS_EXTENSIONS,
  cssSuffixes: DEFAULT_CSS_EXTENSIONS,
};

export function isJsFile(
  filePath: NormalizedAbsolutePath,
  jsSuffixes: string[] = DEFAULT_JS_EXTENSIONS,
): boolean {
  return jsSuffixes.includes(extname(filePath).toLowerCase());
}

export function isTsFile(
  filePath: NormalizedAbsolutePath,
  contents: string,
  tsSuffixes: string[] = DEFAULT_TS_EXTENSIONS,
): boolean {
  const extension = extname(filePath).toLowerCase();
  return (
    tsSuffixes.includes(extension) || (extension.endsWith('.vue') && VUE_TS_REGEX.test(contents))
  );
}

export function isHtmlFile(filePath: NormalizedAbsolutePath): boolean {
  return HTML_EXTENSIONS.has(extname(filePath).toLowerCase());
}

export function isYamlFile(filePath: NormalizedAbsolutePath, contents?: string): boolean {
  if (!YAML_EXTENSIONS.has(extname(filePath).toLowerCase())) {
    return false;
  }
  // When contents are provided, apply the same Helm-safe + SAM template checks
  // as the Java predicate: reject Helm-unsafe {{ ... }} tokens, and require
  // both the SAM transform marker and a Node.js runtime declaration.
  if (contents == null) {
    return true;
  }

  let hasAwsTransform = false;
  let hasNodeJsRuntime = false;
  const lines = contents.split(/\r\n|\r|\n/);
  for (const line of lines) {
    if (line.includes('{{') && !HELM_DIRECTIVE_IN_COMMENT_OR_STRING.test(line)) {
      return false;
    }
    if (!hasAwsTransform && line.includes(SAM_TRANSFORM_FIELD)) {
      hasAwsTransform = true;
    }
    if (!hasNodeJsRuntime && NODEJS_RUNTIME_REGEX.test(line)) {
      hasNodeJsRuntime = true;
    }
  }
  return hasAwsTransform && hasNodeJsRuntime;
}

export function isJsTsFile(
  filePath: NormalizedAbsolutePath,
  suffixes: FileSuffixes = DEFAULT_FILE_SUFFIXES,
): boolean {
  const extension = extname(filePath).toLowerCase();
  return suffixes.jsSuffixes.includes(extension) || suffixes.tsSuffixes.includes(extension);
}

export function isCssFile(
  filePath: NormalizedAbsolutePath,
  cssSuffixes: string[] = DEFAULT_CSS_EXTENSIONS,
): boolean {
  return cssSuffixes.includes(extname(filePath).toLowerCase());
}

export function isAlsoCssFile(filePath: NormalizedAbsolutePath): boolean {
  return CSS_ALSO_EXTENSIONS.has(extname(filePath).toLowerCase());
}

export function isAnalyzableFile(
  filePath: NormalizedAbsolutePath,
  suffixes: FileSuffixes = DEFAULT_FILE_SUFFIXES,
): boolean {
  return (
    isHtmlFile(filePath) ||
    isYamlFile(filePath) ||
    isJsTsFile(filePath, suffixes) ||
    isCssFile(filePath, suffixes.cssSuffixes) ||
    isAlsoCssFile(filePath)
  );
}

function normalizeGlobs(globs: unknown, baseDir: NormalizedAbsolutePath) {
  return (isStringArray(globs) ? globs : []).map(
    pattern =>
      new Minimatch(normalizeToAbsolutePath(pattern.trim(), baseDir), {
        nocase: true,
        matchBase: true,
        dot: true,
      }),
  );
}

/**
 * Extracts and normalizes file paths from raw fsEvents object.
 * The event types (CREATED, MODIFIED, DELETED) are not used - only the paths matter.
 */
function normalizeFsEvents(
  raw: unknown,
  baseDir: NormalizedAbsolutePath,
): NormalizedAbsolutePath[] {
  if (!isObject(raw)) {
    return [];
  }
  return Object.keys(raw).map(key => normalizeToAbsolutePath(key, baseDir));
}

/**
 * Extracts the parameters needed for shouldIgnoreFile from a Configuration.
 *
 * @param configuration - The Configuration instance
 * @returns ShouldIgnoreFileParams containing jsTsExclusions, detectBundles, maxFileSize, and file suffixes
 */
export function getShouldIgnoreParams(configuration: Configuration): ShouldIgnoreFileParams {
  return {
    jsTsExclusions: configuration.jsTsExclusions,
    detectBundles: configuration.detectBundles,
    maxFileSize: configuration.maxFileSize,
    jsSuffixes: configuration.jsSuffixes,
    tsSuffixes: configuration.tsSuffixes,
    cssSuffixes: configuration.cssSuffixes,
  };
}

/**
 * Extracts the parameters needed for filterPathAndGetFileType from a Configuration.
 * If sources is empty, defaults sourcesPaths to [configuration.baseDir].
 *
 * @param configuration - The Configuration instance
 * @returns FilterPathParams containing sourcesPaths, testPaths, inclusions, exclusions, testInclusions, testExclusions
 */
export function getFilterPathParams(configuration: Configuration): FilterPathParams {
  return {
    sourcesPaths:
      configuration.sources.length > 0 ? configuration.sources : [configuration.baseDir],
    testPaths: configuration.tests,
    inclusions: configuration.inclusions,
    exclusions: configuration.exclusions,
    testInclusions: configuration.testInclusions,
    testExclusions: configuration.testExclusions,
  };
}

/**
 * Configuration fields needed for JS/TS file analysis.
 * Used by analyzeWithProgram, analyzeWithIncrementalProgram, analyzeWithoutProgram.
 */
export type JsTsConfigFields = {
  allowTsParserJsFiles: boolean;
  analysisMode: AnalysisMode;
  ignoreHeaderComments: boolean;
  clearDependenciesCache: boolean;
  skipAst: boolean;
  sonarlint: boolean;
  shouldIgnoreParams: ShouldIgnoreFileParams;
  createTSProgramForOrphanFiles: boolean;
  disableTypeChecking: boolean;
  reportNclocForTestFiles: boolean;
};

/**
 * Extracts the JS/TS configuration fields from a Configuration.
 *
 * @param configuration - The Configuration instance
 * @returns JsTsConfigFields for JS/TS analysis functions
 */
export function getJsTsConfigFields(configuration: Configuration): JsTsConfigFields {
  return {
    allowTsParserJsFiles: configuration.allowTsParserJsFiles,
    analysisMode: configuration.analysisMode,
    ignoreHeaderComments: configuration.ignoreHeaderComments,
    clearDependenciesCache: configuration.clearDependenciesCache,
    skipAst: configuration.skipAst,
    sonarlint: configuration.sonarlint,
    shouldIgnoreParams: getShouldIgnoreParams(configuration),
    createTSProgramForOrphanFiles: configuration.createTSProgramForOrphanFiles,
    disableTypeChecking: configuration.disableTypeChecking,
    reportNclocForTestFiles: configuration.reportNclocForTestFiles,
  };
}
