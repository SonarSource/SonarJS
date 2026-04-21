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
import { extname } from 'node:path/posix';
import { Minimatch } from 'minimatch';
import {
  type NormalizedAbsolutePath,
  isAbsolutePath,
  normalizeToAbsolutePath,
} from '../../../shared/src/helpers/files.js';
import {
  sanitizePaths,
  isBoolean,
  isNumber,
  isString,
  isStringArray,
  isObject,
} from '../../../shared/src/helpers/sanitize.js';

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
export type AnalysisMode = 'DEFAULT' | 'SKIP_UNCHANGED';

function isAnalysisMode(value: unknown): value is AnalysisMode {
  return value === 'DEFAULT' || value === 'SKIP_UNCHANGED';
}

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
  htmlSuffixes: string[] /* sonar.javascript.html.file.suffixes */;
  yamlSuffixes: string[] /* sonar.javascript.yaml.file.suffixes */;
  cssAdditionalSuffixes: string[] /* sonar.javascript.css.additional.file.suffixes */;
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
  skipNodeModuleLookupOutsideBaseDir: boolean /* sonar.internal.analysis.skipNodeModuleLookupOutsideBaseDir - whether to skip node_modules lookups outside baseDir in TS compiler host */;
  ecmaScriptVersion?: string /* sonar.javascript.ecmaScriptVersion - explicit ES version override e.g. 'ES2022' */;
  reportNclocForTestFiles: boolean /* In gRPC/A3S context, ncloc for test files is computed by the analyzer. In SQ context, ncloc is not computed for tests. */;
};

export type ConfigurationInput = {
  baseDir: string;
  canAccessFileSystem?: boolean;
  sonarlint?: boolean;
  clearDependenciesCache?: boolean;
  clearTsConfigCache?: boolean;
  fsEvents?: string[];
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
  htmlSuffixes?: string[];
  yamlSuffixes?: string[];
  cssAdditionalSuffixes?: string[];
  tsConfigPaths?: string[];
  jsTsExclusions?: string[];
  sources?: string[];
  inclusions?: string[];
  exclusions?: string[];
  tests?: string[];
  testInclusions?: string[];
  testExclusions?: string[];
  detectBundles?: boolean;
  createTSProgramForOrphanFiles?: boolean;
  disableTypeChecking?: boolean;
  skipNodeModuleLookupOutsideBaseDir?: boolean;
  ecmaScriptVersion?: string;
  reportNclocForTestFiles?: boolean;
};

// Patterns enforced to be ignored no matter what the user configures on sonar.properties
const IGNORED_PATTERNS = ['.scannerwork'];

const DEFAULT_JS_EXTENSIONS = ['.js', '.mjs', '.cjs', '.jsx', '.vue'];
const DEFAULT_TS_EXTENSIONS = ['.ts', '.mts', '.cts', '.tsx'];
const DEFAULT_CSS_EXTENSIONS = ['.css', '.less', '.scss', '.sass'];
const DEFAULT_HTML_EXTENSIONS = ['.html', '.htm', '.xhtml'];
const DEFAULT_YAML_EXTENSIONS = ['.yml', '.yaml'];
const DEFAULT_CSS_ADDITIONAL_EXTENSIONS = ['.vue', '.html', '.htm', '.xhtml'];
const DEFAULT_MAX_FILE_SIZE_KB = 1000; // 1MB, matches Java default in JavaScriptPlugin.java
const VUE_TS_REGEX = /<script[^>]+lang=['"]ts['"][^>]*>/;
const DEFAULT_ALLOW_TS_PARSER_JS_FILES = true;
const DEFAULT_ANALYSIS_MODE: AnalysisMode = 'DEFAULT';
const DEFAULT_SKIP_AST = true;
const DEFAULT_IGNORE_HEADER_COMMENTS = true;

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
  return createConfigurationFromInput({
    baseDir: raw.baseDir,
    canAccessFileSystem: isBoolean(raw.canAccessFileSystem) ? raw.canAccessFileSystem : undefined,
    sonarlint: isBoolean(raw.sonarlint) ? raw.sonarlint : undefined,
    clearDependenciesCache: isBoolean(raw.clearDependenciesCache)
      ? raw.clearDependenciesCache
      : undefined,
    clearTsConfigCache: isBoolean(raw.clearTsConfigCache) ? raw.clearTsConfigCache : undefined,
    fsEvents: sanitizeFsEvents(raw.fsEvents),
    allowTsParserJsFiles: isBoolean(raw.allowTsParserJsFiles)
      ? raw.allowTsParserJsFiles
      : undefined,
    analysisMode: isAnalysisMode(raw.analysisMode) ? raw.analysisMode : undefined,
    skipAst: isBoolean(raw.skipAst) ? raw.skipAst : undefined,
    ignoreHeaderComments: isBoolean(raw.ignoreHeaderComments)
      ? raw.ignoreHeaderComments
      : undefined,
    maxFileSize: isNumber(raw.maxFileSize) ? raw.maxFileSize : undefined,
    environments: isStringArray(raw.environments) ? raw.environments : undefined,
    globals: isStringArray(raw.globals) ? raw.globals : undefined,
    tsSuffixes: isStringArray(raw.tsSuffixes) ? raw.tsSuffixes : undefined,
    jsSuffixes: isStringArray(raw.jsSuffixes) ? raw.jsSuffixes : undefined,
    cssSuffixes: isStringArray(raw.cssSuffixes) ? raw.cssSuffixes : undefined,
    htmlSuffixes: isStringArray(raw.htmlSuffixes) ? raw.htmlSuffixes : undefined,
    yamlSuffixes: isStringArray(raw.yamlSuffixes) ? raw.yamlSuffixes : undefined,
    cssAdditionalSuffixes: isStringArray(raw.cssAdditionalSuffixes)
      ? raw.cssAdditionalSuffixes
      : undefined,
    tsConfigPaths: isStringArray(raw.tsConfigPaths) ? raw.tsConfigPaths : undefined,
    jsTsExclusions: isStringArray(raw.jsTsExclusions) ? raw.jsTsExclusions : undefined,
    sources: isStringArray(raw.sources) ? raw.sources : undefined,
    inclusions: isStringArray(raw.inclusions) ? raw.inclusions : undefined,
    exclusions: isStringArray(raw.exclusions) ? raw.exclusions : undefined,
    tests: isStringArray(raw.tests) ? raw.tests : undefined,
    testInclusions: isStringArray(raw.testInclusions) ? raw.testInclusions : undefined,
    testExclusions: isStringArray(raw.testExclusions) ? raw.testExclusions : undefined,
    detectBundles: isBoolean(raw.detectBundles) ? raw.detectBundles : undefined,
    createTSProgramForOrphanFiles: isBoolean(raw.createTSProgramForOrphanFiles)
      ? raw.createTSProgramForOrphanFiles
      : undefined,
    disableTypeChecking: isBoolean(raw.disableTypeChecking) ? raw.disableTypeChecking : undefined,
    skipNodeModuleLookupOutsideBaseDir: isBoolean(raw.skipNodeModuleLookupOutsideBaseDir)
      ? raw.skipNodeModuleLookupOutsideBaseDir
      : undefined,
    ecmaScriptVersion: isString(raw.ecmaScriptVersion) ? raw.ecmaScriptVersion : undefined,
    reportNclocForTestFiles: isBoolean(raw.reportNclocForTestFiles)
      ? raw.reportNclocForTestFiles
      : undefined,
  });
}

export function createConfigurationFromInput(input: ConfigurationInput): Configuration {
  if (!isAbsolutePath(input.baseDir)) {
    throw new Error(`baseDir is not an absolute path: ${input.baseDir}`);
  }
  // Normalize baseDir first so it can be used by other normalization functions
  const baseDir = normalizeToAbsolutePath(input.baseDir);
  return {
    baseDir,
    canAccessFileSystem: input.canAccessFileSystem ?? true,
    sonarlint: input.sonarlint ?? false,
    clearDependenciesCache: input.clearDependenciesCache ?? false,
    clearTsConfigCache: input.clearTsConfigCache ?? false,
    fsEvents: normalizeFsEvents(input.fsEvents, baseDir),
    allowTsParserJsFiles: input.allowTsParserJsFiles ?? DEFAULT_ALLOW_TS_PARSER_JS_FILES,
    analysisMode: input.analysisMode ?? DEFAULT_ANALYSIS_MODE,
    skipAst: input.skipAst ?? DEFAULT_SKIP_AST,
    ignoreHeaderComments: input.ignoreHeaderComments ?? DEFAULT_IGNORE_HEADER_COMMENTS,
    maxFileSize: input.maxFileSize ?? DEFAULT_MAX_FILE_SIZE_KB,
    environments: input.environments ?? DEFAULT_ENVIRONMENTS,
    globals: input.globals ?? DEFAULT_GLOBALS,
    tsSuffixes: input.tsSuffixes ?? DEFAULT_TS_EXTENSIONS,
    jsSuffixes: input.jsSuffixes ?? DEFAULT_JS_EXTENSIONS,
    cssSuffixes: input.cssSuffixes ?? DEFAULT_CSS_EXTENSIONS,
    htmlSuffixes: input.htmlSuffixes ?? DEFAULT_HTML_EXTENSIONS,
    yamlSuffixes: input.yamlSuffixes ?? DEFAULT_YAML_EXTENSIONS,
    cssAdditionalSuffixes: input.cssAdditionalSuffixes ?? DEFAULT_CSS_ADDITIONAL_EXTENSIONS,
    tsConfigPaths: sanitizePaths(input.tsConfigPaths, baseDir),
    jsTsExclusions: normalizeGlobs(
      (input.jsTsExclusions ?? DEFAULT_EXCLUSIONS).concat(IGNORED_PATTERNS),
      baseDir,
    ),
    sources: sanitizePaths(input.sources, baseDir),
    inclusions: normalizeGlobs(input.inclusions, baseDir),
    exclusions: normalizeGlobs(input.exclusions, baseDir),
    tests: sanitizePaths(input.tests, baseDir),
    testInclusions: normalizeGlobs(input.testInclusions, baseDir),
    testExclusions: normalizeGlobs(input.testExclusions, baseDir),
    detectBundles: input.detectBundles ?? true,
    createTSProgramForOrphanFiles: input.createTSProgramForOrphanFiles ?? true,
    disableTypeChecking: input.disableTypeChecking ?? false,
    skipNodeModuleLookupOutsideBaseDir: input.skipNodeModuleLookupOutsideBaseDir ?? false,
    ecmaScriptVersion: input.ecmaScriptVersion,
    reportNclocForTestFiles: input.reportNclocForTestFiles ?? false,
  };
}

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
/**
 * File suffix configuration for determining file types.
 */
export type FileSuffixes = {
  jsSuffixes: string[];
  tsSuffixes: string[];
  cssSuffixes: string[];
  htmlSuffixes: string[];
  yamlSuffixes: string[];
  cssAdditionalSuffixes: string[];
};

const DEFAULT_FILE_SUFFIXES: FileSuffixes = {
  jsSuffixes: DEFAULT_JS_EXTENSIONS,
  tsSuffixes: DEFAULT_TS_EXTENSIONS,
  cssSuffixes: DEFAULT_CSS_EXTENSIONS,
  htmlSuffixes: DEFAULT_HTML_EXTENSIONS,
  yamlSuffixes: DEFAULT_YAML_EXTENSIONS,
  cssAdditionalSuffixes: DEFAULT_CSS_ADDITIONAL_EXTENSIONS,
};

/**
 * Fields needed to filter files.
 */
export type FilterFileParams = FileSuffixes & {
  /** Whether to detect and skip bundled files */
  detectBundles: boolean;
  /** Maximum file size in KB (0 means no limit) */
  maxFileSize: number;
  /** JS/TS exclusion patterns from sonar.typescript.exclusions and sonar.javascript.exclusions */
  jsTsExclusions: Minimatch[];
};

/**
 * Extracts the parameters needed for shouldIgnoreFile from a Configuration.
 *
 * @param configuration - The Configuration instance
 * @returns FilterFileParams containing jsTsExclusions, detectBundles, maxFileSize, and file suffixes
 */
export function getShouldIgnoreParams(configuration: Configuration): FilterFileParams {
  return {
    jsTsExclusions: configuration.jsTsExclusions,
    detectBundles: configuration.detectBundles,
    maxFileSize: configuration.maxFileSize,
    jsSuffixes: configuration.jsSuffixes,
    tsSuffixes: configuration.tsSuffixes,
    cssSuffixes: configuration.cssSuffixes,
    htmlSuffixes: configuration.htmlSuffixes,
    yamlSuffixes: configuration.yamlSuffixes,
    cssAdditionalSuffixes: configuration.cssAdditionalSuffixes,
  };
}

/**
 * Fields needed to filter files by path and determine their file type.
 */

export interface FilterPathParams {
  /** sonar.sources - absolute paths to look for files */
  sourcesPaths: NormalizedAbsolutePath[];
  /** sonar.tests - absolute paths to look for test files */
  testPaths: NormalizedAbsolutePath[];
  /** sonar.inclusions - wildcards to narrow down sonar.sources */
  inclusions: Minimatch[];
  /** sonar.exclusions - wildcards to narrow down sonar.sources */
  exclusions: Minimatch[];
  /** sonar.test.inclusions - wildcards to narrow down sonar.tests */
  testInclusions: Minimatch[];
  /** sonar.test.exclusions - wildcards to narrow down sonar.tests */
  testExclusions: Minimatch[];
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

function isJsFile(
  filePath: NormalizedAbsolutePath,
  jsSuffixes: string[] = DEFAULT_JS_EXTENSIONS,
): boolean {
  return jsSuffixes.includes(extname(filePath).toLowerCase());
}

function isTsFile(
  filePath: NormalizedAbsolutePath,
  contents: string,
  tsSuffixes: string[] = DEFAULT_TS_EXTENSIONS,
): boolean {
  const extension = extname(filePath).toLowerCase();
  return (
    tsSuffixes.includes(extension) || (extension.endsWith('.vue') && VUE_TS_REGEX.test(contents))
  );
}

export function inferLanguage(
  explicit: JsTsLanguage | undefined,
  filePath: NormalizedAbsolutePath,
  fileContent: string,
  jsSuffixes: string[] = DEFAULT_JS_EXTENSIONS,
  tsSuffixes: string[] = DEFAULT_TS_EXTENSIONS,
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

export function isHtmlFile(
  filePath: NormalizedAbsolutePath,
  htmlSuffixes: string[] = DEFAULT_HTML_EXTENSIONS,
): boolean {
  return htmlSuffixes.includes(extname(filePath).toLowerCase());
}

export function isYamlFile(
  filePath: NormalizedAbsolutePath,
  contents?: string,
  yamlSuffixes: string[] = DEFAULT_YAML_EXTENSIONS,
): boolean {
  if (!yamlSuffixes.includes(extname(filePath).toLowerCase())) {
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
  suffixes: Pick<FileSuffixes, 'jsSuffixes' | 'tsSuffixes'> = DEFAULT_FILE_SUFFIXES,
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

export function isAlsoCssFile(
  filePath: NormalizedAbsolutePath,
  cssAdditionalSuffixes: string[] = DEFAULT_CSS_ADDITIONAL_EXTENSIONS,
): boolean {
  return cssAdditionalSuffixes.includes(extname(filePath).toLowerCase());
}

export function isAnalyzableFile(
  filePath: NormalizedAbsolutePath,
  suffixes: FileSuffixes = DEFAULT_FILE_SUFFIXES,
): boolean {
  return (
    isHtmlFile(filePath, suffixes.htmlSuffixes) ||
    isYamlFile(filePath, undefined, suffixes.yamlSuffixes) ||
    isJsTsFile(filePath, suffixes) ||
    isCssFile(filePath, suffixes.cssSuffixes) ||
    isAlsoCssFile(filePath, suffixes.cssAdditionalSuffixes)
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
  if (isStringArray(raw)) {
    return raw.map(key => normalizeToAbsolutePath(key, baseDir));
  }
  if (!isObject(raw)) {
    return [];
  }
  return Object.keys(raw).map(key => normalizeToAbsolutePath(key, baseDir));
}

function sanitizeFsEvents(raw: unknown): string[] | undefined {
  if (isStringArray(raw)) {
    return raw;
  }
  if (!isObject(raw)) {
    return undefined;
  }
  return Object.keys(raw);
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
  shouldIgnoreParams: FilterFileParams;
  createTSProgramForOrphanFiles: boolean;
  disableTypeChecking: boolean;
  skipNodeModuleLookupOutsideBaseDir: boolean;
  ecmaScriptVersion?: string /* sonar.javascript.ecmaScriptVersion */;
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
    skipNodeModuleLookupOutsideBaseDir: configuration.skipNodeModuleLookupOutsideBaseDir,
    ecmaScriptVersion: configuration.ecmaScriptVersion,
    reportNclocForTestFiles: configuration.reportNclocForTestFiles,
  };
}
