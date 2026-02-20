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
import stylelint from 'stylelint';
import { transform } from './issues/index.js';
import { createStylelintConfig, type RuleConfig } from './config.js';
import type { NormalizedAbsolutePath } from '../../../shared/src/helpers/files.js';

/**
 * A wrapper of Stylelint linter
 */
export class LinterWrapper {
  /**
   * The stored Stylelint configuration from the active quality profile.
   * Set by `initialize()` and consumed by `lint()` when no per-call config is provided.
   */
  private config: stylelint.Config | undefined;

  /**
   * Whether the linter was initialized with at least one rule.
   * When false, CSS analysis is skipped in the analyzeProject path.
   */
  private hasRules = false;

  /**
   * Initializes the linter with a set of rules from the active quality profile.
   * After calling this, lint() can be called without providing a config.
   * Mirrors the Linter.initialize() pattern used for JS/TS analysis.
   *
   * When called with an empty rules array, the linter is reset to an
   * uninitialized state (isInitialized() returns false), so CSS analysis
   * is correctly skipped when no CSS rules are active.
   *
   * @param rules the CSS rules from the active quality profile
   */
  initialize(rules: RuleConfig[]): void {
    if (rules.length > 0) {
      this.config = createStylelintConfig(rules);
      this.hasRules = true;
    } else {
      this.config = undefined;
      this.hasRules = false;
    }
  }

  /**
   * Whether the linter has been pre-initialized with a stored configuration
   * that contains at least one rule. Returns false if never initialized or
   * initialized with an empty rule set.
   */
  isInitialized(): boolean {
    return this.hasRules;
  }

  /**
   * Lints a stylesheet
   *
   * Linting a stylesheet implies using Stylelint linting functionality to find
   * problems in the sheet. It does not need to be provided with an abstract
   * syntax tree as Stylelint takes care of the parsing internally.
   *
   * The result of linting a stylesheet requires post-linting transformations
   * to return SonarQube issues. These transformations essentially consist in
   * transforming Stylelint results into SonarQube issues.
   *
   * Because stylesheets are far different from what a source code is, metrics
   * computation does not make sense when analyzing such file contents. Issues
   * only are returned after linting.
   *
   * When no config is provided in the options, the stored config from
   * `initialize()` is used. This supports the analyzeProject path where
   * the linter is pre-initialized once, avoiding per-file config threading.
   *
   * @param filePath the path of the stylesheet
   * @param options the linting options
   * @returns the found issues
   */
  async lint(filePath: NormalizedAbsolutePath, options: stylelint.LinterOptions) {
    let finalOptions = options;

    if (this.config && !options.config) {
      finalOptions = { ...options, config: this.config };
    }
    return stylelint
      .lint(finalOptions)
      .then(result => ({ issues: transform(result.results, filePath) }));
  }
}

/**
 * The global Stylelint linter wrapper
 */
export const linter = new LinterWrapper();
