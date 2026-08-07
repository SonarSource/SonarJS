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
import type { ESLint, Linter } from 'eslint';

type PluginRules = NonNullable<ESLint.Plugin['rules']>;

export function createConfigs(rules: PluginRules, recommendedRules?: ReadonlySet<string>): {
  recommended: Linter.FlatConfig;
  'recommended-legacy': Linter.LegacyConfig;
} {
  const recommendedLegacyConfig: Linter.LegacyConfig = { plugins: ['sonarjs'], rules: {} };
  const recommendedConfig: Linter.FlatConfig = {
    name: 'sonarjs/recommended',
    plugins: {
      sonarjs: {
        rules,
      },
    },
    rules: {},
    settings: {
      react: {
        version: '999.999.999',
      },
    },
  };

  for (const [key, rule] of Object.entries(rules)) {
    const recommended = recommendedRules?.has(key) ?? rule.meta?.docs?.recommended ?? false;
    recommendedConfig.rules![`sonarjs/${key}`] = recommended ? 'error' : 'off';
  }

  recommendedLegacyConfig.rules = recommendedConfig.rules;
  recommendedLegacyConfig.settings = recommendedConfig.settings;

  return {
    recommended: recommendedConfig,
    'recommended-legacy': recommendedLegacyConfig,
  };
}

export const meta = {
  name: 'eslint-plugin-sonarjs',
  version: '0.0.0-SNAPSHOT',
};
