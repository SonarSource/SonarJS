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
import type { Rule } from 'eslint';

/**
 * Merges the listeners of an arbitrary number of ESLint-based rules
 *
 * The purpose of this helper function is to merge the behaviour of a
 * variable number of rules. An ESLint rule "listens to" node visits based
 * on a node selector. If the node selector matches, the listener then
 * invokes a callback to proceed further with the node being visited.
 *
 * It supports when multiple rules share the same listeners, e.g., 2 rules
 * listen to `CallExpression` node visits. They will be run one after the other.
 *
 * @param rules rules to merge
 * @returns the merge of the rules' listeners
 */
export function mergeRules(...rules: Rule.RuleListener[]): Rule.RuleListener {
  const merged = Object.assign({}, ...rules);

  for (const listener of Object.keys(merged)) {
    merged[listener] = mergeListeners(...rules.map(rule => rule[listener]));
  }
  return merged;
}

function mergeListeners(...listeners: (Function | undefined)[]) {
  return (...args: any[]) => {
    for (const listener of listeners) {
      if (listener) {
        listener(...args);
      }
    }
  };
}
