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

import { Rule } from 'eslint';

/**
 * Merges the listeners of two ESLint-based rules
 *
 * The purpose of this helper function is two merge the behaviour of
 * two different rules. An ESLint rule "listens to" node visits based
 * on a node selector. If the node selector matches, the listener then
 * invokes a callback to proceed further with the node being visited.
 *
 * One needs to pay special attention when merging two rules that their
 * respective listeners don't overlap with one another, e.g., two rules
 * listen to `CallExpression` node vists. Unexpected behaviours could
 * happen otherwise.
 *
 * @param rule1 a rule to merge
 * @param rule2 another rule to merge
 * @returns the merge of the two rules' listeners
 */
export function mergeRules(rule1: Rule.RuleListener, rule2: Rule.RuleListener): Rule.RuleListener {
  const merged = { ...rule1, ...rule2 };
  for (const listener in merged) {
    if (rule1.hasOwnProperty(listener) && rule2.hasOwnProperty(listener)) {
      merged[listener] = mergeListeners(rule1[listener], rule2[listener]);
    }
  }
  return merged;
}

function mergeListeners(listener1: Function | undefined, listener2: Function | undefined) {
  return (...args: any[]) => {
    if (listener1) {
      listener1(...args);
    }
    if (listener2) {
      listener2(...args);
    }
  };
}
