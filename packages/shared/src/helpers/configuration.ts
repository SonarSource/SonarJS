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
import { join, extname } from 'node:path/posix';
import { isAbsolutePath, toUnixPath } from './files.js';
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

export type Configuration = {
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
  normalizedJsTsExclusions?: Minimatch[];
  sources?: string[] /* sonar.sources property, absolute or relative path to baseDir to look for files. we are based on baseDir */;
  inclusions?: string[] /* sonar.inclusions property, WILDCARD to narrow down sonar.sources. */;
  normalizedInclusions?: Minimatch[];
  exclusions?: string[] /* sonar.exclusions property, WILDCARD to narrow down sonar.sources. */;
  normalizedExclusions?: Minimatch[];
  tests?: string[] /* sonar.tests property, absolute or relative path to baseDir to look for test files */;
  testInclusions?: string[] /* sonar.test.inclusions property, WILDCARD to narrow down sonar.tests. */;
  normalizedTestInclusions?: Minimatch[];
  testExclusions?: string[] /* sonar.test.exclusions property, WILDCARD to narrow down sonar.tests. */;
  normalizedTestExclusions?: Minimatch[];
  detectBundles?: boolean /* sonar.javascript.detectBundles property: whether files looking like bundled code should be ignored  */;
};

// Patterns enforced to be ignored no matter what the user configures on sonar.properties
const IGNORED_PATTERNS = ['.scannerwork'];

const DEFAULT_JS_EXTENSIONS = ['.js', '.mjs', '.cjs', '.jsx', '.vue'];
const DEFAULT_TS_EXTENSIONS = ['.ts', '.mts', '.cts', '.tsx'];
const DEFAULT_CSS_EXTENSIONS = ['.css', '.less', '.scss', '.sass'];

const VUE_TS_REGEX = /<script[^>]+lang=['"]ts['"][^>]*>/;

let configuration: Configuration = {};

export function setGlobalConfiguration(config?: Configuration) {
  if (!config) {
    return;
  }
  configuration = { ...config };
  if (!config.baseDir) {
    throw new Error('baseDir is required');
  } else if (!isAbsolutePath(config.baseDir)) {
    throw new Error(`baseDir is not an absolute path: ${config.baseDir}`);
  }
  configuration.baseDir = normalizePath(config.baseDir);
  setSourcesPaths(configuration.sources);
  setTestPaths(configuration.tests);
  setJsTsExclusions(configuration.jsTsExclusions);
  setExclusions(configuration.exclusions);
  setInclusions(configuration.inclusions);
  setTestExclusions(configuration.testExclusions);
  setTestInclusions(configuration.testInclusions);
  setTsConfigPaths(configuration.tsConfigPaths);
}

export function getBaseDir() {
  if (!configuration.baseDir) {
    throw new Error('baseDir is not set');
  }
  return configuration.baseDir;
}

const HTML_EXTENSIONS = new Set(['.html', '.htm']);
const YAML_EXTENSIONS = new Set(['.yml', '.yaml']);

function jsTsExtensions() {
  return jsExtensions().concat(tsExtensions());
}

export function getTsConfigPaths() {
  return configuration.tsConfigPaths ?? [];
}

export function setTsConfigPaths(tsconfigs: string[] | undefined) {
  configuration.tsConfigPaths = normalizePaths(tsconfigs);
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

export function isHtmlFile(filePath: string) {
  return HTML_EXTENSIONS.has(extname(filePath).toLowerCase());
}

export function isYamlFile(filePath: string) {
  return YAML_EXTENSIONS.has(extname(filePath).toLowerCase());
}

export function isJsTsFile(filePath: string) {
  return jsTsExtensions().includes(extname(filePath).toLowerCase());
}

export function isCssFile(filePath: string) {
  return cssExtensions().includes(extname(filePath).toLowerCase());
}

export function isAnalyzableFile(filePath: string) {
  return isHtmlFile(filePath) || isYamlFile(filePath) || isJsTsFile(filePath);
}

export function getEnvironments() {
  return configuration.environments ?? DEFAULT_ENVIRONMENTS;
}

export function isSonarLint() {
  return !!configuration.sonarlint;
}

export function canAccessFileSystem() {
  return configuration.canAccessFileSystem !== false;
}

export function getGlobals() {
  return configuration.globals ?? DEFAULT_GLOBALS;
}

function setTestPaths(testPaths: string[] | undefined) {
  configuration.tests = normalizePaths(testPaths);
}

export function getTestPaths() {
  return configuration.tests;
}

function setSourcesPaths(sourcesPaths: string[] | undefined) {
  configuration.sources = normalizePaths(sourcesPaths);
}

export function getSourcesPaths() {
  return configuration.sources?.length ? configuration.sources : [getBaseDir()];
}

function setJsTsExclusions(jsTsExclusions: string[] | undefined) {
  configuration.normalizedJsTsExclusions = normalizeGlobs(
    (jsTsExclusions ?? DEFAULT_EXCLUSIONS).concat(IGNORED_PATTERNS),
  );
  debug(
    `Setting js/ts exclusions to ${configuration.normalizedJsTsExclusions.map(mini => mini.pattern)}`,
  );
}

export function getJsTsExclusions() {
  return configuration.normalizedJsTsExclusions;
}

function setExclusions(exclusions: string[] | undefined) {
  configuration.normalizedExclusions = normalizeGlobs(exclusions);
}

export function getExclusions() {
  return configuration.normalizedExclusions || [];
}

function setInclusions(inclusions: string[] | undefined) {
  configuration.normalizedInclusions = normalizeGlobs(inclusions);
}

export function getInclusions() {
  return configuration.normalizedInclusions;
}

function setTestExclusions(testExclusions: string[] | undefined) {
  configuration.normalizedTestExclusions = normalizeGlobs(testExclusions);
}

export function getTestExclusions() {
  return configuration.normalizedTestExclusions;
}

function setTestInclusions(testInclusions: string[] | undefined) {
  configuration.normalizedTestInclusions = normalizeGlobs(testInclusions);
}

export function getTestInclusions() {
  return configuration.normalizedTestInclusions;
}

export function getFsEvents() {
  return configuration.fsEvents ?? {};
}

export function getMaxFileSize() {
  return configuration.maxFileSize ?? DEFAULT_MAX_FILE_SIZE_KB;
}

export function setClearTsConfigCache(value: boolean) {
  configuration.clearTsConfigCache = value;
}

export function shouldClearTsConfigCache() {
  return configuration.clearTsConfigCache;
}

export function shouldDetectBundles() {
  return configuration.detectBundles !== false;
}

export const fieldsForJsTsAnalysisInput = (): Omit<JsTsAnalysisInput, 'filePath' | 'fileType'> => ({
  allowTsParserJsFiles: configuration.allowTsParserJsFiles,
  analysisMode: configuration.analysisMode,
  ignoreHeaderComments: configuration.ignoreHeaderComments,
  clearDependenciesCache: configuration.clearDependenciesCache,
  skipAst: configuration.skipAst,
  sonarlint: isSonarLint(),
});

const DEFAULT_MAX_FILE_SIZE_KB = 4000;

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
  return normalizePaths(globs).map(
    pattern => new Minimatch(toUnixPath(pattern), { nocase: true, matchBase: true, dot: true }),
  );
}

function normalizePaths(paths: string[] | undefined) {
  return (paths || []).map(path => normalizePath(path));
}

function normalizePath(path: string) {
  const normalized = toUnixPath(path.trim());
  if (!isAbsolutePath(normalized)) {
    return join(getBaseDir(), normalized);
  }
  return normalized;
}
