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
import { Linter, Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import { RuleConfig } from './config/rule-config.js';
import { CustomRule } from './custom-rules/custom-rule.js';
import { JsTsLanguage } from '../../../shared/src/helpers/language.js';
import { debug } from '../../../shared/src/helpers/logging.js';
import { FileType } from '../../../shared/src/helpers/files.js';
import { LintingResult, transformMessages } from './issues/transform.js';
import { createLinterConfig } from './config/linter-config.js';
import { customRules as internalCustomRules } from './custom-rules/rules.js';
import { getContext } from '../../../shared/src/helpers/context.js';
import { rules as internalRules, toUnixPath } from '../rules/index.js';
import path from 'path';
import * as ruleMetas from '../rules/metas.js';

const eslintMapping: { [key: string]: { ruleId: string; ruleModule: Rule.RuleModule } } = {};

type Directive = {
  parentDirective: {
    node: estree.Comment;
    value: string;
    ruleIds: string[];
  };
  type: 'disable' | 'enable' | 'disable-line' | 'disable-next-line';
  line: number;
  column: number;
  ruleId: string | null;
  justification: string;
};

internalCustomRules.forEach(rule => {
  eslintMapping[rule.ruleId] = { ruleId: `sonarjs/${rule.ruleId}`, ruleModule: rule.ruleModule };
});

Object.entries(ruleMetas).forEach(([sonarKey, meta]) => {
  const ruleId = `sonarjs/${sonarKey}`;
  const ruleModule = internalRules[sonarKey as keyof typeof internalRules];
  eslintMapping[sonarKey] = { ruleId, ruleModule };
  eslintMapping[meta.eslintId] = { ruleId, ruleModule };
  if (meta.implementation === 'decorated') {
    meta.externalRules.forEach(externalRule => {
      eslintMapping[externalRule.externalRule] = { ruleId, ruleModule };
    });
  }
});

/**
 * Extracts the rule part from a ruleId containing plugin and rule parts.
 * @param {string} ruleId The rule ID to parse.
 * @returns {string) The rule part of the ruleId;
 */
function getRuleId(ruleId: string) {
  return ruleId.split('/').at(-1)!;
}

/**
 * Wrapper's constructor initializer. All the parameters are optional,
 * having the option to create a Linter without any rules enabled
 *
 * @param inputRules the enabled rules
 * @param environments the JavaScript environments
 * @param globals the global variables
 */
interface WrapperOptions {
  inputRules?: RuleConfig[];
  environments?: string[];
  globals?: string[];
  workingDirectory?: string;
}

interface LinterConfigurationKey {
  language: JsTsLanguage;
  fileType: FileType;
}

/**
 * We create the ESLint plugin with all rules available.
 *
 * First: the internal rules, i.e. rules in the packages/jsts/src/rules folder
 */
export const rules: Record<string, Rule.RuleModule> = {
  ...internalRules,
};
/**
 * Second: Load internal custom rules
 *
 * These are rules used internally by SonarQube to have the symbol highlighting and
 * the cognitive complexity metrics.
 */
internalCustomRules.forEach((rule: CustomRule) => {
  rules[rule.ruleId] = rule.ruleModule;
});

async function loadRulesFromBundle(ruleBundle: string) {
  const { rules: bundleRules } = await import(new URL(ruleBundle).toString());
  bundleRules.forEach((rule: CustomRule) => {
    rules[rule.ruleId] = rule.ruleModule;
    debug(`Loaded rule ${rule.ruleId} from ${ruleBundle}`);
  });
}

/**
 * A wrapper of ESLint linter
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
export class LinterWrapper {
  /** The wrapper's internal ESLint linter instance */
  readonly linter: Linter;

  /** The wrapper's linting configuration */
  config: Map<LinterConfigurationKey, Linter.Config> = new Map();

  readonly configurationKeys: LinterConfigurationKey[] = [];

  private linterConfigurationKey(key: LinterConfigurationKey): LinterConfigurationKey {
    const r = this.configurationKeys.find(
      v => v.language === key.language && v.fileType === key.fileType,
    );
    if (r) {
      return r;
    } else {
      this.configurationKeys.push(key);
      return key;
    }
  }

  /**
   * Constructs an ESLint linter wrapper
   *
   * Constructing a linter wrapper consists in building the rule database
   * the internal ESLint linter shall consider during linting.
   *
   * The working directory of the ESLint Linter needs to be configured to a path
   * that contains all files that will be analyzed, as the linter.verify process
   * will ignore any file external to that path:
   * https://github.com/eslint/rewrite/blob/0e09a420009796ceb4157ebe0dcee1348fdc4b75/packages/config-array/src/config-array.js#L865
   *
   * @param options the wrapper's options
   */
  constructor(private readonly options: WrapperOptions = {}) {
    this.linter = new Linter({
      cwd: options.workingDirectory,
    });
  }

  async init() {
    /**
     * Context bundles define a set of external custom rules (like the taint analysis rule)
     * including rule keys and rule definitions that cannot be provided to the linter
     * wrapper using the same feeding channel as rules from the active quality profile.
     */
    const { bundles } = getContext();
    for (const ruleBundle of bundles) {
      await loadRulesFromBundle(ruleBundle);
    }
    this.config = this.createConfig();
  }

  /**
   * Lints an ESLint source code instance
   *
   * Linting a source code implies using ESLint linting functionality to find
   * problems in the code. It selects which linting configuration needs to be
   * considered during linting based on the file type.
   *
   * @param sourceCode the ESLint source code
   * @param filePath the path of the source file
   * @param fileType the type of the source file
   * @param language language of the source file
   * @returns the linting result
   */
  lint(
    sourceCode: SourceCode,
    filePath: string,
    fileType: FileType = 'MAIN',
    language: JsTsLanguage = 'js',
  ): LintingResult {
    const key: LinterConfigurationKey = { fileType, language };
    let linterConfig = this.getConfig(key);
    if (!linterConfig) {
      // we create default linter config with internal rules only which provide metrics, tokens, etc...
      linterConfig = createLinterConfig([], rules, this.options.environments, this.options.globals);
      this.config.set(key, linterConfig);
    }
    const config = {
      ...linterConfig,
      files: [`**/*${path.posix.extname(toUnixPath(filePath))}`],
      settings: { ...linterConfig.settings, fileType },
    };

    const mappedParentDirectives = new Set();

    const options = {
      filename: filePath,
      allowInlineConfig: true,
      getRule: (ruleId: string) => eslintMapping[getRuleId(ruleId)]?.ruleId,
      patchDirectives: (directives: Directive[]) =>
        directives.forEach(directive => {
          directive.ruleId = eslintMapping[getRuleId(directive.ruleId!)].ruleId;
          if (!mappedParentDirectives.has(directive.parentDirective)) {
            directive.parentDirective.ruleIds = directive.parentDirective.ruleIds.map(ruleId => {
              directive.parentDirective.value = directive.parentDirective.value.replaceAll(
                ruleId,
                eslintMapping[getRuleId(ruleId)].ruleId,
              );
              return eslintMapping[getRuleId(ruleId)].ruleId;
            });
            mappedParentDirectives.add(directive.parentDirective);
          }
        }),
      patchInlineOptions: (rules: Linter.RulesRecord) => {
        const patchedOptions: Linter.RulesRecord = {};
        for (const [ruleId, options] of Object.entries(rules)) {
          const sonarKey = eslintMapping[getRuleId(ruleId)]?.ruleId;
          if (sonarKey) {
            patchedOptions[sonarKey] = options;
          }
        }
        return patchedOptions;
      },
    };
    const messages = this.linter.verify(sourceCode, config, options);
    return transformMessages(messages, { sourceCode, rules });
  }

  /**
   * Creates the wrapper's linting configuration
   *
   * The wrapper's linting configuration actually includes two
   * ESLint configurations: one per file type.
   *
   * @returns the wrapper's linting configuration
   */
  private createConfig() {
    debug('Creating linter config');
    const rulesByKey: Map<LinterConfigurationKey, RuleConfig[]> = new Map();
    this.options.inputRules?.forEach(r => {
      const target = Array.isArray(r.fileTypeTarget) ? r.fileTypeTarget : [r.fileTypeTarget];
      target.forEach(fileType => {
        const key = this.linterConfigurationKey({ language: r.language ?? 'js', fileType });
        const rules = rulesByKey.get(key) ?? [];
        rules.push(r);
        rulesByKey.set(key, rules);
      });
    });
    rulesByKey.forEach((rules, key) => {
      debug(
        `Linter config: ${JSON.stringify(key)} with ${rules
          .map(r => r.key)
          .sort((a, b) => a.localeCompare(b))}`,
      );
    });
    const configByKey: Map<LinterConfigurationKey, Linter.Config> = new Map();
    rulesByKey.forEach((ruleConfigs, key) => {
      configByKey.set(
        key,
        createLinterConfig(ruleConfigs, rules, this.options.environments, this.options.globals),
      );
    });
    return configByKey;
  }

  getConfig(key: LinterConfigurationKey) {
    const k = this.linterConfigurationKey(key);
    return this.config.get(k);
  }
}
