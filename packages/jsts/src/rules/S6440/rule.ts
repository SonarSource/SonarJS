/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S6441/javascript

import { Rule } from 'eslint';
import { rules as reactHooksRules } from 'eslint-plugin-react-hooks';
import { detectReactRule, generateMeta, interceptReport, mergeRules } from '../helpers';
import { meta } from './meta';

const rulesOfHooks = reactHooksRules['rules-of-hooks'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, { ...rulesOfHooks.meta }),
  create(context: Rule.RuleContext) {
    let isReact = false;

    const detectReactListener: Rule.RuleModule = interceptReport(detectReactRule, function () {
      isReact = true;
    });
    const rulesOfHooksListener: Rule.RuleModule = interceptReport(
      rulesOfHooks,
      function (context: Rule.RuleContext, descriptor: Rule.ReportDescriptor) {
        if (isReact) {
          context.report(descriptor);
        }
      },
    );

    return mergeRules(detectReactListener.create(context), rulesOfHooksListener.create(context));
  },
};
