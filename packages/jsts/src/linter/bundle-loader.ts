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
import { Linter, Rule } from 'eslint';
import { rules as internalRules } from '../rules/index.js';
import { customRules as internalCustomRules } from './custom-rules/rules.js';
import { debug } from '../../../shared/src/helpers/logging.js';
import { getContext } from '../../../shared/src/helpers/context.js';
import type { CustomRule } from './custom-rules/custom-rule.js';

export function loadCustomRules(linter: Linter, rules: CustomRule[] = []) {
  for (const rule of rules) {
    linter.defineRule(rule.ruleId, rule.ruleModule);
  }
}

export async function loadBundles(linter: Linter, rulesBundles: (keyof typeof loaders)[]) {
  for (const bundleId of rulesBundles) {
    await loaders[bundleId](linter);
  }
}

/**
 * Loaders for each of the predefined rules bundles. Each bundle comes with a
 * different data structure (array/record/object).
 */
const loaders: { [key: string]: Function } = {
  /**
   * Loads internal rules
   *
   * Adds the rules from SonarJS plugin, i.e. rules in path
   * /src/rules
   */
  internalRules(linter: Linter) {
    linter.defineRules(internalRules as unknown as { [name: string]: Rule.RuleModule });
  },
  /**
   * Loads global context rules
   *
   * Context bundles define a set of external custom rules (like the taint analysis rule)
   * including rule keys and rule definitions that cannot be provided to the linter
   * wrapper using the same feeding channel as rules from the active quality profile.
   */
  async contextRules(linter: Linter) {
    const { bundles } = getContext();
    const customRules: CustomRule[] = [];
    for (const ruleBundle of bundles) {
      const bundle = await import(new URL(ruleBundle).toString());
      customRules.push(...bundle.rules);
      const ruleIds = bundle.rules.map((r: CustomRule) => r.ruleId);
      debug(`Loaded rules ${ruleIds} from ${ruleBundle}`);
    }
    loadCustomRules(linter, customRules);
  },
  /**
   * Loads internal custom rules
   *
   * These are rules used internally by SonarQube to have the symbol highlighting and
   * the cognitive complexity metrics.
   */
  internalCustomRules(linter: Linter) {
    loadCustomRules(linter, internalCustomRules);
  },
};
