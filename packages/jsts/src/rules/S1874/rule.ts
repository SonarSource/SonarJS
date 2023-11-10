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
import { createProxy } from '@sonar/shared/helpers';

const reactNoDeprecated = rules['no-deprecated'];

export const rule: Rule.RuleModule = {
  meta: {
    messages: { ...reactNoDeprecated.meta!.messages, ...diagnosticsRule.meta!.messages },
  },
  create(context: Rule.RuleContext) {
    function getVersionFromOptions() {
      return context.options?.[0]?.['react-version'];
    }
    function getVersionFromPackageJson() {
      return context.parserServices?.packageJson?.dependencies?.react;
    }

    const reactVersion = getVersionFromOptions() || getVersionFromPackageJson();
    const patchedContext = reactVersion
      ? createProxy(context, ['settings', 'react', 'version'], reactVersion)
      : context;
    return mergeRules(reactNoDeprecated.create(patchedContext), diagnosticsRule.create(context));
  },
};
