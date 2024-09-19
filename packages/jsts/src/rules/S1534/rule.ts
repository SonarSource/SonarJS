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

import { Rule } from 'eslint';
import { eslintRules } from '../core';
import { tsEslintRules } from '../typescript-eslint';
import { generateMeta, mergeRules } from '../helpers';
import { decorate } from './decorator';
import { meta } from './meta';

export const rule: Rule.RuleModule = (async () => {
  const noDupeKeysRule = decorate(eslintRules['no-dupe-keys']);
  const noDupeClassMembersRule = tsEslintRules['no-dupe-class-members'];

  const ruleMeta = {
    hasSuggestions: true,
    messages: {
      ...noDupeKeysRule.meta!.messages,
      ...noDupeClassMembersRule.meta!.messages,
    }
  };

  const noDupeKeysListener: Rule.RuleListener = noDupeKeysRule.create;
  const noDupeClassMembersListener: Rule.RuleListener = noDupeClassMembersRule.create;

  const rules = [noDupeKeysListener, noDupeClassMembersListener];

  try {
    require.resolve('eslint-plugin-react');
    const { rules: reactRules } = await import('eslint-plugin-react');
    const jsxNoDuplicatePropsRule = reactRules['jsx-no-duplicate-props'];
    Object.assign(ruleMeta.messages, jsxNoDuplicatePropsRule);
    ruleMeta.schema = jsxNoDuplicatePropsRule.schema; // the other 2 rules have no options
    const jsxNoDuplicatePropsListener: Rule.RuleListener = jsxNoDuplicatePropsRule.create;
    rules.push(jsxNoDuplicatePropsListener);
  } catch {}

  return {
    meta: generateMeta(meta as Rule.RuleMetaData, ruleMeta),
    create(context: Rule.RuleContext) {
      return mergeRules(rules.map((rule) => rule(context)));
    }
  }
})();
