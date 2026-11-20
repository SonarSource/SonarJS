/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type stylelint from 'stylelint';
import postcss, { type Syntax } from 'postcss';
import { type CssDialect, PREPROCESSOR_DIALECTS } from './dialect.js';
import postcssHtml from 'postcss-html';
import { postcssSass } from './sass/index.js';
import postcssScss from 'postcss-scss';
import postcssLess from 'postcss-less';
import postcssHtmlConfig from 'stylelint-config-html/html.js';
import postcssVueConfig from 'stylelint-config-html/vue.js';
import { sonarRules } from '../rules/index.js';
import stylisticPlugins from '@stylistic/stylelint-plugin';
import { cssOnlyRuleKeys } from './css-only-rules.js';

export type CssSyntax = CssDialect | 'embedded';

const parsers: Record<CssDialect, Syntax> = {
  css: postcss,
  scss: postcssScss,
  sass: postcssSass,
  less: postcssLess,
};
const embeddedSyntax = postcssHtml(parsers);
// Keep the actual source filename and expose the selected dialect just as postcss-html does.
const syntaxes = Object.fromEntries(
  Object.entries(parsers).map(([dialect, syntax]) => [
    dialect,
    {
      ...syntax,
      parse: (css, opts) => {
        const root = syntax.parse!(css, opts);
        if (root.source) Object.assign(root.source, { lang: dialect });
        return root;
      },
    } satisfies Syntax,
  ]),
) as Record<CssDialect, Syntax>;

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
 * Rules in cssOnlyRuleKeys are treated specially:
 *  - Enabled for the CSS dialect and embedded stylesheets (where transform.ts
 *    filters out warnings from non-CSS embedded blocks).
 *  - Never enabled for standalone SCSS/Sass/Less dialects.
 *
 * @param rules the rules from the active quality profile
 * @param syntax the selected dialect, or omitted for extension-based routing
 * @returns the created Stylelint configuration
 */
export function createStylelintConfig(rules: RuleConfig[], syntax?: CssSyntax): stylelint.Config {
  const configRules: ConfigRules = {};
  const cssOnlyRules: ConfigRules = {};
  for (const { key, configurations } of rules) {
    let value = configurations.length === 0 ? true : configurations;
    if (key === 'nesting-selector-no-missing-scoping-root') {
      // Sass mixin bodies receive their selector scope at the include site.
      const [primary = true, secondary = {}] = configurations;
      value = [
        primary,
        { ...secondary, ignoreAtRules: ['mixin', 'include', ...(secondary.ignoreAtRules ?? [])] },
      ];
    }
    if (cssOnlyRuleKeys.has(key)) {
      cssOnlyRules[key] = value;
    } else {
      configRules[key] = value;
    }
  }
  if (syntax) {
    return {
      customSyntax: syntax === 'embedded' ? embeddedSyntax : syntaxes[syntax],
      rules:
        syntax === 'css' || syntax === 'embedded'
          ? { ...configRules, ...cssOnlyRules }
          : configRules,
      plugins: [...sonarRules, ...stylisticPlugins],
    };
  }
  return {
    // We can pass just postcss function to the bundle and the module will resolve all plugins
    // automatically. However, esbuild will not be able to resolve our dependencies. We pass them
    // explicitly so that no dynamic requires happen at bundle time.
    overrides: [
      // CSS-only rules run on plain .css files only.
      {
        files: ['**/*.css'],
        rules: cssOnlyRules,
      },
      // HTML/Vue: full syntax so all embedded blocks are parsed. CSS-only rules run here
      // too; transform.ts drops any warning that comes from a non-CSS embedded block.
      {
        files: [...postcssHtmlConfig.overrides[0].files, ...postcssVueConfig.overrides[0].files],
        customSyntax: embeddedSyntax,
        rules: cssOnlyRules,
      },
      // Preprocessors do not enable CSS-only rules.
      ...PREPROCESSOR_DIALECTS.map(dialect => ({
        files: [`**/*.${dialect}`],
        customSyntax: syntaxes[dialect],
      })),
    ],
    rules: configRules,
    plugins: [...sonarRules, ...stylisticPlugins],
  };
}
