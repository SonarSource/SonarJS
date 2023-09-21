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
// https://sonarsource.github.io/rspec/#/rspec/S6749/javascript

import { Rule } from 'eslint';
import { interceptReport } from '../helpers';

/**
 * The core implementation of the rule reports on empty React fragments.
 * Also, one of the two issue messages include a Unicode character.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  rule.meta!.hasSuggestions = true;
  rule.meta!.messages = {
    ...rule.meta!.messages,
    /* Map to a more friendly message */
    NeedsMoreChildren: 'A fragment with only one child is redundant.',
  };
  return interceptReport(rule, (context, descriptor) => {
    const { messageId, node, ...rest } = descriptor as any;

    /* Ignore empty fragments */
    if (node.type === 'JSXFragment' && node.children.length === 0) {
      return;
    }

    context.report({ messageId, node, ...rest });
  });
}
