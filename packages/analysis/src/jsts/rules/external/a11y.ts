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

type JsxA11yPluginWithRecommendedConfig = {
  configs?: {
    recommended?: {
      rules?: Record<string, unknown>;
    };
  };
};

type UpstreamRecommendedFieldValue = boolean | string[];
type UpstreamRecommendedConfiguration = Record<string, UpstreamRecommendedFieldValue>;

type UpstreamRecommendedField = {
  field: string;
  default: UpstreamRecommendedFieldValue;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isSupportedUpstreamFieldValue(value: unknown): value is UpstreamRecommendedFieldValue {
  return typeof value === 'boolean' || isStringArray(value);
}

function ruleKey(ruleId: string) {
  return `jsx-a11y/${ruleId}`;
}

export const { rules } = jsxA11yPlugin;

export function extractUpstreamRecommendedConfiguration(
  plugin: JsxA11yPluginWithRecommendedConfig,
  ruleId: string,
): UpstreamRecommendedConfiguration {
  const entry = plugin.configs?.recommended?.rules?.[ruleKey(ruleId)];

  if (!Array.isArray(entry) || !isRecord(entry[1])) {
    throw new Error(
      `eslint-plugin-jsx-a11y: upstream recommended config for ${ruleId} not found; plugin API may have changed`,
    );
  }

  if (!Object.values(entry[1]).every(isSupportedUpstreamFieldValue)) {
    throw new Error(
      `eslint-plugin-jsx-a11y: unsupported upstream recommended config for ${ruleId}; expected boolean or string[] field values`,
    );
  }

  return entry[1];
}

export function getUpstreamRecommendedConfiguration(ruleId: string) {
  return extractUpstreamRecommendedConfiguration(jsxA11yPlugin, ruleId);
}

export function extractUpstreamRecommendedFields(
  plugin: JsxA11yPluginWithRecommendedConfig,
  ruleId: string,
): UpstreamRecommendedField[] {
  return Object.entries(extractUpstreamRecommendedConfiguration(plugin, ruleId)).map(
    ([field, defaultValue]) => ({
      field,
      default: defaultValue,
    }),
  );
}

export function getUpstreamRecommendedFields(ruleId: string) {
  return extractUpstreamRecommendedFields(jsxA11yPlugin, ruleId);
}
