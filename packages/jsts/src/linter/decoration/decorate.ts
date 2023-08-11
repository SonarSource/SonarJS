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
import { Rule } from 'eslint';
import { decorators } from '../../rules/decorators';

/**
 * Decorates external rules
 *
 * Decorating an external rule means customizing the original behaviour of the rule that
 * can't be done through rule configuration and requires special adjustments, among which
 * are internal decorators.
 *
 * @param externalRules the external rules to decorate
 */
export function decorateExternalRules(externalRules: { [name: string]: Rule.RuleModule }): {
  [name: string]: Rule.RuleModule;
} {
  const decoratedRules = { ...externalRules };

  /**
   * Decorate (TypeScript-) ESLint external rules
   *
   * External rules are decorated with internal decorators to refine their
   * behaviour: exceptions, quick fixes, secondary locations, etc.
   */
  for (const ruleKey in decorators) {
    decoratedRules[ruleKey] = decorators[ruleKey](decoratedRules[ruleKey]);
  }
  return decoratedRules;
}
