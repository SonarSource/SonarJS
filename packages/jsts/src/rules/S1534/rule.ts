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
// https://sonarsource.github.io/rspec/#/rspec/S1534/javascript

import type { Rule } from 'eslint';
import { getESLintCoreRule } from '../external/core.js';
import { rules as tsEslintRules } from '../typescript-eslint/index.js';
import pkg from 'eslint-plugin-react';
const { rules: reactRules } = pkg;
import { generateMeta, mergeRules } from '../helpers/index.js';
import { decorate } from './decorator.js';
import { meta } from './meta.js';

const noDupeKeysRule = decorate(getESLintCoreRule('no-dupe-keys'));
const noDupeClassMembersRule = tsEslintRules['no-dupe-class-members'];
const jsxNoDuplicatePropsRule = reactRules['jsx-no-duplicate-props'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    hasSuggestions: true,
    messages: {
      ...noDupeKeysRule.meta!.messages,
      ...noDupeClassMembersRule.meta!.messages,
      ...jsxNoDuplicatePropsRule.meta!.messages,
    },
    schema: jsxNoDuplicatePropsRule.schema, // the other 2 rules have no options
  }),
  create(context: Rule.RuleContext) {
    const noDupeKeysListener: Rule.RuleListener = noDupeKeysRule.create(context);
    const noDupeClassMembersListener: Rule.RuleListener = noDupeClassMembersRule.create(context);
    const jsxNoDuplicatePropsListener: Rule.RuleListener = jsxNoDuplicatePropsRule.create(context);

    return mergeRules(noDupeKeysListener, noDupeClassMembersListener, jsxNoDuplicatePropsListener);
  },
};
