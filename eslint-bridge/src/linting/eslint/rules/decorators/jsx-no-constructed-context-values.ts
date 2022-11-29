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
// https://sonarsource.github.io/rspec/#/rspec/S6481/javascript

import { Rule } from 'eslint';

export function decorateJsxNoConstructedContextValues(rule: Rule.RuleModule): Rule.RuleModule {
  return changeRuleMessagesWith(rule, lineRemover());
}

function changeRuleMessagesWith(
  rule: Rule.RuleModule,
  messageChanger: (message: string) => string,
) {
  rule.meta!.messages = Object.fromEntries(
    Object.entries(rule.meta!.messages!).map(([key, value]) => [key, messageChanger(value)]),
  );
  return rule;
}

function lineRemover() {
  const lineRegexp = / \(at line [^)]+\)/;
  return (message: string) => message.replace(lineRegexp, '');
}
