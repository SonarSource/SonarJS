/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
 * Duple [filePath, event] containing all the file events occurred
 * between two analysis requests, used to know if we need to clear
 * tsconfig.json cache or the mapping between input files and tsconfigs
 */
type FsEvent = [string, FsEventType];

export type Configuration = {
  sonarlint?: boolean;
  clearDependenciesCache?: boolean;
  clearFileToTsConfigCache?: boolean;
  clearTsConfigCache?: boolean;
  fsEvents?: FsEvent[];
  allowTsParserJsFiles?: boolean;
  analysisMode?: AnalysisMode;
  skipAst?: boolean;
  ignoreHeaderComments?: boolean /* sonar.javascript.ignoreHeaderComments True to not count file header comments in comment metrics */;
  maxFileSize?: number /* sonar.javascript.maxFileSize Threshold for the maximum size of analyzed files (in kilobytes).  */;
  maxFilesForTypeChecking?: number /* sonar.javascript.sonarlint.typechecking.maxfiles Max project size to turn off type-checking of JavaScript */;
  environments?: string[] /* sonar.javascript.environments */;
  globals?: string[] /* sonar.javascript.globals */;
  tsSuffixes?: string[] /* sonar.typescript.file.suffixes */;
  jsSuffixes?: string[] /* sonar.javascript.file.suffixes */;
  tsConfigPaths?: string[] /* sonar.typescript.tsconfigPath(s) */;
  jsTsExclusions?: string[] /* sonar.typescript.exclusions and sonar.javascript.exclusions wildcards */;
  sources?: string[] /* sonar.sources property, relative path to baseDir to look for files. NOT YET SUPPORTED, we are based on baseDir */;
  inclusions?: string[] /* sonar.inclusions property, WILDCARD to narrow down sonar.sources. NOT YET SUPPORTED. */;
  exclusions?: string[] /* sonar.exclusions property, WILDCARD to narrow down sonar.sources. NOT YET SUPPORTED. */;
  tests?: string[] /* sonar.tests property, relative path to baseDir to look for test files */;
  testInclusions?: string[] /* sonar.test.inclusions property, WILDCARD to narrow down sonar.tests. NOT YET SUPPORTED. */;
  testExclusions?: string[] /* sonar.test.exclusions property, WILDCARD to narrow down sonar.tests. NOT YET SUPPORTED. */;
};

const DEFAULT_JS_EXTENSIONS = ['.js', '.mjs', '.cjs', '.jsx', '.vue'];
const DEFAULT_TS_EXTENSIONS = ['.ts', '.mts', '.cts', '.tsx'];
const VUE_TS_REGEX = /<script[^>]+lang=['"]ts['"][^>]*>/;

let configuration: Configuration = {};

export function setGlobalConfiguration(config: Configuration = {}) {
  configuration = { ...config };
}

export const HTML_EXTENSIONS = ['.html', '.htm'];
export const YAML_EXTENSIONS = ['.yml', '.yaml'];

export function jsTsExtensions() {
  return jsExtensions().concat(tsExtensions());
}

export function getTsConfigPaths() {
  return configuration.tsConfigPaths ?? [];
}

export function setTsConfigPaths(tsconfigs: string[]) {
  configuration.tsConfigPaths = tsconfigs;
}

function tsExtensions() {
  return configuration.tsSuffixes?.length ? configuration.tsSuffixes : DEFAULT_TS_EXTENSIONS;
}

function jsExtensions() {
  return configuration.jsSuffixes?.length ? configuration.jsSuffixes : DEFAULT_JS_EXTENSIONS;
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
  return HTML_EXTENSIONS.includes(extname(filePath).toLowerCase());
}

export function isYamlFile(filePath: string) {
  return YAML_EXTENSIONS.includes(extname(filePath).toLowerCase());
}

export function isJsTsFile(filePath: string) {
  return jsTsExtensions().includes(extname(filePath).toLowerCase());
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

export function getGlobals() {
  return configuration.globals ?? DEFAULT_GLOBALS;
}

export function maxFilesForTypeChecking() {
  return configuration.maxFilesForTypeChecking ?? DEFAULT_MAX_FILES_FOR_TYPE_CHECKING;
}

export function getTestPaths() {
  return configuration.tests;
}

export function getExclusions() {
  return DEFAULT_EXCLUSIONS.concat(configuration.exclusions ?? []).concat(
    configuration.jsTsExclusions ?? [],
  );
}

export function getFsEvents() {
  return configuration.fsEvents ?? [];
}

export function getMaxFileSize() {
  return configuration.maxFileSize ?? DEFAULT_MAX_FILE_SIZE_KB;
}

export function setClearDependenciesCache(value: boolean) {
  configuration.clearDependenciesCache = value;
}

export function shouldClearDependenciesCache() {
  return configuration.clearDependenciesCache;
}

export function setClearFileToTsConfigCache(value: boolean) {
  configuration.clearFileToTsConfigCache = value;
}

export function shouldClearFileToTsConfigCache() {
  return configuration.clearFileToTsConfigCache;
}

export function setClearTsConfigCache(value: boolean) {
  configuration.clearTsConfigCache = value;
}

export function shouldClearTsConfigCache() {
  return configuration.clearTsConfigCache;
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

export const DEFAULT_EXCLUSIONS = [
  '**/.*',
  '**/.*/**',
  '**/*.d.ts',
  '**/.git/**',
  '**/node_modules/**',
  '**/bower_components/**',
  '**/dist/**',
  '**/vendor/**',
  '**/external/**',
  '**/contrib/**',
];

export const DEFAULT_MAX_FILES_FOR_TYPE_CHECKING = 20_000;

export const DEFAULT_ENVIRONMENTS = [
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

export const DEFAULT_GLOBALS = [
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
