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
// https://sonarsource.github.io/rspec/#/rspec/S1534/javascript

import { Rule } from 'eslint';
import { eslintRules } from '../core';
import { tsEslintRules } from '../typescript-eslint';
import { rules as reactRules } from 'eslint-plugin-react';
import { mergeRules } from '../helpers';
import { decorate } from './decorator';

const noDupeKeysRule = decorate(eslintRules['no-dupe-keys']);
const noDupeClassMembersRule = tsEslintRules['no-dupe-class-members'];
const jsxNoDuplicatePropsRule = reactRules['jsx-no-duplicate-props'];

export const rule: Rule.RuleModule = {
  /**
   * The metadata from `no-dupe-class-members` and `jsx-no-duplicate-props` are required for issue messages.
   * However, we don't include those from `no-dupe-keys` because of a duplicate message id, and we use instead
   * the message id from `no-dupe-class-members`, which is a bit more generic.
   */
  meta: {
    hasSuggestions: true,
    messages: {
      ...noDupeClassMembersRule.meta!.messages,
      ...jsxNoDuplicatePropsRule.meta!.messages,
    },
  },
  create(context: Rule.RuleContext) {
    const noDupeKeysListener: Rule.RuleListener = noDupeKeysRule.create(context);
    const noDupeClassMembersListener: Rule.RuleListener = noDupeClassMembersRule.create(context);
    const jsxNoDuplicatePropsListener: Rule.RuleListener = jsxNoDuplicatePropsRule.create(context);

    return mergeRules(noDupeKeysListener, noDupeClassMembersListener, jsxNoDuplicatePropsListener);
  },
};
