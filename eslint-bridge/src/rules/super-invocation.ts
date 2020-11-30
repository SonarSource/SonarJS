/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-3854

import { Linter, Rule } from 'eslint';

const linter = new Linter();
const constructorSuperRule = linter.getRules().get('constructor-super')!;
const noThisBeforeSuperRule = linter.getRules().get('no-this-before-super')!;

export const rule: Rule.RuleModule = {
  // meta of constructor-super is required for issue messages
  ...{ meta: constructorSuperRule.meta },
  create(context: Rule.RuleContext) {
    const constructorSuperListener: Rule.RuleListener = constructorSuperRule.create(context);
    const notThisBeforeSuperListener: Rule.RuleListener = noThisBeforeSuperRule.create(context);

    function merge(m1: Function | undefined, m2: Function | undefined) {
      return (...args: any[]) => {
        if (m1) {
          m1(...args);
        }
        if (m2) {
          m2(...args);
        }
      };
    }

    const superRule = { ...constructorSuperListener };
    for (const m in superRule) {
      if (notThisBeforeSuperListener.hasOwnProperty(m)) {
        superRule[m] = merge(superRule[m], notThisBeforeSuperListener[m]);
      }
    }
    for (const m in notThisBeforeSuperListener) {
      if (!superRule.hasOwnProperty(m) && notThisBeforeSuperListener.hasOwnProperty(m)) {
        superRule[m] = notThisBeforeSuperListener[m];
      }
    }

    return superRule;
  },
};
