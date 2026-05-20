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
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';

export type Allowlist = Record<string, string[]>;

type JsxA11yPluginWithRecommendedConfig = {
  configs?: {
    recommended?: {
      rules?: Record<string, unknown>;
    };
  };
};

const RULE_KEY = 'jsx-a11y/no-noninteractive-element-to-interactive-role';

function isAllowlist(value: unknown): value is Allowlist {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every(
      roles => Array.isArray(roles) && roles.every(role => typeof role === 'string'),
    )
  );
}

export function extractUpstreamAllowlist(plugin: JsxA11yPluginWithRecommendedConfig): Allowlist {
  const entry = plugin.configs?.recommended?.rules?.[RULE_KEY];
  if (!Array.isArray(entry) || !isAllowlist(entry[1])) {
    throw new Error(
      'eslint-plugin-jsx-a11y: upstream allowlist for no-noninteractive-element-to-interactive-role not found; plugin API may have changed',
    );
  }
  return entry[1];
}

export function getUpstreamAllowlist(): Allowlist {
  return extractUpstreamAllowlist(jsxA11yPlugin);
}
