/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import { Linter, Rule, SourceCode } from 'eslint';
import { rules as pluginRules } from 'eslint-plugin-sonarjs';
import { rules as reactESLintRules } from 'eslint-plugin-react';
import { rules as typescriptESLintRules } from '@typescript-eslint/eslint-plugin';
import { rules as internalRules } from 'linting/eslint';
import { customRules as internalCustomRules, CustomRule } from './custom-rules';
import { createLinterConfig, RuleConfig } from './config';
import { FileType } from 'helpers';
import { SymbolHighlight } from './visitors';
import { decorateExternalRules } from './decoration';
import {
  Issue,
  transformMessages,
  extractHighlightedSymbols,
  extractCognitiveComplexity,
} from './issues';

/**
 * The result of linting a source code
 *
 * ESLint API returns what it calls messages as results of linting a file.
 * A linting result in the context of the analyzer includes more than that
 * as it needs not only to transform ESLint messages into SonarQube issues
 * as well as analysis data about the analyzed source code, namely symbol
 * highlighting and cognitive complexity.
 *
 * @param issues the issues found in the code
 * @param highlightedSymbols the symbol highlighting of the code
 * @param cognitiveComplexity the cognitive complexity of the code
 */
export type LintingResult = {
  issues: Issue[];
  highlightedSymbols: SymbolHighlight[];
  cognitiveComplexity?: number;
};

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
  readonly config: { [key in FileType]: Linter.Config };

  /** The wrapper's rule database */
  readonly rules: Map<string, Rule.RuleModule>;

  /**
   * Constructs an ESLint linter wrapper
   *
   * Constructing an linter wrapper consists in building the rule database
   * the internal ESLint linter shall consider during linting. Furthermore,
   * it creates a linting configuration that configures which rules should
   * be used on linting based on the active quality profile and file type.
   *
   * @param inputRules the quality profile rules
   * @param customRules the additional custom rules
   * @param environments the JavaScript environments
   * @param globals the global variables
   */
  constructor(
    inputRules: RuleConfig[],
    customRules: CustomRule[] = [],
    environments: string[] = [],
    globals: string[] = [],
  ) {
    this.linter = new Linter();
    this.rules = this.defineRules(customRules);
    this.config = this.createConfig(inputRules, this.rules, environments, globals);
  }

  /**
   * Lints an ESLint source code instance
   *
   * Linting a source code implies using ESLint linting functionality to find
   * problems in the code. It selects which linting configuration needs to be
   * considered during linting based on the file type.
   *
   * The result of linting a source code requires post-linting transformations
   * to return SonarQube issues. These transformations include decoding issues
   * with secondary locations as well as converting quick fixes.
   *
   * Besides issues, a few metrics are computing during linting in the form of
   * an internal custom rule execution, namely cognitive complexity and symbol
   * highlighting. These custom rules also produce issues that are extracted.
   *
   * @param sourceCode the ESLint source code
   * @param filePath the path of the source file
   * @param fileType the type of the source file
   * @returns the linting result
   */
  lint(sourceCode: SourceCode, filePath: string, fileType: FileType = 'MAIN'): LintingResult {
    const fileTypeConfig = this.config[fileType];
    const config = { ...fileTypeConfig, settings: { ...fileTypeConfig.settings, fileType } };
    const options = { filename: filePath, allowInlineConfig: false };
    const messages = this.linter.verify(sourceCode, config, options);
    const issues = transformMessages(messages, { sourceCode, rules: this.rules });
    const highlightedSymbols = extractHighlightedSymbols(issues);
    const cognitiveComplexity = extractCognitiveComplexity(issues);
    return {
      issues,
      highlightedSymbols,
      cognitiveComplexity,
    };
  }

  /**
   * Defines the wrapper's rule database
   *
   * The wrapper's rule database is mainly built upon the set of homemade
   * rules implemented internally in the bridge as well as the ESLint core
   * rules from the ESLint linter. Some other rules from selected ESLint
   * plugins extend the rule database as well as (internal) custom rules.
   * These external rules might even be decorated by internal decorators
   * in order to refine their behaviour.
   *
   * @param customRules a set of custom rules to add
   * @returns a complete database of ESLint-based rules
   */
  private defineRules(customRules: CustomRule[]) {
    const externalRules = this.getExternalRules();

    /**
     * The order of defining rules is important here because internal rules
     * and external ones might share the same name by accident, which would
     * unexpectedly overwrite the behaviour of the internal one in favor of
     * the external one. This is why some internal rules are named with the
     * prefix `sonar-`, e.g., `sonar-no-fallthrough`.
     */
    this.linter.defineRules(externalRules);
    this.linter.defineRules(pluginRules);
    this.linter.defineRules(internalRules);

    for (const customRule of customRules) {
      this.linter.defineRule(customRule.ruleId, customRule.ruleModule);
    }

    for (const internalCustomRule of internalCustomRules) {
      this.linter.defineRule(internalCustomRule.ruleId, internalCustomRule.ruleModule);
    }

    return this.linter.getRules();
  }

  /**
   * Gets the external ESLint-based rules
   *
   * The external ESLint-based rules includes all the rules that are
   * not implemented internally, in other words, rules from external
   * dependencies which includes ESLint core rules. Furthermore, the
   * returned rules are decorated either by internal decorators or by
   * special decorations.
   *
   * @returns the ESLint-based external rules
   */
  private getExternalRules() {
    const externalRules: { [key: string]: Rule.RuleModule } = {};
    const coreESLintRules = Object.fromEntries(new Linter().getRules());
    /**
     * The order of defining rules from external dependencies is important here.
     * Core ESLint rules could be overriden by the implementation from specific
     * dependencies, which should be the default behaviour in most cases. If for
     * some reason a different behaviour is needed for a particular rule, one can
     * specify it in `decorateExternalRules`.
     */
    const dependencies = [coreESLintRules, typescriptESLintRules, reactESLintRules];
    for (const dependencyRules of dependencies) {
      for (const [name, module] of Object.entries(dependencyRules)) {
        externalRules[name] = module;
      }
    }
    decorateExternalRules(externalRules);
    return externalRules;
  }

  /**
   * Creates the wrapper's linting configuration
   *
   * The wrapper's linting configuration actually includes two
   * ESLint configurations: one per file type.
   *
   * @param inputRules the rules from the active quality profile
   * @param linterRules the rules defined in the linter
   * @param environments the JavaScript environments
   * @param globals the global variables
   * @returns the wrapper's linting configuration
   */
  private createConfig(
    inputRules: RuleConfig[],
    linterRules: Map<string, Rule.RuleModule>,
    environments: string[],
    globals: string[],
  ) {
    const mainRules: RuleConfig[] = [];
    const testRules: RuleConfig[] = [];
    for (const inputRule of inputRules) {
      if (inputRule.fileTypeTarget.includes('MAIN')) {
        mainRules.push(inputRule);
      }
      if (inputRule.fileTypeTarget.includes('TEST')) {
        testRules.push(inputRule);
      }
    }
    const mainConfig = createLinterConfig(mainRules, linterRules, environments, globals);
    const testConfig = createLinterConfig(testRules, linterRules, environments, globals);
    return { ['MAIN']: mainConfig, ['TEST']: testConfig };
  }
}
