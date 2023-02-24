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
import { eslintRules } from 'linting/eslint/rules/core';
import { rules as reactRules } from 'eslint-plugin-react';
import { mergeRules } from './decorators/helpers';

const noDupeKeysRule = eslintRules['no-dupe-keys'];
const jsxNoDuplicatePropsRule = reactRules['jsx-no-duplicate-props'];

export const rule: Rule.RuleModule = {
  // meta of no-dupe-keys and jsx-no-duplicate-props is required for issue messages
  meta: {
    messages: { ...noDupeKeysRule.meta!.messages, ...jsxNoDuplicatePropsRule.meta!.messages },
  },
  create(context: Rule.RuleContext) {
    const noDupeKeysListener: Rule.RuleListener = noDupeKeysRule.create(context);
    const jsxNoDuplicatePropsListener: Rule.RuleListener = jsxNoDuplicatePropsRule.create(context);

    return mergeRules(noDupeKeysListener, jsxNoDuplicatePropsListener);
  },
};
