/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import stylelint from 'stylelint';
import postcssHtml from 'postcss-html';
import postcssSass from 'postcss-sass';
import postcssScss from 'postcss-scss';
import postcssLess from 'postcss-less';
import postcss from 'postcss-syntax';
import { plugins } from '../rules/index.js';

/**
 * A Stylelint rule configuration
 *
 * @param key the Stylelint rule key
 * @param configuration the rule specific configuration
 */
export interface RuleConfig {
  key: string;
  configurations: any[];
}

/**
 * Stylelint's rule configuration
 *
 * Note that Stylelint defines its own `ConfigRules` type, which is
 * no longer exposed in its public API.
 */
type ConfigRules = {
  [ruleName: string]: stylelint.ConfigRuleSettings<any, Object>;
};

/**
 * Creates a Stylelint configuration
 *
 * Creating a Stylelint configuration implies enabling along with specific rule
 * configuration all the rules from the active quality profile.
 *
 * @param rules the rules from the active quality profile
 * @returns the created Stylelint configuration
 */
export function createStylelintConfig(rules: RuleConfig[]): stylelint.Config {
  const configRules: ConfigRules = {};
  for (const { key, configurations } of rules) {
    if (configurations.length === 0) {
      configRules[key] = true;
    } else {
      configRules[key] = configurations;
    }
  }
  return {
    customSyntax: postcss({
      html: postcssHtml,
      scss: postcssScss,
      sass: postcssSass,
      less: postcssLess,
    }),
    rules: configRules,
    plugins,
  };
}
