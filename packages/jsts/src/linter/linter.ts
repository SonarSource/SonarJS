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
import { extendRuleConfig, RuleConfig } from './config/rule-config.js';
import { CustomRule } from './custom-rules/custom-rule.js';
import { JsTsLanguage } from '../../../shared/src/helpers/language.js';
import { FileType } from '../../../shared/src/helpers/files.js';
import { LintingResult, transformMessages } from './issues/transform.js';
import { customRules } from './custom-rules/rules.js';
import { getContext } from '../../../shared/src/helpers/context.js';
import { rules as internalRules, toUnixPath } from '../rules/index.js';
import { createOptions } from './pragmas.js';
import path from 'path';
import { ParseResult } from '../parsers/parse.js';
import { AnalysisMode, FileStatus } from '../analysis/analysis.js';
import globalsPkg from 'globals';
import { APIError } from '../../../shared/src/errors/error.js';

export function createLinterConfigKey(
  fileType: FileType,
  language: JsTsLanguage,
  analysisMode: AnalysisMode,
) {
  return `${fileType}-${language}-${analysisMode}`;
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
   * internal rules: rules in the packages/jsts/src/rules folder
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

  /** The rules configuration */
  public static readonly rulesConfig: Map<string, ESLintLinter.RulesRecord> = new Map();
  /** The global variables */
  public static readonly globals: Map<string, ESLintLinter.GlobalConf> = new Map();

  /** Linter is a static class and cannot be instantiated */
  private constructor() {
    if (this instanceof Linter) {
      throw Error('Linter class cannot be instantiated.');
    }
  }

  /**
   * Initializes the global linter
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
    inputRules?: RuleConfig[],
    environments: string[] = [],
    globals: string[] = [],
    workingDirectory?: string,
  ) {
    debug(`Initializing linter with ${inputRules?.map(rule => rule.key)}`);
    Linter.linter = new ESLintLinter({ cwd: workingDirectory });
    Linter.setGlobals(globals, environments);
    Linter.rulesConfig.clear();
    /**
     * Context bundles define a set of external custom rules (like the taint analysis rule)
     * including rule keys and rule definitions that cannot be provided to the linter
     * using the same feeding channel as rules from the active quality profile.
     */
    const { bundles } = getContext();
    for (const ruleBundle of bundles) {
      await Linter.loadRulesFromBundle(ruleBundle);
    }
    /**
     * Creates the wrapper's linting configurations
     * The wrapper's linting configuration includes multiple ESLint
     * configurations: one per fileType/language/analysisMode combination.
     */
    const rulesByKey: Map<string, RuleConfig[]> = new Map();
    inputRules?.forEach(ruleConfig => {
      const { key, fileTypeTargets, analysisModes, language = 'js' } = ruleConfig;
      // TODO: remove when sonar-security and sonar-architecture rules override the analysisModes method
      const effectiveAnalysisModes = ['ucfg', 'sonar-architecture-ir'].includes(key)
        ? (['DEFAULT', 'SKIP_UNCHANGED'] as const)
        : analysisModes;
      fileTypeTargets.forEach(fileType => {
        effectiveAnalysisModes.forEach(analysisMode => {
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
      this.rulesConfig.set(key, Linter.createRulesRecord(ruleConfigs));
    });
  }

  private static async loadRulesFromBundle(ruleBundle: string) {
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
   * @param analysisMode whether we are analyzing all files or only changed files
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
    if (!Linter.linter) {
      throw APIError.linterError(`Linter does not exist. Did you call /init-linter?`);
    }
    const key = createLinterConfigKey(
      fileType,
      language,
      fileStatus === 'SAME' ? analysisMode : 'DEFAULT',
    );
    const config = {
      languageOptions: {
        globals: Object.fromEntries(Linter.globals),
        parser,
        parserOptions,
      },
      plugins: {
        sonarjs: { rules: Linter.rules },
      },
      rules: this.rulesConfig.get(key) || Linter.createInternalRulesRecord(),
      /* using "max" version to prevent `eslint-plugin-react` from printing a warning */
      settings: { react: { version: '999.999.999' }, fileType },
      files: [`**/*${path.posix.extname(toUnixPath(filePath))}`],
    };

    const messages = Linter.linter.verify(sourceCode, config, createOptions(filePath));
    return transformMessages(messages, { sourceCode, rules: Linter.rules, filePath });
  }

  /**
   * Sets the ESLint global variables configuration
   * @param globals the global variables to enable
   * @param environments the JavaScript execution environments to enable
   */
  private static setGlobals(globals: string[] = [], environments: string[] = []) {
    Linter.globals.clear();
    globals.forEach(global => {
      Linter.globals.set(global, true);
    });
    environments.forEach(env => {
      Object.entries(globalsPkg[env as keyof typeof globalsPkg]).forEach(([global, value]) => {
        Linter.globals.set(global, value);
      });
    });
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
    return {
      ...rules.reduce((rules, rule) => {
        rules[`sonarjs/${rule.key}`] = [
          'error',
          /**
           * the rule configuration can be decorated with special markers
           * to activate internal features: a rule that reports secondary
           * locations would be `["error", "sonar-runtime"]`, where the "sonar-runtime"`
           * is a marker for a post-linting processing to decode such locations.
           */
          ...extendRuleConfig(Linter.rules[rule.key].meta?.schema || undefined, rule),
        ];
        return rules;
      }, {} as ESLintLinter.RulesRecord),
      ...Linter.createInternalRulesRecord(),
    };
  }

  /**
   * Custom rules like cognitive complexity and symbol highlighting
   * are always enabled as part of metrics computation. Such rules
   * are, therefore, added in the linting configuration by default.
   *
   * _Internal custom rules are not enabled in SonarLint context._
   */
  private static createInternalRulesRecord(): ESLintLinter.RulesRecord {
    if (getContext().sonarlint) {
      return {};
    }
    return {
      ...customRules.reduce((rules, rule) => {
        rules[`sonarjs/${rule.ruleId}`] = ['error', ...rule.ruleConfig];
        return rules;
      }, {} as ESLintLinter.RulesRecord),
    };
  }
}
