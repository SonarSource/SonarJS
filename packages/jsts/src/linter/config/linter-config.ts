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
import { Linter, Rule } from 'eslint';
import { getContext } from '../../../../shared/src/helpers/context.js';
import { customRules } from '../custom-rules/rules.js';
import { extendRuleConfig, RuleConfig } from './rule-config.js';

/**
 * Creates an ESLint linting configuration
 *
 * A linter configuration is created based on the input rules enabled by
 * the user through the active quality profile and the rules provided by
 * the linter wrapper.
 *
 * The configuration includes the rules with their configuration that are
 * used during linting as well as the global variables and the JavaScript
 * execution environments defined through the analyzer's properties.
 *
 * @param inputRules the rules from the active quality profile
 * @param allRules all RuleModules that have been loaded
 * @param globals the global variables
 * @returns the created ESLint linting configuration
 */
export function createLinterConfig(
  inputRules: RuleConfig[],
  allRules: Record<string, Rule.RuleModule>,
  globals: Linter.Globals = {},
) {
  const config: Linter.Config = {
    languageOptions: {
      globals,
    },
    plugins: {
      sonarjs: { rules: allRules },
    },
    rules: {
      ...inputRules.reduce((rules, rule) => {
        rules[`sonarjs/${rule.key}`] = [
          'error',
          /**
           * the rule configuration can be decorated with special markers
           * to activate internal features: a rule that reports secondary
           * locations would be `["error", "sonar-runtime"]`, where the "sonar-runtime"`
           * is a marker for a post-linting processing to decode such locations.
           */
          ...extendRuleConfig(allRules[rule.key].meta?.schema || undefined, rule),
        ];
        return rules;
      }, {} as Linter.RulesRecord),
      /**
       * Custom rules like cognitive complexity and symbol highlighting
       * are always enabled as part of metrics computation. Such rules
       * are, therefore, added in the linting configuration by default.
       *
       * _Internal custom rules are not enabled in SonarLint context._
       */
      ...(getContext().sonarlint
        ? customRules.reduce((rules, rule) => {
            rules[`sonarjs/${rule.ruleId}`] = ['error', ...rule.ruleConfig];
            return rules;
          }, {} as Linter.RulesRecord)
        : {}),
    },
    /* using "max" version to prevent `eslint-plugin-react` from printing a warning */
    settings: { react: { version: '999.999.999' } },
  };
  return config;
}
