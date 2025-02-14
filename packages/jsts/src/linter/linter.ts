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
import { debug } from '../../../shared/src/helpers/logging.js';
import { Rule, Linter as ESLintLinter } from 'eslint';
// @ts-ignore
import { getLinterInternalSlots } from '../../../../node_modules/eslint/lib/linter/linter.js';
import { RuleConfig } from './config/rule-config.js';
import { CustomRule } from './custom-rules/custom-rule.js';
import { JsTsLanguage } from '../../../shared/src/helpers/language.js';
import { FileType } from '../../../shared/src/helpers/files.js';
import { LintingResult, transformMessages } from './issues/transform.js';
import { createLinterConfig } from './config/linter-config.js';
import { customRules } from './custom-rules/rules.js';
import { getContext } from '../../../shared/src/helpers/context.js';
import { rules as internalRules, toUnixPath } from '../rules/index.js';
import { createOptions } from './pragmas.js';
import path from 'path';
import { ParseResult } from '../parsers/parse.js';
import { AnalysisMode, FileStatus } from '../analysis/analysis.js';
import globalsPkg from 'globals';

export function createLinterConfigKey(
  fileType: FileType,
  language: JsTsLanguage,
  analysisMode: AnalysisMode,
) {
  return `${fileType}-${language}-${analysisMode}`;
}

/**
 * A wrapper of ESLint linter
 *
 * The linter is expected to be initialized before use.
 * To this end, the plugin is expected to explicitly send a request to
 * initialize a linter before starting the actual analysis of a file.
 *
 * The purpose of the wrapper is to configure the behaviour of ESLint linter,
 * which includes:
 *
 * - defining the rules that should be used during linting,
 * - declaring globals that need to be considered as such
 * - defining the environments bringing a set of predefined variables
 *
 * Because some rules target main files while other target test files (or even
 * both), the wrapper relies on two linting configurations to decide which set
 * of rules should be considered during linting.
 *
 * Last but not least, the linter wrapper eventually turns ESLint problems,
 * also known as messages, into SonarQube issues.
 */
export class Linter {
  /**
   * The ESLint linter
   */
  public static readonly linter = new ESLintLinter();
  /**
   * internal rules, i.e. rules in the packages/jsts/src/rules folder
   * custom rules: used internally by SonarQube to have the symbol highlighting and
   * the cognitive complexity metrics.
   */
  public static readonly rules: Record<string, Rule.RuleModule> = {
    ...internalRules,
    ...customRules.reduce(
      (acc, rule: CustomRule) => {
        acc[rule.ruleId] = rule.ruleModule;
        return acc;
      },
      {} as Record<string, Rule.RuleModule>,
    ),
  };

  /** The wrapper's linting configuration */
  public static config: Map<string, ESLintLinter.Config> = new Map();
  /** the global variables */
  private static globals: ESLintLinter.Globals = {};

  /** Linter is a static class and cannot be instantiated */
  private constructor() {
    if (this instanceof Linter) {
      throw Error('Linter class cannot be instantiated.');
    }
  }

  /**
   * Initializes the global linter wrapper
   * The working directory of the ESLint Linter needs to be configured to a path
   * that contains all files that will be analyzed, as the linter.verify process
   * will ignore any file external to that path:
   * https://github.com/eslint/rewrite/blob/0e09a420009796ceb4157ebe0dcee1348fdc4b75/packages/config-array/src/config-array.js#L865
   *
   * @param inputRules the rules from the active quality profiles
   * @param environments the JavaScript execution environments
   * @param globals the global variables
   * @param workingDirectory the working directory
   */
  static async initialize(
    inputRules: RuleConfig[],
    environments: string[] = [],
    globals: string[] = [],
    workingDirectory?: string,
  ) {
    debug(`Initializing linter with ${inputRules.map(rule => rule.key)}`);
    getLinterInternalSlots(Linter.linter).cwd = workingDirectory;
    Linter.globals = Linter.getGlobals(globals, environments);

    /**
     * Context bundles define a set of external custom rules (like the taint analysis rule)
     * including rule keys and rule definitions that cannot be provided to the linter
     * wrapper using the same feeding channel as rules from the active quality profile.
     */
    const { bundles } = getContext();
    for (const ruleBundle of bundles) {
      await Linter.loadRulesFromBundle(ruleBundle);
    }
    /**
     * Creates the wrapper's linting configurations
     * The wrapper's linting configuration actually includes many
     * ESLint configurations: one per fileType/language/analysisMode.
     */
    const rulesByKey: Map<string, RuleConfig[]> = new Map();
    inputRules?.forEach(ruleConfig => {
      const fileTypes = ruleConfig.fileTypeTarget;
      // TODO: change when sonar-security  and sonar-architecture rules override the analysisModes method
      const analysisModes: AnalysisMode[] = ['ucfg', 'sonar-architecture-ir'].includes(
        ruleConfig.key,
      )
        ? ['DEFAULT', 'SKIP_UNCHANGED']
        : ruleConfig.analysisModes;
      const language = ruleConfig.language ?? 'js';
      fileTypes.forEach(fileType => {
        analysisModes.forEach(analysisMode => {
          const key = createLinterConfigKey(fileType, language, analysisMode);
          const rules = rulesByKey.get(key) ?? [];
          rules.push(ruleConfig);
          rulesByKey.set(key, rules);
        });
      });
    });
    rulesByKey.forEach((ruleConfigs, key) => {
      debug(
        `Linter config: ${key} with ${ruleConfigs
          .map(r => r.key)
          .sort((a, b) => a.localeCompare(b))}`,
      );
      this.config.set(key, createLinterConfig(ruleConfigs, Linter.rules, Linter.globals));
    });
  }

  static async loadRulesFromBundle(ruleBundle: string) {
    const { rules: bundleRules } = await import(new URL(ruleBundle).toString());
    bundleRules.forEach((rule: CustomRule) => {
      Linter.rules[rule.ruleId] = rule.ruleModule;
      debug(`Loaded rule ${rule.ruleId} from ${ruleBundle}`);
    });
  }

  /**
   * Lints an ESLint source code instance
   *
   * Linting a source code implies using ESLint linting functionality to find
   * problems in the code. It selects which linting configuration needs to be
   * considered during linting based on the file type.
   *
   * @param parseResult the ESLint source code
   * @param filePath the path of the source file
   * @param fileType the type of the source file
   * @param fileStatus whether the file has changed or not
   * @param analysisMode whether we are analyzing a changed file or not
   * @param language language of the source file
   * @returns the linting result
   */
  static lint(
    { sourceCode, parserOptions, parser }: ParseResult,
    filePath: string,
    fileType: FileType = 'MAIN',
    fileStatus: FileStatus = 'CHANGED',
    analysisMode: AnalysisMode = 'DEFAULT',
    language: JsTsLanguage = 'js',
  ): LintingResult {
    const key = createLinterConfigKey(
      fileType,
      language,
      fileStatus === 'SAME' ? analysisMode : 'DEFAULT',
    );
    let linterConfig = this.config.get(key);
    if (!linterConfig) {
      // we create default linter config with internal rules only which provide metrics, tokens, etc...
      linterConfig = createLinterConfig([], Linter.rules, Linter.globals);
      this.config.set(key, linterConfig);
    }
    const config = {
      ...linterConfig,
      languageOptions: {
        ...linterConfig.languageOptions,
        parser,
        parserOptions,
      },
      files: [`**/*${path.posix.extname(toUnixPath(filePath))}`],
      settings: { ...linterConfig.settings, fileType },
    };

    const messages = Linter.linter.verify(sourceCode, config, createOptions(filePath));
    return transformMessages(messages, { sourceCode, rules: Linter.rules, filePath });
  }

  /**
   * Creates an ESLint global variables configuration
   * @param globals the global variables to enable
   * @param environments the JavaScript execution environments to enable
   * @returns a globals object
   */
  static getGlobals(globals: string[] = [], environments: string[] = []): ESLintLinter.Globals {
    return {
      ...globals.reduce(
        (globalsAcc, global) => ({
          ...globalsAcc,
          [global]: true,
        }),
        {},
      ),
      ...environments.reduce(
        (globalsAcc, env) => ({
          ...globalsAcc,
          ...globalsPkg[env as keyof typeof globalsPkg],
        }),
        {},
      ),
    };
  }
}
