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
import {
  type NormalizedAbsolutePath,
  isAbsolutePath,
  normalizePath,
  normalizeToAbsolutePath,
} from './files.js';
import { Minimatch } from 'minimatch';
import { debug } from './logging.js';
import { sanitizePaths } from './sanitize.js';

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

type FsEventType = 'CREATED' | 'MODIFIED' | 'DELETED';
/** Data filled in file watcher FSListenerImpl.java
 *
 * Map entry {filePath => event} containing all the file events occurred
 * between two analysis requests, used to know if we need to clear
 * tsconfig.json cache or the mapping between input files and tsconfigs
 */
type FsEventsRaw = { [key: string]: FsEventType };

// Brand for the normalized FsEvents container - ensures we go through normalizeFsEvents()
declare const FsEventsBrand: unique symbol;
type FsEvents = { [key: NormalizedAbsolutePath]: FsEventType } & {
  readonly [FsEventsBrand]: never;
};

/**
 * Raw configuration as received from the analysis request (e.g., ProjectAnalysisInput).
 * All path fields are strings because they haven't been validated or normalized yet.
 */
export type RawConfiguration = {
  baseDir?: string;
  canAccessFileSystem?: boolean;
  sonarlint?: boolean;
  clearDependenciesCache?: boolean;
  clearTsConfigCache?: boolean;
  fsEvents?: FsEventsRaw;
  allowTsParserJsFiles?: boolean;
  analysisMode?: AnalysisMode;
  skipAst?: boolean;
  ignoreHeaderComments?: boolean /* sonar.javascript.ignoreHeaderComments True to not count file header comments in comment metrics */;
  maxFileSize?: number /* sonar.javascript.maxFileSize Threshold for the maximum size of analyzed files (in kilobytes).  */;
  environments?: string[] /* sonar.javascript.environments */;
  globals?: string[] /* sonar.javascript.globals */;
  tsSuffixes?: string[] /* sonar.typescript.file.suffixes */;
  jsSuffixes?: string[] /* sonar.javascript.file.suffixes */;
  cssSuffixes?: string[] /* sonar.css.file.suffixes */;
  tsConfigPaths?: string[] /* sonar.typescript.tsconfigPath(s) */;
  jsTsExclusions?: string[] /* sonar.typescript.exclusions and sonar.javascript.exclusions wildcards */;
  sources?: string[] /* sonar.sources property, absolute or relative path to baseDir to look for files. we are based on baseDir */;
  inclusions?: string[] /* sonar.inclusions property, WILDCARD to narrow down sonar.sources. */;
  exclusions?: string[] /* sonar.exclusions property, WILDCARD to narrow down sonar.sources. */;
  tests?: string[] /* sonar.tests property, absolute or relative path to baseDir to look for test files */;
  testInclusions?: string[] /* sonar.test.inclusions property, WILDCARD to narrow down sonar.tests. */;
  testExclusions?: string[] /* sonar.test.exclusions property, WILDCARD to narrow down sonar.tests. */;
  detectBundles?: boolean /* sonar.javascript.detectBundles property: whether files looking like bundled code should be ignored  */;
};

/**
 * Sanitized configuration after validation and normalization.
 * Path fields use branded types (NormalizedAbsolutePath) and glob patterns are compiled to Minimatch instances.
 */
type Configuration = {
  baseDir: NormalizedAbsolutePath;
  canAccessFileSystem: boolean;
  sonarlint: boolean;
  clearDependenciesCache: boolean;
  clearTsConfigCache: boolean;
  fsEvents: FsEvents;
  allowTsParserJsFiles: boolean;
  analysisMode: AnalysisMode;
  skipAst: boolean;
  ignoreHeaderComments: boolean;
  maxFileSize: number;
  environments: string[];
  globals: string[];
  tsSuffixes: string[];
  jsSuffixes: string[];
  cssSuffixes: string[];
  tsConfigPaths: NormalizedAbsolutePath[];
  jsTsExclusions: Minimatch[];
  sources: NormalizedAbsolutePath[];
  inclusions: Minimatch[];
  exclusions: Minimatch[];
  tests: NormalizedAbsolutePath[];
  testInclusions: Minimatch[];
  testExclusions: Minimatch[];
  detectBundles: boolean;
};

// Patterns enforced to be ignored no matter what the user configures on sonar.properties
const IGNORED_PATTERNS = ['.scannerwork'];

const DEFAULT_JS_EXTENSIONS = ['.js', '.mjs', '.cjs', '.jsx', '.vue'];
const DEFAULT_TS_EXTENSIONS = ['.ts', '.mts', '.cts', '.tsx'];
const DEFAULT_CSS_EXTENSIONS = ['.css', '.less', '.scss', '.sass'];
const DEFAULT_MAX_FILE_SIZE_KB = 4000;
const VUE_TS_REGEX = /<script[^>]+lang=['"]ts['"][^>]*>/;

let configuration: Configuration;

export function setGlobalConfiguration(config?: RawConfiguration) {
  if (!config) {
    return;
  }
  if (!config.baseDir) {
    throw new Error('baseDir is required');
  } else if (!isAbsolutePath(config.baseDir)) {
    throw new Error(`baseDir is not an absolute path: ${config.baseDir}`);
  }
  // Normalize baseDir first so it can be used by other normalization functions
  const baseDir = normalizeToAbsolutePath(config.baseDir);
  configuration = {
    baseDir,
    canAccessFileSystem: !!config.canAccessFileSystem,
    sonarlint: !!config.sonarlint,
    clearDependenciesCache: !!config.clearDependenciesCache,
    clearTsConfigCache: !!config.clearTsConfigCache,
    fsEvents: normalizeFsEvents(config.fsEvents, baseDir),
    allowTsParserJsFiles:
      config.allowTsParserJsFiles ?? JSTS_ANALYSIS_DEFAULTS.allowTsParserJsFiles,
    analysisMode: config.analysisMode ?? JSTS_ANALYSIS_DEFAULTS.analysisMode,
    skipAst: config.skipAst ?? JSTS_ANALYSIS_DEFAULTS.skipAst,
    ignoreHeaderComments:
      config.ignoreHeaderComments ?? JSTS_ANALYSIS_DEFAULTS.ignoreHeaderComments,
    maxFileSize: config.maxFileSize ?? DEFAULT_MAX_FILE_SIZE_KB,
    environments: config.environments ?? DEFAULT_ENVIRONMENTS,
    globals: config.globals ?? DEFAULT_GLOBALS,
    tsSuffixes: config.tsSuffixes ?? DEFAULT_TS_EXTENSIONS,
    jsSuffixes: config.jsSuffixes ?? DEFAULT_JS_EXTENSIONS,
    cssSuffixes: config.cssSuffixes ?? DEFAULT_CSS_EXTENSIONS,
    tsConfigPaths: sanitizePaths(config.tsConfigPaths, baseDir),
    jsTsExclusions: normalizeGlobs(
      (config.jsTsExclusions ?? DEFAULT_EXCLUSIONS).concat(IGNORED_PATTERNS),
      baseDir,
    ),
    sources: sanitizePaths(config.sources, baseDir),
    inclusions: normalizeGlobs(config.inclusions, baseDir),
    exclusions: normalizeGlobs(config.exclusions, baseDir),
    tests: sanitizePaths(config.tests, baseDir),
    testInclusions: normalizeGlobs(config.testInclusions, baseDir),
    testExclusions: normalizeGlobs(config.testExclusions, baseDir),
    detectBundles: !!config.detectBundles,
  };
  debug(`Setting js/ts exclusions to ${configuration.jsTsExclusions?.map(mini => mini.pattern)}`);
}

function getConfiguration() {
  if (!configuration) {
    throw new Error('Global configuration is not set');
  }
  return configuration;
}

export function getBaseDir() {
  if (!getConfiguration().baseDir) {
    throw new Error('baseDir is not set');
  }
  return getConfiguration().baseDir;
}

const HTML_EXTENSIONS = new Set(['.html', '.htm']);
const YAML_EXTENSIONS = new Set(['.yml', '.yaml']);

function jsTsExtensions() {
  return jsExtensions().concat(tsExtensions());
}

export function getTsConfigPaths() {
  return getConfiguration().tsConfigPaths ?? [];
}
function tsExtensions() {
  return getConfiguration().tsSuffixes?.length
    ? getConfiguration().tsSuffixes
    : DEFAULT_TS_EXTENSIONS;
}

function jsExtensions() {
  return getConfiguration().jsSuffixes?.length
    ? getConfiguration().jsSuffixes
    : DEFAULT_JS_EXTENSIONS;
}

function cssExtensions() {
  return getConfiguration().cssSuffixes?.length
    ? getConfiguration().cssSuffixes
    : DEFAULT_CSS_EXTENSIONS;
}

export function isJsFile(filePath: NormalizedAbsolutePath): boolean {
  return jsExtensions().includes(extname(filePath).toLowerCase());
}

export function isTsFile(filePath: NormalizedAbsolutePath, contents: string): boolean {
  const extension = extname(filePath).toLowerCase();
  return (
    tsExtensions().includes(extension) ||
    (extension.endsWith('.vue') && VUE_TS_REGEX.test(contents))
  );
}

export function isHtmlFile(filePath: NormalizedAbsolutePath): boolean {
  return HTML_EXTENSIONS.has(extname(filePath).toLowerCase());
}

export function isYamlFile(filePath: NormalizedAbsolutePath): boolean {
  return YAML_EXTENSIONS.has(extname(filePath).toLowerCase());
}

export function isJsTsFile(filePath: NormalizedAbsolutePath): boolean {
  return jsTsExtensions().includes(extname(filePath).toLowerCase());
}

export function isCssFile(filePath: NormalizedAbsolutePath): boolean {
  return cssExtensions().includes(extname(filePath).toLowerCase());
}

export function isAnalyzableFile(filePath: NormalizedAbsolutePath): boolean {
  return isHtmlFile(filePath) || isYamlFile(filePath) || isJsTsFile(filePath);
}

export function getEnvironments() {
  return getConfiguration().environments;
}

export function isSonarLint() {
  return getConfiguration().sonarlint;
}

export function canAccessFileSystem() {
  return getConfiguration().canAccessFileSystem;
}

export function getGlobals() {
  return getConfiguration().globals;
}

export function getTestPaths() {
  return getConfiguration().tests;
}

export function getSourcesPaths() {
  return getConfiguration().sources?.length ? getConfiguration().sources : [getBaseDir()];
}

export function getJsTsExclusions() {
  return getConfiguration().jsTsExclusions;
}

export function getExclusions() {
  return getConfiguration().exclusions;
}

export function getInclusions() {
  return getConfiguration().inclusions;
}

export function getTestExclusions() {
  return getConfiguration().testExclusions;
}

export function getTestInclusions() {
  return getConfiguration().testInclusions;
}

export function getFsEvents() {
  return Object.entries(getConfiguration().fsEvents) as [NormalizedAbsolutePath, FsEventType][];
}

export function getMaxFileSize() {
  return getConfiguration().maxFileSize;
}

export function setClearTsConfigCache(value: boolean) {
  getConfiguration().clearTsConfigCache = value;
}

export function shouldClearTsConfigCache() {
  return getConfiguration().clearTsConfigCache;
}

export function shouldDetectBundles() {
  return getConfiguration().detectBundles;
}

/**
 * Fields from the global configuration that are used in JsTsAnalysisInput.
 * These are the configuration-controlled values (not static defaults).
 */
export type JsTsConfigFields = {
  allowTsParserJsFiles: boolean;
  analysisMode: AnalysisMode;
  ignoreHeaderComments: boolean;
  clearDependenciesCache: boolean;
  skipAst: boolean;
  sonarlint: boolean;
};

/**
 * Returns the configuration-based values for JsTsAnalysisInput fields.
 * These values come from the global configuration set via setGlobalConfiguration().
 *
 * Note: This is different from JSTS_ANALYSIS_DEFAULTS which provides static defaults
 * for missing fields during sanitization. This function returns the actual configured
 * values which may differ from the defaults.
 */
export const fieldsForJsTsAnalysisInput = (): JsTsConfigFields => ({
  allowTsParserJsFiles: getConfiguration().allowTsParserJsFiles,
  analysisMode: getConfiguration().analysisMode,
  ignoreHeaderComments: getConfiguration().ignoreHeaderComments,
  clearDependenciesCache: getConfiguration().clearDependenciesCache,
  skipAst: getConfiguration().skipAst,
  sonarlint: isSonarLint(),
});

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

function normalizeGlobs(globs: string[] | undefined, baseDir: NormalizedAbsolutePath) {
  return sanitizePaths(globs, baseDir).map(
    pattern => new Minimatch(normalizePath(pattern), { nocase: true, matchBase: true, dot: true }),
  );
}

/**
 * Converts raw FsEvents (string keys) to branded FsEvents with normalized absolute path keys.
 * This ensures type safety at compile time - you cannot assign FsEventsRaw directly to FsEvents.
 */
function normalizeFsEvents(
  raw: FsEventsRaw | undefined,
  baseDir: NormalizedAbsolutePath,
): FsEvents {
  if (!raw) {
    return {} as FsEvents;
  }

  const result: { [key: string]: FsEventType } = {};
  for (const [key, value] of Object.entries(raw)) {
    result[normalizeToAbsolutePath(key, baseDir)] = value;
  }
  return result as FsEvents;
}
