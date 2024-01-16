/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import * as stylelint from 'stylelint';
import { transform } from './issues';
import { rules } from '../rules';

/**
 * A wrapper of Stylelint linter
 */
export class LinterWrapper {
  /**
   * Constructs a Stylelint wrapper
   */
  constructor() {
    this.defineRules();
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
   * @param filePath the path of the stylesheet
   * @param options the linting options
   * @returns the found issues
   */
  lint(filePath: string, options: stylelint.LinterOptions) {
    return stylelint
      .lint(options)
      .then(result => ({ issues: transform(result.results, filePath) }));
  }

  /**
   * Defines the wrapper's rules
   *
   * Besides Stylelint rules, the linter wrapper includes all the rules that
   * are implemented internally.
   */
  private defineRules() {
    for (const key in rules) {
      stylelint.rules[key] = rules[key];
    }
  }
}

/**
 * The global Stylelint linter wrapper
 */
export const linter = new LinterWrapper();
