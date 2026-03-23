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
import type { Root, Document } from 'postcss';
import { transform } from './issues/transform.js';
import { createStylelintConfig, type RuleConfig } from './config.js';
import type { CssIssue } from './issues/issue.js';
import type { FileType, NormalizedAbsolutePath } from '../../../shared/src/helpers/files.js';
import { APIError } from '../../../shared/src/errors/error.js';

interface LintResult {
  issues: CssIssue[];
  root?: Root | Document;
}

const testFileConfig = createStylelintConfig([]);

/**
 * A wrapper of Stylelint linter
 */
export class LinterWrapper {
  /**
   * The stored Stylelint configuration from the active quality profile.
   * Set by `initialize()` and consumed by `lint()` for MAIN files.
   */
  private config: stylelint.Config | undefined;

  /**
   * Initializes the linter with a set of rules from the active quality profile.
   * After calling this, lint() can analyze MAIN and TEST files.
   * Mirrors the Linter.initialize() pattern used for JS/TS analysis.
   *
   * When called with an empty rules array, the linter remains initialized
   * with an empty config.
   *
   * @param rules the CSS rules from the active quality profile
   */
  initialize(rules: RuleConfig[]): void {
    this.config = createStylelintConfig(rules);
  }

  /**
   * Whether the current initialized configuration has at least one active rule.
   */
  hasActiveRules(): boolean {
    if (!this.config?.rules) {
      return false;
    }
    return Object.keys(this.config.rules).length > 0;
  }

  /**
   * Lints a stylesheet and returns both issues and the PostCSS root.
   *
   * The PostCSS root from Stylelint's internal parse is returned so callers
   * can compute metrics and highlighting without parsing the file a second time.
   *
   * MAIN files use the stored config from `initialize()`.
   * TEST files use a shared empty-rules config.
   *
   * @param filePath the path of the stylesheet
   * @param fileContent the stylesheet source code
   * @param fileType whether the file is MAIN or TEST
   * @returns the found issues and the PostCSS AST root
   */
  async lint(
    filePath: NormalizedAbsolutePath,
    fileContent: string,
    fileType: FileType = 'MAIN',
  ): Promise<LintResult> {
    if (!this.config) {
      throw APIError.linterError(
        `Linter does not exist. LinterWrapper.initialize() was never called.`,
      );
    }

    const config = fileType === 'TEST' ? testFileConfig : this.config;
    const options: stylelint.LinterOptions = {
      code: fileContent,
      codeFilename: filePath,
      config,
    };

    return stylelint.lint(options).then(result => ({
      issues: transform(result.results, filePath),
      root: result.results[0]?._postcssResult?.root,
    }));
  }
}

/**
 * The global Stylelint linter wrapper
 */
export const linter = new LinterWrapper();
