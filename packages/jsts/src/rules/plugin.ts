/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
/**
 * This is the entry point of the ESLint Plugin.
 * Said differently, this is the public API of the ESLint Plugin.
 */
import type { Linter } from 'eslint';

import { rules } from './plugin-rules.js';

const recommendedLegacyConfig: Linter.Config = { plugins: ['sonarjs'], rules: {} };
const recommendedConfig: Linter.FlatConfig & {
  rules: Linter.RulesRecord;
} = {
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
  const recommended = rule.meta?.docs?.recommended || false;

  recommendedConfig.rules[`sonarjs/${key}`] = recommended ? 'error' : 'off';
}

recommendedLegacyConfig.rules = recommendedConfig.rules;
recommendedLegacyConfig.settings = recommendedConfig.settings;

export const configs = {
  recommended: recommendedConfig,
  'recommended-legacy': recommendedLegacyConfig,
};

/**
 * I kept the meta export for compatibility, but we need to find a way to populate it without relying on the package manifest
 */
export const meta = {
  name: 'eslint-plugin-sonarjs',
  version: '0.0.0-SNAPSHOT',
};

export { rules };

export default { rules, configs, meta };
