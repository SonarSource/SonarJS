/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import { debug, getContext } from 'helpers';
import { CustomRule, LinterWrapper, RuleConfig } from './linter';

export * from './linter';
export * from './rules';

/**
 * The global ESLint linter wrapper
 *
 * The global linter wrapper is expected to be initialized before use.
 * To this end, the plugin is expected to explicitey send a request to
 * initialize the linter before starting the actual analysis of a file.
 */
export let linter: LinterWrapper;

/**
 * Initializes the global linter wrapper
 * @param inputRules the rules from the active quality profiles
 * @param environments the JavaScript execution environments
 * @param globals the global variables
 */
export function initializeLinter(
  inputRules: RuleConfig[],
  environments: string[] = [],
  globals: string[] = [],
) {
  const { bundles } = getContext();
  const customRules = loadBundles(bundles);

  debug(`initializing linter with ${inputRules.map(rule => rule.key)}`);
  linter = new LinterWrapper(inputRules, customRules, environments, globals);
}

/**
 * Returns true if the global linter wrapper is initialized.
 */
export function isLinterInitializationError() {
  return !linter;
}

/**
 * Loads rule bundles
 *
 * A rule bundle is a set of external custom rules (like the taint analysis rule)
 * including rule keys and rule definitions that cannot be provided to the linter
 * wrapper using the same feeding channel as rules from the active quality profile.
 *
 * @param bundles the path of rule bundles to load
 * @returns a set of custom rules
 */
function loadBundles(bundles: string[]) {
  const customRules: CustomRule[] = [];
  for (const ruleBundle of bundles) {
    const bundle = require(ruleBundle);
    customRules.push(...bundle.rules);
    const ruleIds = bundle.rules.map((r: CustomRule) => r.ruleId);
    debug(`Loaded rules ${ruleIds} from ${ruleBundle}`);
  }
  return customRules;
}
