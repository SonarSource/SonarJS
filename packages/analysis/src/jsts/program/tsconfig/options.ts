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
import ts from 'typescript';
import selectProvider from 'typescript/selection';
import { debug, error } from '../../../../../shared/src/helpers/logging.js';
import {
  getNodeVersionSignal,
  getTypeScriptVersionSignal,
} from '../../rules/helpers/dependency-manifests/dependencies.js';
import { getClosestDependencyManifestDir } from '../../rules/helpers/dependency-manifests/closest.js';
import { dirnamePath } from '../../rules/helpers/files.js';
import { dirname } from 'node:path/posix';
import { getTsConfigContentCache } from '../cache/tsconfigCache.js';
import { isLastTsConfigCheck, isRootNodeModules } from './utils.js';
import { getCachedProgramOptions, setCachedProgramOptions } from '../cache/programOptionsCache.js';
import { sourceFileStore } from '../../../file-stores/index.js';
import {
  isAbsolutePath,
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../../../../shared/src/helpers/files.js';
import { intersects } from 'semver';

/**
 * Unique symbol to brand ProgramOptions, ensuring they can only be created
 * by createProgramOptions() and not manually constructed.
 */
const PROGRAM_OPTIONS_BRAND: unique symbol = Symbol('ProgramOptions');

/**
 * Program options that must be created via createProgramOptions().
 * The brand ensures compile-time type safety, preventing raw compiler options
 * from being used where properly processed ProgramOptions are required.
 */
export type ProgramOptions = ts.CreateProgramOptions & {
  missingTsConfig: boolean;
  [PROGRAM_OPTIONS_BRAND]: true;
};

type CustomParseConfigHost = {
  missingTsConfig: () => boolean;
} & ts.ParseConfigHost;

/**
 * Default compiler options used when tsconfig doesn't specify them.
 * lib is not preset here — computeLibJson computes it from project signals
 * and falls back to esnext when none are found.
 */
export const defaultCompilerOptions: ts.CompilerOptions = {
  allowJs: true,
  noImplicitAny: true,
  // Keep explicit non-strict defaults for fallback program creation paths.
  // TS6 strictness defaults are handled when parsing project tsconfig options.
  strict: false,
};

const STRICTNESS_COMPILER_OPTIONS = [
  'strict',
  'alwaysStrict',
  'noImplicitAny',
  'noImplicitThis',
  'strictBindCallApply',
  'strictBuiltinIteratorReturn',
  'strictFunctionTypes',
  'strictNullChecks',
  'strictPropertyInitialization',
  'useUnknownInCatchVariables',
] as const;
type StrictnessCompilerOption = (typeof STRICTNESS_COMPILER_OPTIONS)[number];

/**
 * Node.js major version to ES year mapping (descending order for lookup).
 */
const NODE_TO_ES: [number, number][] = [
  [22, 2024],
  [20, 2023],
  [18, 2022],
  [16, 2021],
  [14, 2020],
  [12, 2019],
  [10, 2018],
  [8, 2017],
];

const MIN_FIXED_ES_YEAR = 2015;
const MAX_FIXED_ES_YEAR = 2030;
const LAST_PRE_ES2015_YEAR = MIN_FIXED_ES_YEAR - 1;

function isFixedEsYear(year: number): boolean {
  return year >= MIN_FIXED_ES_YEAR && year <= MAX_FIXED_ES_YEAR;
}

/**
 * Parses a version string and returns the highest Node.js major version found.
 * Handles ranges like ">=16 || >=18", "^18.0.0", "14.x", etc.
 * Exported for testing purposes.
 *
 * @param versionStr version string to parse
 * @returns highest major version number >= 8 and < 100, or null if none found
 */
export function parseMaxNodeMajor(versionStr: string): number | null {
  if (!versionStr || versionStr === '*' || versionStr === 'latest') {
    return null;
  }
  const nums = [...versionStr.matchAll(/(\d+)(?:\.\d+)*/g)]
    .map(m => Number.parseInt(m[1], 10))
    .filter(n => n >= 8 && n < 100);
  if (!nums.length) {
    return null;
  }
  return Math.max(...nums);
}

/**
 * Maps a Node.js major version to the corresponding ES year.
 *
 * @param major Node.js major version number
 * @returns ES year supported by that Node.js version
 */
export function nodeVersionToEs(major: number): number {
  for (const [nodeMajor, esYear] of NODE_TO_ES) {
    if (major >= nodeMajor) {
      return esYear;
    }
  }
  return 2017; // fallback for very old Node versions
}

function addExplicitStrictnessCompilerOptions(
  compilerOptions: unknown,
  explicitOptions: Set<StrictnessCompilerOption>,
) {
  if (!compilerOptions || typeof compilerOptions !== 'object') {
    return;
  }
  const options = compilerOptions as Record<string, unknown>;
  for (const optionName of STRICTNESS_COMPILER_OPTIONS) {
    if (Object.hasOwn(options, optionName)) {
      explicitOptions.add(optionName);
    }
  }
}

function getCompilerOptions(config: unknown): unknown {
  if (!config || typeof config !== 'object') {
    return undefined;
  }
  return (config as { compilerOptions?: unknown }).compilerOptions;
}

function getExplicitStrictnessCompilerOptions(
  rootConfig: unknown,
  extendedConfigCache: Map<string, ts.ExtendedConfigCacheEntry>,
) {
  const explicitOptions = new Set<StrictnessCompilerOption>();

  addExplicitStrictnessCompilerOptions(getCompilerOptions(rootConfig), explicitOptions);
  for (const entry of extendedConfigCache.values()) {
    addExplicitStrictnessCompilerOptions(
      getCompilerOptions(entry.extendedConfig?.raw),
      explicitOptions,
    );
  }

  return explicitOptions;
}

function isTypeScriptVersionDefinitelyBelow6(versionRange: string) {
  try {
    const options = { includePrerelease: true };
    const supportsBelow6 = intersects(versionRange, '<6.0.0-0', options);
    const supports6OrAbove = intersects(versionRange, '>=6.0.0-0', options);
    return supportsBelow6 && !supports6OrAbove;
  } catch {
    return false;
  }
}

function shouldApplyLegacyStrictnessDefaults(baseDir?: NormalizedAbsolutePath) {
  if (!baseDir) {
    return false;
  }
  const versionSignal = getTypeScriptVersionSignal(baseDir);
  if (!versionSignal) {
    return false;
  }
  return isTypeScriptVersionDefinitelyBelow6(versionSignal);
}

function applyLegacyStrictnessDefaults(
  parsedConfigFile: ts.ParsedCommandLine,
  rootConfig: unknown,
  extendedConfigCache: Map<string, ts.ExtendedConfigCacheEntry>,
) {
  const explicitOptions = getExplicitStrictnessCompilerOptions(rootConfig, extendedConfigCache);

  // If strict is explicitly configured (including via extends), TypeScript already applies
  // the expected defaults for strict sub-options.
  if (explicitOptions.has('strict')) {
    return;
  }

  const compilerOptions = parsedConfigFile.options as Record<string, unknown>;
  for (const optionName of STRICTNESS_COMPILER_OPTIONS) {
    if (!explicitOptions.has(optionName)) {
      compilerOptions[optionName] = false;
    }
  }
}

// These options already have no effect in TS6. TS7 dropped their config names;
// retain the rest of an existing project's configuration instead of falling back.
const REMOVED_COMPILER_OPTIONS = new Set([
  'importsNotUsedAsValues',
  'out',
  'charset',
  'noImplicitUseStrict',
  'suppressExcessPropertyErrors',
  'suppressImplicitAnyIndexErrors',
  'noStrictGenericChecks',
  'preserveValueImports',
  'keyofStringsOnly',
]);
function retainCrossVersionConfigDiagnostic(diagnostic: ts.Diagnostic): boolean {
  if (diagnostic.code !== 5023 || typeof diagnostic.messageText !== 'string') return true;
  const option = /^Unknown compiler option '([^']+)'\.$/.exec(diagnostic.messageText)?.[1];
  return option === undefined || !REMOVED_COMPILER_OPTIONS.has(option);
}

/** Keep project resolution semantics across compilers which no longer support baseUrl. */
export function applyCrossVersionCompilerOptions(
  options: ts.CompilerOptions,
  legacyModuleResolution = selectProvider().legacyModuleResolution !== false,
): ts.CompilerOptions {
  // The classic CompilerHost does not redirect referenced declaration outputs to
  // source files. Match that default in native programs so each referenced source
  // is analyzed with its own config, including our cross-version option policy.
  if (options.disableSourceOfProjectReferenceRedirect === undefined)
    options = { ...options, disableSourceOfProjectReferenceRedirect: true };
  if (
    !legacyModuleResolution &&
    (options.moduleResolution === ts.ModuleResolutionKind.Classic ||
      options.moduleResolution === ts.ModuleResolutionKind.Node10)
  ) {
    // TS7 removed both legacy resolvers. Bundler + Preserve supports extension
    // probing and the old package entry-point policy without enabling exports.
    options = {
      ...options,
      module: ts.ModuleKind.Preserve,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      resolvePackageJsonExports: options.resolvePackageJsonExports ?? false,
      resolvePackageJsonImports: options.resolvePackageJsonImports ?? false,
    };
  }
  const { baseUrl, ...rest } = options;
  if (baseUrl === undefined) {
    return options;
  }

  // Config parsing has already resolved baseUrl relative to the config declaring it,
  // including inherited configs. Anchor substitutions before removing that origin.
  // Do not collapse '..' here: a preceding '*' may substitute multiple directories.
  const baseUrlPrefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const fromBaseUrl = (target: string) =>
    isAbsolutePath(target) ? target : baseUrlPrefix + target;
  const paths = Object.fromEntries(
    Object.entries(options.paths ?? {}).map(([pattern, substitutions]) => [
      pattern,
      [...substitutions.map(fromBaseUrl), fromBaseUrl(pattern)],
    ]),
  );
  // TypeScript tries baseUrl after a matching paths pattern fails as well as when
  // no pattern matches. Append the fallback to every pattern, preserving priority.
  paths['*'] ??= [fromBaseUrl('*')];
  return { ...rest, paths };
}

function esYearFromEsPrefix(ecmaScriptVersion: string): number | null {
  const match = /^ES(\d{4})$/i.exec(ecmaScriptVersion);
  if (!match) {
    return null;
  }
  const year = Number.parseInt(match[1], 10);
  return isFixedEsYear(year) ? year : null;
}

/**
 * Maps a raw tsconfig JSON target string to an effective ES year for lib selection.
 *
 * ES3/ES5 map to 2020 because TypeScript's default lib.d.ts for these targets
 * includes APIs up to ES2020 (it assumes polyfills are in use).
 * Returns null for ESNext/JSON targets (handled as esnext fallback).
 */
function targetStringToEsYear(target: string): number | null {
  const upper = target.toUpperCase();
  if (upper === 'ESNEXT' || upper === 'JSON') {
    return null;
  }
  if (upper === 'ES3' || upper === 'ES5') {
    return 2020;
  }
  const match = /^ES(\d{4})$/.exec(upper);
  if (match) {
    const year = Number.parseInt(match[1], 10);
    if (isFixedEsYear(year)) {
      return year;
    }
  }
  return null;
}

function targetOptionToString(target: ts.ScriptTarget | undefined): string | undefined {
  return target === undefined ? undefined : ts.ScriptTarget[target];
}

/**
 * Maps a raw TypeScript compiler target to a comparable ES year for rule gating.
 *
 * Legacy ES3/ES5 targets are treated as pre-ES2015 so any year-based requirement
 * stays conservatively disabled. ESNext/JSON return null because they do not carry
 * a fixed runtime-compatibility floor.
 *
 * @param target raw TypeScript compiler target
 * @returns ES year or null when no fixed year applies
 */
export function tsTargetToEsYear(target: ts.ScriptTarget | undefined): number | null {
  const targetName = targetOptionToString(target)?.toUpperCase();
  if (!targetName || targetName === 'ESNEXT' || targetName === 'JSON') {
    return null;
  }
  if (targetName === 'ES3' || targetName === 'ES5') {
    return LAST_PRE_ES2015_YEAR;
  }
  const match = /^ES(\d{4})$/.exec(targetName);
  if (!match) {
    return null;
  }
  const year = Number.parseInt(match[1], 10);
  return isFixedEsYear(year) ? year : null;
}

/**
 * Extracts the ES year from a normalized TypeScript lib array.
 * Returns null for esnext (no ES version restriction applies).
 *
 * @param lib normalized lib file names (e.g. ['lib.es2022.d.ts', 'lib.dom.d.ts'])
 * @returns ES year (e.g. 2022) or null if esnext/not found
 */
export function esLibToYear(lib: string[] | undefined): number | null {
  if (!lib) {
    return null;
  }
  // esnext means no ES version restriction — return null regardless of other entries
  if (lib.some(entry => /lib\.esnext(\..*)?\.d\.ts$/.test(entry))) {
    return null;
  }
  let maxYear: number | null = null;
  for (const entry of lib) {
    const match = /lib\.es(\d{4})(\..*)?\.d\.ts$/.exec(entry);
    if (match) {
      const year = Number.parseInt(match[1], 10);
      if (maxYear === null || year > maxYear) {
        maxYear = year;
      }
    }
  }
  return maxYear;
}

/**
 * Computes the best lib JSON string array for the project from available signals,
 * returning values suitable for passing directly to createProgramOptionsFromJson
 * or injecting into a raw tsconfig JSON before ts.parseJsonConfigFileContent.
 * See https://www.typescriptlang.org/tsconfig/#lib.
 *
 * ## Background: target vs lib
 *
 * TypeScript separates two independent concerns:
 * - `target` controls *output syntax* (e.g. ES5 → transpile classes, arrow functions, etc.)
 * - `lib` controls *type definitions* — what built-in APIs TypeScript knows about
 *
 * ## Why we take the maximum
 *
 * Two signals are relevant: `tsconfig.target` and the Node.js version inferred from
 * package.json (`@types/node`, `engines.node`, `.nvmrc`).
 *
 * Neither signal alone is sufficient:
 * - target alone misses the case where a project compiles to ES5 for broad browser
 *   support but runs on Node 22 at build time, where modern APIs (e.g. `Array.at()`)
 *   are available. Using target ES5 → ES2020 would suppress valid findings.
 * - node signals alone miss the case where target is set to ES2022 but the only
 *   package.json node signal is `@types/node@16` (ES2021), which would suppress valid
 *   ES2022 findings (e.g. `Array.at()` which requires `lib.es2022.array.d.ts`).
 *
 * ## Resolution order
 * 1. `sonar.javascript.ecmaScriptVersion` override → always wins when provided
 * 2. max(tsconfig.target, package.json node signals) → use the higher ES year
 * 3. esnext fallback when no signals are found at all
 *
 * @param ecmaScriptVersion explicit ES version override from sonar.javascript.ecmaScriptVersion
 * @param targetJson tsconfig target string (raw or post-extends-resolved, e.g. 'ES2022', 'ES5', 'ESNext')
 * @param packageDir directory to start the upward search for the closest package.json
 *   carrying a Node.js signal (typically the tsconfig directory or an orphan file's directory)
 * @param baseDir analysis base directory; upper bound for the upward walk. Defaults to
 *   `packageDir` for backward compatibility with single-arg call sites.
 * @returns raw JSON lib string array (e.g. ['es2022', 'dom'])
 */
export function computeLibJson(
  ecmaScriptVersion: string | undefined,
  targetJson: string | undefined,
  packageDir: NormalizedAbsolutePath,
  baseDir: NormalizedAbsolutePath = packageDir,
): string[] {
  if (ecmaScriptVersion) {
    const year = esYearFromEsPrefix(ecmaScriptVersion);
    if (year) {
      return [`es${year}`, 'dom'];
    }
  }

  const years: number[] = [];

  if (targetJson) {
    const year = targetStringToEsYear(targetJson);
    if (year !== null) {
      years.push(year);
    }
  }

  const nodeSignal = getNodeVersionSignal(packageDir, baseDir);
  if (nodeSignal) {
    const major = parseMaxNodeMajor(nodeSignal);
    if (major !== null) {
      years.push(nodeVersionToEs(major));
    }
  }

  if (years.length === 0) {
    return ['esnext', 'dom'];
  }

  return [`es${Math.max(...years)}`, 'dom'];
}

type LibGroup = {
  lib: string[];
  libKey: string;
  files: NormalizedAbsolutePath[];
};

/**
 * Buckets a set of files by the `lib` each one resolves to (via its closest
 * package.json's Node.js signal). Files producing the same lib share a bucket;
 * files in packages with different signals end up in separate buckets, so the
 * caller can build one TypeScript program per bucket and avoid leaking the
 * wrong lib across packages in a monorepo.
 *
 * Cheap by construction: each unique pkgDir runs `computeLibJson` once.
 */
export function groupFilesByResolvedLib(
  files: Iterable<NormalizedAbsolutePath>,
  baseDir: NormalizedAbsolutePath,
  ecmaScriptVersion: string | undefined,
): LibGroup[] {
  const libByPkgDir = new Map<NormalizedAbsolutePath, { lib: string[]; libKey: string }>();
  const groups = new Map<string, LibGroup>();

  for (const file of files) {
    const pkgDir = getClosestDependencyManifestDir(dirnamePath(file), baseDir) ?? baseDir;
    let cached = libByPkgDir.get(pkgDir);
    if (!cached) {
      const lib = computeLibJson(ecmaScriptVersion, undefined, pkgDir, baseDir);
      cached = { lib, libKey: lib.join('|') };
      libByPkgDir.set(pkgDir, cached);
    }
    let bucket = groups.get(cached.libKey);
    if (!bucket) {
      bucket = { lib: cached.lib, libKey: cached.libKey, files: [] };
      groups.set(cached.libKey, bucket);
    }
    bucket.files.push(file);
  }
  return [...groups.values()];
}

/**
 * Creates a ParseConfigHost that uses either TypeScript's file system APIs
 * or the sourceFileStore based on the canAccessFileSystem parameter.
 *
 * @param canAccessFileSystem - Whether file system access is available
 * @returns A CustomParseConfigHost configured for the appropriate access mode
 */
function createBaseParseConfigHost(canAccessFileSystem: boolean): CustomParseConfigHost {
  return {
    useCaseSensitiveFileNames: true,
    directoryExists(directory: string): boolean {
      return canAccessFileSystem
        ? ts.sys.directoryExists(directory)
        : Object.keys(sourceFileStore.getFiles()).some(file =>
            file.startsWith(`${normalizeToAbsolutePath(directory)}/`),
          );
    },
    getDirectories(directory: string): string[] {
      if (canAccessFileSystem) return ts.sys.getDirectories(directory);
      const root = normalizeToAbsolutePath(directory);
      const files = Object.keys(sourceFileStore.getFiles()).filter(file =>
        file.startsWith(`${root}/`),
      );
      return [
        ...new Set(
          files
            .map(file => file.slice(root.length + 1).split('/'))
            .filter(parts => parts.length > 1)
            .map(parts => `${root}/${parts[0]}`),
        ),
      ];
    },
    readDirectory(
      rootDir: string,
      extensions: readonly string[],
      excludes: readonly string[] | undefined,
      includes: readonly string[],
      depth?: number,
    ): readonly string[] {
      if (canAccessFileSystem) {
        return ts.sys.readDirectory(rootDir, extensions, excludes, includes, depth);
      } else {
        const normalizedDir = normalizeToAbsolutePath(rootDir);
        const entries = sourceFileStore.getFilesInDirectory(normalizedDir) ?? [];
        return [...entries]
          .filter(f => !extensions || extensions.some(ext => f.endsWith(ext)))
          .map(file => `${normalizedDir}/${file}`);
      }
    },
    fileExists(path: string): boolean {
      if (canAccessFileSystem) {
        return ts.sys.fileExists(path);
      } else {
        const normalizedPath = normalizeToAbsolutePath(path);
        return normalizedPath in sourceFileStore.getFiles();
      }
    },
    readFile(path: string): string | undefined {
      if (canAccessFileSystem) {
        return ts.sys.readFile(path);
      } else {
        const normalizedPath = normalizeToAbsolutePath(path);
        return sourceFileStore.getFiles()[normalizedPath]?.fileContent;
      }
    },
    missingTsConfig: () => false,
  };
}

export function createProgramOptionsFromJson(
  json: any,
  rootNames: NormalizedAbsolutePath[],
  baseDir: string,
): ProgramOptions {
  const converted = ts.convertCompilerOptionsFromJson(json, baseDir);
  return {
    configFileParsingDiagnostics: converted.errors.filter(retainCrossVersionConfigDiagnostic),
    options: applyCrossVersionCompilerOptions(converted.options),
    rootNames,
    missingTsConfig: false,
    [PROGRAM_OPTIONS_BRAND]: true,
  };
}

/**
 * Restores compiler options that were already normalized by TypeScript during a prior analysis.
 * Unlike createProgramOptionsFromJson, this intentionally does not convert enum values or lib
 * filenames a second time.
 */
export function createProgramOptionsFromEffectiveOptions(
  options: ts.CompilerOptions,
  rootNames: NormalizedAbsolutePath[],
): ProgramOptions {
  return {
    options: applyCrossVersionCompilerOptions(options),
    rootNames,
    missingTsConfig: false,
    [PROGRAM_OPTIONS_BRAND]: true,
  };
}
/**
 * Gets the files resolved by a TSConfig
 *
 * The resolving of the files for a given TSConfig file is done
 * by invoking the TypeScript compiler.
 *
 * @param tsConfig TSConfig to parse
 * @param tsconfigContents TSConfig contents that we want to provide to TSConfig
 * @param canAccessFileSystem Whether file system access is available.
 *        Callers should pass the result of canAccessFileSystem() from analysis/src/common/configuration.js
 * @returns the resolved TSConfig files
 */
export function createProgramOptions(
  tsConfig: string,
  tsconfigContents: string | undefined,
  canAccessFileSystem: boolean,
  ecmaScriptVersion?: string,
  baseDir?: NormalizedAbsolutePath,
): ProgramOptions {
  // Check cache first
  const cached = getCachedProgramOptions(tsConfig, tsconfigContents);
  if (cached) {
    return cached;
  }

  let missingTsConfig = false;
  const tsconfigContentCache = getTsConfigContentCache();
  const baseParseConfigHost = createBaseParseConfigHost(canAccessFileSystem);

  // Set up parseConfigHost with tsconfig-specific logic (caching, missing file handling)
  const parseConfigHost: CustomParseConfigHost = {
    useCaseSensitiveFileNames: true,
    directoryExists: directory =>
      directory.includes('/node_modules') ||
      isRootNodeModules(directory) ||
      baseParseConfigHost.directoryExists!(directory),
    getDirectories: baseParseConfigHost.getDirectories,
    readDirectory: baseParseConfigHost.readDirectory,
    fileExists: file => {
      debug(`TSConfig lookup while parsing ${tsConfig}: checking ${file}`);
      // When TypeScript checks for the very last tsconfig.json, we will always return true,
      // If the file does not exist in FS, we will return an empty configuration
      if (tsconfigContentCache.has(file) || isLastTsConfigCheck(file)) {
        return true;
      }
      return baseParseConfigHost.fileExists(file);
    },
    readFile: file => {
      // 1. Check if we have specific content provided for this file
      if (tsConfig && file === tsConfig && typeof tsconfigContents === 'string') {
        return tsconfigContents;
      }

      // 2. Check cache first
      if (tsconfigContentCache.has(file)) {
        const cachedTsConfig = tsconfigContentCache.get(file)!;
        missingTsConfig ||= cachedTsConfig.missing;
        return cachedTsConfig.contents;
      }

      // 3. Read from filesystem or sourceFileStore (depending on canAccessFileSystem)
      const fileContents = baseParseConfigHost.readFile(file);

      // 4. Handle missing extended tsconfig (return empty config)
      if (!fileContents && isLastTsConfigCheck(file)) {
        missingTsConfig = true;
        debug(
          `Could not resolve an extended tsconfig while parsing ${tsConfig}. Last lookup path: ${file}; using an empty configuration.`,
        );
        const emptyConfig = '{}';
        tsconfigContentCache.set(file, { contents: emptyConfig, missing: true });
        return emptyConfig;
      }

      // 5. Cache the content if found
      if (fileContents) {
        tsconfigContentCache.set(file, { contents: fileContents, missing: false });
      }

      return fileContents;
    },
    missingTsConfig: () => missingTsConfig,
  };

  // Read the tsconfig file
  const config = ts.readConfigFile(tsConfig, parseConfigHost.readFile);

  if (config.error) {
    error(`Failed to parse tsconfig: ${tsConfig} (${diagnosticToString(config.error)})`);
    throw new Error(diagnosticToString(config.error));
  }

  const extendedConfigCache = new Map<string, ts.ExtendedConfigCacheEntry>();
  const parsedConfigFile = ts.parseJsonConfigFileContent(
    config.config,
    parseConfigHost,
    dirname(tsConfig),
    {
      noEmit: true,
      allowNonTsExtensions: true,
    },
    tsConfig,
    undefined,
    [
      {
        extension: 'vue',
        isMixedContent: true,
        scriptKind: ts.ScriptKind.Deferred,
      },
    ],
    extendedConfigCache,
  );

  if (shouldApplyLegacyStrictnessDefaults(baseDir)) {
    applyLegacyStrictnessDefaults(parsedConfigFile, config.config, extendedConfigCache);
  }

  parsedConfigFile.options = applyCrossVersionCompilerOptions(parsedConfigFile.options);

  // Enrich with computed lib if not set by the tsconfig or any extended config.
  // Checked after parsing so that inherited lib settings are respected.
  // Uses ts.convertCompilerOptionsFromJson to convert raw JSON strings to TypeScript's
  // internal format, avoiding hardcoded lib file names.
  if (baseDir && !parsedConfigFile.options.lib) {
    // Anchor the Node.js signal lookup at the tsconfig's package, not the analysis root,
    // so nested packages in a monorepo get their own signal. When the tsconfig path is
    // not nested under baseDir (e.g. virtual/relative paths used in tests), fall back to
    // the analysis root.
    const tsconfigDir = normalizeToAbsolutePath(dirname(tsConfig));
    const tsconfigDirUnderBase =
      tsconfigDir === baseDir || (tsconfigDir + '/').startsWith(baseDir + '/');
    const packageDir = tsconfigDirUnderBase
      ? (getClosestDependencyManifestDir(tsconfigDir, baseDir) ?? baseDir)
      : baseDir;
    const jsonLib = computeLibJson(
      ecmaScriptVersion,
      targetOptionToString(parsedConfigFile.options.target),
      packageDir,
      baseDir,
    );
    const { options: libOptions } = ts.convertCompilerOptionsFromJson({ lib: jsonLib }, baseDir);
    parsedConfigFile.options.lib = libOptions.lib;
  }

  // Filter diagnostics by severity
  const diagnostics = parsedConfigFile.errors.filter(retainCrossVersionConfigDiagnostic);
  const errors = diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error);

  // Throw on fatal errors but preserve warnings/messages for the program to report
  if (errors.length > 0) {
    const message = errors.map(diagnosticToString).join('; ');
    throw new Error(message);
  }

  const result = {
    rootNames: parsedConfigFile.fileNames,
    options: parsedConfigFile.options,
    projectReferences: parsedConfigFile.projectReferences,
    configFileParsingDiagnostics: diagnostics, // Preserve other errors, warnings and messages.
    missingTsConfig: parseConfigHost.missingTsConfig(),
    [PROGRAM_OPTIONS_BRAND]: true,
  } as const;

  setCachedProgramOptions(tsConfig, result, tsconfigContents);

  return result;
}

function diagnosticToString(diagnostic: ts.Diagnostic): string {
  const text =
    typeof diagnostic.messageText === 'string'
      ? diagnostic.messageText
      : diagnostic.messageText.messageText;
  if (diagnostic.file) {
    return `${text}  ${diagnostic.file?.fileName}:${diagnostic.start}`;
  } else {
    return text;
  }
}
