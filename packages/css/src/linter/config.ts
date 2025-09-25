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
import postcssHtml from 'postcss-html';
import postcssSass from 'postcss-sass';
import postcssScss from 'postcss-scss';
import postcssLess from 'postcss-less';
import postcssHtmlConfig from 'stylelint-config-html/html.js';
import postcssVueConfig from 'stylelint-config-html/vue.js';
import { sonarRules } from '../rules/index.js';
import stylisticPlugins from '@stylistic/stylelint-plugin';

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
    // We can pass just postcss function to the bundle and the module will resolve all plugins
    // automatically. However, esbuild will not be able to resolve our dependencies. We pass them
    // explicitly so that no dynamic requires happen at bundle time.
    overrides: [
      {
        files: [...postcssHtmlConfig.overrides[0].files, ...postcssVueConfig.overrides[0].files],
        customSyntax: postcssHtml({
          scss: postcssScss,
          sass: postcssSass,
          less: postcssLess,
        }),
      },
      {
        files: ['**/*.scss'],
        customSyntax: postcssScss,
      },
      {
        files: ['**/*.sass'],
        customSyntax: postcssSass,
      },
      {
        files: ['**/*.less'],
        customSyntax: postcssLess,
      },
    ],
    rules: configRules,
    plugins: [...sonarRules, ...stylisticPlugins],
  };
}
