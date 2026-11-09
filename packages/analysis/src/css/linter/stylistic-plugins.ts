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
import plugins from '@stylistic/stylelint-plugin';
import { meta } from '../rules/S1116/meta.js';
import { debug } from '../../../../shared/src/helpers/logging.js';

const semicolonBindings = new Set<string>(meta.bindings.map(binding => binding.stylelintKey));

/**
 * Plugin v6 emits untyped configuration advisories as ordinary rule violations.
 * S1116 has one violation message, exposed by the plugin's public messages API.
 * Keep that message and structured Stylelint diagnostics, without depending on
 * the wording of advisories such as the request to enable charset validation.
 */
export const stylisticPlugins = plugins.map(plugin => {
  if (!('ruleName' in plugin) || !semicolonBindings.has(plugin.ruleName)) {
    return plugin;
  }
  const upstream = plugin.rule;
  const rule: stylelint.RuleBase = (...options) => {
    const check = upstream(...options);
    return async (root, result) => {
      const scopedResult = Object.create(result) as stylelint.PostcssResult;
      scopedResult.messages = [];
      await check(root, scopedResult);
      for (const message of scopedResult.messages) {
        if (
          message.type !== 'warning' ||
          'stylelintType' in message ||
          message.text === upstream.messages.rejected
        ) {
          result.messages.push(message);
        } else {
          debug(message.text);
        }
      }
    };
  };
  return { ...plugin, rule: Object.assign(rule, upstream) };
});
