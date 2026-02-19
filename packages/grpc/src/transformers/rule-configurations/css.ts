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
import type { analyzer } from '../../proto/language_analyzer.js';
import { warn } from '../../../../shared/src/helpers/logging.js';
import { isString } from '../../../../shared/src/helpers/sanitize.js';
import { cssRulesMeta, type CssRuleMeta } from '../../../../css/src/rules/metadata.js';
import type { RuleConfig as CssRuleConfig } from '../../../../css/src/linter/config.js';

/** Map from SonarQube key to CSS rule metadata (includes param definitions) */
const cssRuleMetaMap = new Map<string, CssRuleMeta>(cssRulesMeta.map(r => [r.sqKey, r]));

/**
 * Build a CssRuleConfig from a SonarQube rule key and gRPC params.
 *
 * Looks up the rule in cssRuleMetaMap, then builds stylelint configurations
 * mirroring the Java-generated `stylelintOptions()` logic:
 * - For `ignoreParams`: builds `[true, { stylelintOptionKey: splitValues, ... }]`
 * - For `booleanParam`: when true, builds `[true, { optKey: values }]`; when false, `[]`
 * - No params: returns `[]` (stylelint will use `true` as the rule value)
 *
 * @param ruleKey - The SonarQube rule key (e.g. 'S4662')
 * @param params - Rule parameters from the gRPC request
 * @returns CssRuleConfig with stylelint key and configurations, or null if the rule is unknown
 */
export function buildRuleConfigurations(
  ruleKey: string,
  params: analyzer.IRuleParam[],
): CssRuleConfig | null {
  const meta = cssRuleMetaMap.get(ruleKey);
  if (!meta) {
    warn(`Ignoring unknown CSS rule ${ruleKey}. Not found in cssRuleMetaMap.`);
    return null;
  }

  return {
    key: meta.stylelintKey,
    configurations: buildConfigurations(params, meta),
  };
}

function buildConfigurations(params: analyzer.IRuleParam[], meta: CssRuleMeta): unknown[] {
  const { ignoreParams, booleanParam } = meta;

  if (!ignoreParams?.length && !booleanParam) {
    return [];
  }

  const paramsLookup = new Map<string, string>();
  for (const param of params) {
    if (param.key) {
      paramsLookup.set(param.key, isString(param.value) ? param.value : '');
    }
  }

  if (ignoreParams?.length) {
    const secondaryOptions: Record<string, string[]> = {};
    for (const ignoreDef of ignoreParams) {
      const value = paramsLookup.get(ignoreDef.sqKey) ?? ignoreDef.default;
      if (value.trim() !== '') {
        secondaryOptions[ignoreDef.stylelintOptionKey] = value.split(',').map(v => v.trim());
      }
    }
    return Object.keys(secondaryOptions).length > 0 ? [true, secondaryOptions] : [];
  }

  if (booleanParam) {
    const value = paramsLookup.get(booleanParam.sqKey);
    const isEnabled = value !== undefined ? value === 'true' : booleanParam.default;
    if (isEnabled) {
      const secondaryOptions: Record<string, string[]> = {};
      for (const opt of booleanParam.onTrue) {
        secondaryOptions[opt.stylelintOptionKey] = opt.values;
      }
      return [true, secondaryOptions];
    }
    return [];
  }

  return [];
}
