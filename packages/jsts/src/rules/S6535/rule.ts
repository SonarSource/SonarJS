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
// https://sonarsource.github.io/rspec/#/rspec/S6535/javascript

import { Rule } from 'eslint';
import { eslintRules } from '../core';
import { mergeRules } from '../decorators/helpers';

const noUselessEscapeRule = eslintRules['no-useless-escape'];
const noNonoctalDecimalEscapeRule = eslintRules['no-nonoctal-decimal-escape'];

export const rule: Rule.RuleModule = {
  // meta of `no-useless-escape` and `no-nonoctal-decimal-escape` is required for issue messages and quickfixes
  meta: {
    hasSuggestions: true,
    messages: {
      ...noUselessEscapeRule.meta!.messages,
      ...noNonoctalDecimalEscapeRule.meta!.messages,
    },
  },
  create(context: Rule.RuleContext) {
    const noUselessEscapeListener: Rule.RuleListener = noUselessEscapeRule.create(context);
    const notThisBeforeSuperListener: Rule.RuleListener =
      noNonoctalDecimalEscapeRule.create(context);
    return mergeRules(noUselessEscapeListener, notThisBeforeSuperListener);
  },
};
