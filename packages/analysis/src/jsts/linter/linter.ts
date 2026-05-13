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
import { debug } from '../../../../shared/src/helpers/logging.js';
import { type Rule, Linter as ESLintLinter, type SourceCode } from 'eslint';
import type { RuleConfig } from './config/rule-config.js';
import type { JsTsLanguage } from '../../common/configuration.js';
import { transformMessages } from './issues/transform.js';
import * as internalRules from '../rules/rules.js';
import {
  normalizePath,
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
  dirnamePath,
} from '../../../../shared/src/helpers/files.js';
import { createOptions } from './pragmas.js';
import path from 'node:path';
import type { ParseResult } from '../parsers/parse.js';
import type { AnalysisMode, FileStatus } from '../analysis/analysis.js';
import globalsPkg from 'globals';
import { APIError } from '../../contracts/error.js';
import { pathToFileURL } from 'node:url';
import * as ruleMetas from '../rules/metas.js';
import { extname } from 'node:path/posix';
import { defaultOptions, applyTransformations } from '../rules/helpers/configs.js';
import type { SonarMeta } from '../rules/helpers/generate-meta.js';
import merge from 'lodash.merge';
import {
  getDependencies,
  getModuleType,
  setCurrentFileInlineDependencies,
  withCurrentFileInlineDependencies,
} from '../rules/helpers/dependency-manifests/dependencies.js';
import {
  DEPENDENCY_INDEPENDENT_RULE_FILTERS,
  DEPENDENCY_SENSITIVE_RULE_FILTERS,
  type RuleFilterContext,
} from './filters/index.js';
import { getClosestDependencyManifestDir } from '../rules/helpers/dependency-manifests/closest.js';
import { getOptionalProjectAnalysisTelemetryCollector } from '../../telemetry.js';
import type { FileType } from '../../contracts/file.js';
import { clearFileCaches, getCurrentFileImports } from '../rules/helpers/module.js';
import { parseInlineNPMImport } from '../rules/helpers/dependency-manifests/resolvers/deno.js';
import type { DependenciesList } from '../rules/helpers/dependency-manifests/resolvers/types.js';

interface InitializeParams {
  rules?: RuleConfig[];
  environments?: string[];
  globals?: string[];
  baseDir: NormalizedAbsolutePath;
  bundles?: NormalizedAbsolutePath[];
  rulesWorkdir?: NormalizedAbsolutePath;
}

interface LintOptions {
  additionalSettings?: Record<string, unknown>;
  additionalRules?: ESLintLinter.RulesRecord;
}

/**
 * A singleton ESLint linter
 *
 * The linter is expected to be initialized before use.
 *
 * The purpose of the wrapper is to configure the behaviour of ESLint linter,
 * which includes:
 *
 * - defining the rules that should be used during linting,
 * - declaring globals that need to be considered as such
 * - defining the environments bringing a set of predefined variables
 *
 * Because some rules target main files while other target test files (or even
 * both), the wrapper relies on linting configurations to decide which set
 * of rules should be considered during linting.
 *
 * Last but not least, the linter eventually turns ESLint problems,
 * also known as messages, into SonarQube issues.
 */
export class Linter {
  /**
   * The ESLint linter
   */
  private static linter: ESLintLinter;
  /**
   * internal rules: rules in the packages/analysis/src/jsts/rules folder
   */
  public static readonly rules: Record<string, Rule.RuleModule> = { ...internalRules };

  /** The rules configuration */
  private static ruleConfigs: RuleConfig[] | undefined;
  /** Rule configurations for each file context, for rules whose activation does not depend on dependencies */
  public static readonly dependencyIndependentRulesCache: Map<string, ESLintLinter.RulesRecord> =
    new Map();
  /** Rules whose activation still depends on dependencies */
  public static readonly dependencySensitiveRulesCache: Map<string, RuleConfig[]> = new Map();
  /** The global variables */
  public static readonly globals: Map<string, ESLintLinter.GlobalConf> = new Map();
  /** The rules working directory (used for architecture, dbd...) */
  private static rulesWorkdir?: NormalizedAbsolutePath;
  private static baseDir: NormalizedAbsolutePath;

  /** Linter is a static class and cannot be instantiated */
  private constructor() {
    if (this instanceof Linter) {
      throw new TypeError('Linter class cannot be instantiated.');
    }
  }

  /**
   * Initializes the global linter
   * The working directory of the ESLint Linter needs to be configured to a path
   * that contains all files that will be analyzed, as the linter.verify process
   * will ignore any file external to that path:
   * https://github.com/eslint/rewrite/blob/0e09a420009796ceb4157ebe0dcee1348fdc4b75/packages/config-array/src/config-array.js#L865
   *
   * @param rules the active quality profile rules
   * @param environments the JavaScript execution environments
   * @param globals the global variables
   * @param bundles paths to external rule bundles to import
   * @param baseDir the working directory
   * @param rulesWorkdir the working directory for rules accessing FS (architecture, dbd)
   */
  static async initialize({
    rules,
    environments = [],
    globals = [],
    bundles = [],
    baseDir,
    rulesWorkdir,
  }: InitializeParams) {
    debug(`Initializing linter with ${rules?.map(rule => rule.key)}`);
    Linter.ruleConfigs = rules;
    Linter.linter = new ESLintLinter({ cwd: baseDir });
    Linter.rulesWorkdir = rulesWorkdir;
    Linter.setGlobals(globals, environments);
    Linter.dependencyIndependentRulesCache.clear();
    Linter.dependencySensitiveRulesCache.clear();
    Linter.baseDir = baseDir;
    /**
     * Context bundles define a set of external custom rules (like the architecture rule)
     * including rule keys and rule definitions that cannot be provided to the linter
     * using the same feeding channel as rules from the active quality profile.
     */
    for (const ruleBundle of bundles) {
      await Linter.loadRulesFromBundle(ruleBundle);
    }
  }

  private static async loadRulesFromBundle(ruleBundle: NormalizedAbsolutePath) {
    const { rules: bundleRules } = await import(pathToFileURL(ruleBundle).toString());
    for (const rule of bundleRules) {
      Linter.rules[rule.ruleId] = rule.ruleModule;
      debug(`Loaded rule ${rule.ruleId} from ${ruleBundle}`);
    }
  }

  /**
   * Lints an ESLint source code instance
   *
   * Linting a source code implies using ESLint linting functionality to find
   * problems in the code. It selects which linting configuration needs to be
   * considered during linting based on the file type.
   *
   * @param parseResult the ESLint source code
   * @param filePath the normalized absolute path of the source file
   * @param fileType the type of the source file
   * @param fileStatus whether the file has changed or not
   * @param analysisMode whether we are analyzing all files or only changed files
   * @param language language of the source file
   * @param detectedEsYear ecmascript version for the file
   * @param lintOptions additional rules and settings for linting
   * @returns linting issues
   */
  static lint(
    { sourceCode, parserOptions, parser }: ParseResult,
    filePath: NormalizedAbsolutePath,
    fileType: FileType = 'MAIN',
    fileStatus: FileStatus = 'CHANGED',
    analysisMode: AnalysisMode = 'DEFAULT',
    language: JsTsLanguage = 'js',
    detectedEsYear?: number,
    lintOptions: LintOptions = {},
  ) {
    if (!Linter.linter) {
      throw APIError.linterError(`Linter does not exist.`);
    }
    const baseRules = Linter.getRulesForFile(
      filePath,
      fileType,
      fileStatus === 'SAME' ? analysisMode : 'DEFAULT',
      language,
      detectedEsYear,
      sourceCode,
    );
    const rules = lintOptions.additionalRules
      ? { ...lintOptions.additionalRules, ...baseRules }
      : baseRules;
    const config = {
      languageOptions: {
        globals: Object.fromEntries(Linter.globals),
        parser,
        parserOptions,
      },
      plugins: {
        sonarjs: { rules: Linter.rules },
      },
      rules,
      /* using "max" version to prevent `eslint-plugin-react` from printing a warning */
      settings: {
        react: { version: '999.999.999' },
        fileType,
        sonarRuntime: true,
        workDir: Linter.rulesWorkdir,
        ...lintOptions.additionalSettings,
      },
      files: [`**/*${path.posix.extname(normalizePath(filePath))}`],
    };

    const messages = Linter.linter.verify(sourceCode, config, createOptions(filePath));
    clearFileCaches();
    return transformMessages(messages, language, {
      sourceCode,
      ruleMetas,
      filePath,
    });
  }

  /**
   * Sets the ESLint global variables configuration
   * @param globals the global variables to enable
   * @param environments the JavaScript execution environments to enable
   */
  private static setGlobals(globals: string[] = [], environments: string[] = []) {
    Linter.globals.clear();
    for (const global of globals) {
      Linter.globals.set(global, true);
    }
    for (const env of environments) {
      const envGlobals = globalsPkg[env as keyof typeof globalsPkg];
      if (envGlobals) {
        for (const [global, value] of Object.entries(envGlobals)) {
          Linter.globals.set(global, value);
        }
      } else {
        debug(`Unknown environment "${env}".`);
      }
    }
  }

  public static getRulesForFile(
    filePath: NormalizedAbsolutePath,
    fileType: FileType,
    analysisMode: AnalysisMode,
    fileLanguage: JsTsLanguage,
    detectedEsYear?: number,
    sourceCode?: SourceCode,
  ): ESLintLinter.RulesRecord {
    const normalizedFilePath = normalizeToAbsolutePath(filePath);
    const detectedModuleType = getModuleType(normalizedFilePath, Linter.baseDir);
    getOptionalProjectAnalysisTelemetryCollector()?.recordModuleType(detectedModuleType);
    const manifestDependencies = getDependencies(dirnamePath(normalizedFilePath), Linter.baseDir);
    // Make inline npm: imports visible to both rule activation and to dependency helpers
    // (getReactVersion, getDependenciesSanitizePaths) called from rules during linting.
    // Cleared by clearFileCaches() once linting completes.
    setCurrentFileInlineDependencies(sourceCode ? extractInlineNpmDependencies(sourceCode) : null);
    const linterConfigKey = createLinterConfigKey(
      filePath,
      Linter.baseDir,
      fileType,
      fileLanguage,
      analysisMode,
      detectedEsYear,
      detectedModuleType,
    );
    let baseRules = Linter.dependencyIndependentRulesCache.get(linterConfigKey);
    let dependencySensitiveRules = Linter.dependencySensitiveRulesCache.get(linterConfigKey);

    const baseContext = {
      extensionName: extname(normalizePath(filePath)),
      fileType,
      fileLanguage,
      analysisMode,
      detectedEsYear,
      detectedModuleType,
    };

    if (baseRules === undefined || dependencySensitiveRules === undefined) {
      /**
       * Creates the wrapper's linting configurations
       * The wrapper's linting configuration includes multiple ESLint
       * configurations: one per fileType/language/analysisMode combination.
       */
      const context: RuleFilterContext = { ...baseContext, dependencies: manifestDependencies };
      // Partition rules into dependency-independent rules and dependency-sensitive rules based on the presence of required dependencies
      // in their meta, as well as the result of dependency-independent filters
      const dependencyIndependentRules: RuleConfig[] = [];
      dependencySensitiveRules = [];

      for (const ruleConfig of Linter.ruleConfigs ?? []) {
        const ruleMeta = getRuleMeta(ruleConfig);
        if (
          DEPENDENCY_INDEPENDENT_RULE_FILTERS.every(predicate =>
            predicate(ruleConfig, ruleMeta, context),
          )
        ) {
          const ruleArray = hasRequiredDependencies(ruleMeta)
            ? dependencySensitiveRules
            : dependencyIndependentRules;
          ruleArray.push(ruleConfig);
        }
      }

      baseRules = Linter.createRulesRecord(dependencyIndependentRules);
      Linter.dependencyIndependentRulesCache.set(linterConfigKey, baseRules);
      Linter.dependencySensitiveRulesCache.set(linterConfigKey, dependencySensitiveRules);
    }

    if (dependencySensitiveRules.length === 0) {
      return baseRules;
    }

    // if there are rules with required dependencies, we need to check if the dependencies are present in the file imports before enabling them
    const context: RuleFilterContext = {
      ...baseContext,
      dependencies: withCurrentFileInlineDependencies(manifestDependencies),
    };
    const activeDependencySensitiveRules = dependencySensitiveRules.filter(ruleConfig => {
      const ruleMeta = getRuleMeta(ruleConfig);
      return DEPENDENCY_SENSITIVE_RULE_FILTERS.every(predicate =>
        predicate(ruleConfig, ruleMeta, context),
      );
    });

    if (activeDependencySensitiveRules.length === 0) {
      return baseRules;
    }

    return {
      ...baseRules,
      ...Linter.createRulesRecord(activeDependencySensitiveRules),
    };
  }

  /**
   * Creates an ESLint linting configuration
   *
   * A linter configuration is created based on the input rules enabled by
   * the user through the active quality profile and the rules provided by
   * the linter.  The configuration includes the rules with their configuration
   * that are used during linting.
   *
   * @param rules the rules from the active quality profile
   */
  private static createRulesRecord(rules: RuleConfig[]): ESLintLinter.RulesRecord {
    return rules.reduce((rules, rule) => {
      // in the case of bundles, rule.key will not be present in the ruleMetas
      const ruleMeta = getRuleMeta(rule);
      if (ruleMeta?.fields) {
        rules[`sonarjs/${rule.key}`] = [
          'error',
          ...applyTransformations(
            ruleMeta.fields,
            merge(defaultOptions(ruleMeta.fields), rule.configurations),
          ),
        ];
      } else {
        rules[`sonarjs/${rule.key}`] = ['error'];
      }
      return rules;
    }, {} as ESLintLinter.RulesRecord);
  }
}

function getRuleMeta(ruleConfig: RuleConfig): SonarMeta | undefined {
  return ruleConfig.key in ruleMetas
    ? (ruleMetas[ruleConfig.key as keyof typeof ruleMetas] as SonarMeta)
    : undefined;
}

function hasRequiredDependencies(ruleMeta: SonarMeta | undefined): boolean {
  return (ruleMeta?.requiredDependency.length ?? 0) > 0;
}

// Matches a valid URL scheme per RFC 3986: letter followed by letters, digits, '+', '-', or '.'
// Minimum length of 2 avoids matching Windows drive letters (e.g. "C:").
const URL_SCHEME_RE = /^([a-z][a-z0-9+.-]+):/;

function getURLScheme(moduleName: string): string | undefined {
  return URL_SCHEME_RE.exec(moduleName)?.[1];
}

/**
 * Extracts inline npm: import specifiers from the file's imports as a DependenciesList,
 * and records telemetry for any URL-scheme imports (npm:, jsr:, https:, ...).
 * Returns null if the file has no inline npm imports.
 */
function extractInlineNpmDependencies(sourceCode: SourceCode): DependenciesList | null {
  let inlineDependencies: DependenciesList | null = null;
  for (const moduleName of getCurrentFileImports(sourceCode)) {
    const protocol = getURLScheme(moduleName);
    if (protocol !== undefined) {
      getOptionalProjectAnalysisTelemetryCollector()?.recordDenoImport(protocol);
    }
    const parsedSpecifier = parseInlineNPMImport(moduleName);
    if (parsedSpecifier) {
      inlineDependencies ??= new Map();
      inlineDependencies.set(parsedSpecifier.packageName, parsedSpecifier.version);
    }
  }
  return inlineDependencies;
}

function createLinterConfigKey(
  filePath: NormalizedAbsolutePath,
  baseDir: NormalizedAbsolutePath,
  fileType: FileType,
  language: JsTsLanguage,
  analysisMode: AnalysisMode,
  detectedEsYear?: number,
  detectedModuleType?: string,
): string {
  // depending on the path, some rules may be enabled or disabled based on the dependencies found
  const normalizedPath = normalizeToAbsolutePath(filePath);
  const dependencyManifestDirName = getClosestDependencyManifestDir(
    dirnamePath(normalizedPath),
    baseDir,
  );
  const linterConfigKey = `${fileType}-${language}-${analysisMode}-${extname(normalizedPath)}-${dependencyManifestDirName}`;
  return `${linterConfigKey}:${detectedEsYear ?? 'esnext'}:${detectedModuleType ?? 'unknown'}`;
}
