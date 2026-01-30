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
import { AnalysisMode, JsTsAnalysisInput } from '../../../jsts/src/analysis/analysis.js';
import { extname } from 'node:path/posix';
import {
  type NormalizedAbsolutePath,
  isAbsolutePath,
  normalizePath,
  normalizeToAbsolutePath,
} from './files.js';
import { Minimatch } from 'minimatch';
import { debug } from './logging.js';

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
type FsEvents = { [key: string]: FsEventType };

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
  fsEvents?: FsEvents;
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
export type Configuration = {
  baseDir?: NormalizedAbsolutePath;
  canAccessFileSystem?: boolean;
  sonarlint?: boolean;
  clearDependenciesCache?: boolean;
  clearTsConfigCache?: boolean;
  fsEvents?: FsEvents;
  allowTsParserJsFiles?: boolean;
  analysisMode?: AnalysisMode;
  skipAst?: boolean;
  ignoreHeaderComments?: boolean;
  maxFileSize?: number;
  environments?: string[];
  globals?: string[];
  tsSuffixes?: string[];
  jsSuffixes?: string[];
  cssSuffixes?: string[];
  tsConfigPaths?: NormalizedAbsolutePath[];
  jsTsExclusions?: Minimatch[];
  sources?: NormalizedAbsolutePath[];
  inclusions?: Minimatch[];
  exclusions?: Minimatch[];
  tests?: NormalizedAbsolutePath[];
  testInclusions?: Minimatch[];
  testExclusions?: Minimatch[];
  detectBundles?: boolean;
};

// Patterns enforced to be ignored no matter what the user configures on sonar.properties
const IGNORED_PATTERNS = ['.scannerwork'];

const DEFAULT_JS_EXTENSIONS = ['.js', '.mjs', '.cjs', '.jsx', '.vue'];
const DEFAULT_TS_EXTENSIONS = ['.ts', '.mts', '.cts', '.tsx'];
const DEFAULT_CSS_EXTENSIONS = ['.css', '.less', '.scss', '.sass'];

const VUE_TS_REGEX = /<script[^>]+lang=['"]ts['"][^>]*>/;

let configuration: Configuration = {};

export function setGlobalConfiguration(config?: RawConfiguration) {
  if (!config) {
    return;
  }
  if (!config.baseDir) {
    throw new Error('baseDir is required');
  } else if (!isAbsolutePath(config.baseDir)) {
    throw new Error(`baseDir is not an absolute path: ${config.baseDir}`);
  }
  configuration = {
    baseDir: normalizeToAbsolutePath(config.baseDir),
    canAccessFileSystem: config.canAccessFileSystem,
    sonarlint: config.sonarlint,
    clearDependenciesCache: config.clearDependenciesCache,
    clearTsConfigCache: config.clearTsConfigCache,
    fsEvents: config.fsEvents,
    allowTsParserJsFiles: config.allowTsParserJsFiles,
    analysisMode: config.analysisMode,
    skipAst: config.skipAst,
    ignoreHeaderComments: config.ignoreHeaderComments,
    maxFileSize: config.maxFileSize,
    environments: config.environments,
    globals: config.globals,
    tsSuffixes: config.tsSuffixes,
    jsSuffixes: config.jsSuffixes,
    cssSuffixes: config.cssSuffixes,
    tsConfigPaths: toAbsolutePaths(config.tsConfigPaths),
    jsTsExclusions: normalizeGlobs(
      (config.jsTsExclusions ?? DEFAULT_EXCLUSIONS).concat(IGNORED_PATTERNS),
    ),
    sources: toAbsolutePaths(config.sources),
    inclusions: normalizeGlobs(config.inclusions),
    exclusions: normalizeGlobs(config.exclusions),
    tests: toAbsolutePaths(config.tests),
    testInclusions: normalizeGlobs(config.testInclusions),
    testExclusions: normalizeGlobs(config.testExclusions),
    detectBundles: config.detectBundles,
  };
  debug(`Setting js/ts exclusions to ${configuration.jsTsExclusions?.map(mini => mini.pattern)}`);
}

const HTML_EXTENSIONS = new Set(['.html', '.htm']);
const YAML_EXTENSIONS = new Set(['.yml', '.yaml']);

function jsTsExtensions() {
  return jsExtensions().concat(tsExtensions());
}

function tsExtensions() {
  return configuration.tsSuffixes?.length ? configuration.tsSuffixes : DEFAULT_TS_EXTENSIONS;
}

function jsExtensions() {
  return configuration.jsSuffixes?.length ? configuration.jsSuffixes : DEFAULT_JS_EXTENSIONS;
}

function cssExtensions() {
  return configuration.cssSuffixes?.length ? configuration.cssSuffixes : DEFAULT_CSS_EXTENSIONS;
}

export function isJsFile(filePath: string) {
  return jsExtensions().includes(extname(filePath).toLowerCase());
}

export function isTsFile(filePath: string, contents: string) {
  const extension = extname(filePath).toLowerCase();
  return (
    tsExtensions().includes(extension) ||
    (extension.endsWith('.vue') && VUE_TS_REGEX.test(contents))
  );
}

export function isHtmlFile(filePath: NormalizedAbsolutePath) {
  return HTML_EXTENSIONS.has(extname(filePath).toLowerCase());
}

export function isYamlFile(filePath: NormalizedAbsolutePath) {
  return YAML_EXTENSIONS.has(extname(filePath).toLowerCase());
}

export function isJsTsFile(filePath: NormalizedAbsolutePath) {
  return jsTsExtensions().includes(extname(filePath).toLowerCase());
}

export function isCssFile(filePath: NormalizedAbsolutePath) {
  return cssExtensions().includes(extname(filePath).toLowerCase());
}

export function isAnalyzableFile(filePath: NormalizedAbsolutePath) {
  return isHtmlFile(filePath) || isYamlFile(filePath) || isJsTsFile(filePath);
}

export const fieldsForJsTsAnalysisInput = (): Omit<JsTsAnalysisInput, 'filePath' | 'fileType'> => ({
  allowTsParserJsFiles: configuration.allowTsParserJsFiles,
  analysisMode: configuration.analysisMode,
  ignoreHeaderComments: configuration.ignoreHeaderComments,
  clearDependenciesCache: configuration.clearDependenciesCache,
  skipAst: configuration.skipAst,
  sonarlint: configuration.sonarlint,
});

const DEFAULT_MAX_FILE_SIZE_KB = 4000;

export function getBaseDir(): NormalizedAbsolutePath {
  if (!configuration.baseDir) {
    throw new Error('baseDir is not set');
  }
  return configuration.baseDir;
}

export function getTsConfigPaths(): NormalizedAbsolutePath[] {
  return configuration.tsConfigPaths ?? [];
}

export function getTestPaths(): NormalizedAbsolutePath[] | undefined {
  return configuration.tests;
}

export function getSourcesPaths(): NormalizedAbsolutePath[] {
  return configuration.sources ?? [];
}

export function getJsTsExclusions(): Minimatch[] | undefined {
  return configuration.jsTsExclusions;
}

export function getExclusions(): Minimatch[] | undefined {
  return configuration.exclusions;
}

export function getInclusions(): Minimatch[] | undefined {
  return configuration.inclusions;
}

export function getTestExclusions(): Minimatch[] | undefined {
  return configuration.testExclusions;
}

export function getTestInclusions(): Minimatch[] | undefined {
  return configuration.testInclusions;
}

export function getFsEvents(): { [key: string]: FsEventType } {
  return configuration.fsEvents ?? {};
}

export function getMaxFileSize(): number {
  return configuration.maxFileSize ?? DEFAULT_MAX_FILE_SIZE_KB;
}

export function shouldClearTsConfigCache(): boolean {
  return configuration.clearTsConfigCache ?? false;
}

export function setClearTsConfigCache(value: boolean) {
  configuration.clearTsConfigCache = value;
}

export function shouldDetectBundles(): boolean {
  return configuration.detectBundles ?? false;
}

export function isSonarLint(): boolean {
  return configuration.sonarlint ?? false;
}

export function canAccessFileSystem(): boolean {
  return configuration.canAccessFileSystem ?? false;
}

export function getEnvironments(): string[] {
  return configuration.environments ?? DEFAULT_ENVIRONMENTS;
}

export function getGlobals(): string[] {
  return configuration.globals ?? DEFAULT_GLOBALS;
}

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

function normalizeGlobs(globs: string[] | undefined) {
  return toAbsolutePaths(globs).map(
    pattern => new Minimatch(normalizePath(pattern), { nocase: true, matchBase: true, dot: true }),
  );
}

function toAbsolutePaths(paths: string[] | undefined) {
  return (paths || []).map(path => normalizeToAbsolutePath(path, getBaseDir()));
}
