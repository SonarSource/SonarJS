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
import stylelint from 'stylelint';
import { transform } from './issues/index.js';

/**
 * A wrapper of Stylelint linter
 */
export class LinterWrapper {
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
   * @param filePath the path of the stylesheet
   * @param options the linting options
   * @returns the found issues
   */
  async lint(filePath: string, options: stylelint.LinterOptions) {
    return stylelint
      .lint(options)
      .then(result => ({ issues: transform(result.results, filePath) }));
  }
}

/**
 * The global Stylelint linter wrapper
 */
export const linter = new LinterWrapper();
