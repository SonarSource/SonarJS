/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S1874/javascript

import { Rule } from 'eslint';
import { rule as diagnosticsRule } from './rule.diagnostics';
import { rules } from 'eslint-plugin-react';
import { mergeRules } from '../helpers';

const reactNoDeprecated = rules['no-deprecated'];

export const rule: Rule.RuleModule = {
  meta: {
    messages: { ...reactNoDeprecated.meta!.messages, ...diagnosticsRule.meta!.messages },
  },
  create(context: Rule.RuleContext) {
    if (context.parserServices?.packageJson?.dependencies?.react) {
      if (!context.hasOwnProperty('settings')) {
        context.settings = {};
      }
      if (!context.settings.hasOwnProperty('react')) {
        context.settings.react = {};
      }
      context.settings.react.version = context.parserServices.packageJson.dependencies.react;
    }
    return mergeRules(reactNoDeprecated.create(context), diagnosticsRule.create(context));
  },
};
