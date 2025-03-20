/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S1534/javascript

import type { Rule } from 'eslint';
import { getESLintCoreRule } from '../external/core.js';
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { rules as reactRules } from '../external/react.js';
import { generateMeta, mergeRules } from '../helpers/index.js';
import { decorate } from './decorator.js';
import * as meta from './generated-meta.js';

const noDupeKeysRule = decorate(getESLintCoreRule('no-dupe-keys'));
const noDupeClassMembersRule = tsEslintRules['no-dupe-class-members'];
const jsxNoDuplicatePropsRule = reactRules['jsx-no-duplicate-props'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    hasSuggestions: true,
    messages: {
      ...noDupeKeysRule.meta!.messages,
      ...noDupeClassMembersRule.meta!.messages,
      ...jsxNoDuplicatePropsRule.meta!.messages,
    },
    schema: jsxNoDuplicatePropsRule.meta!.schema, // the other 2 rules have no options
  }),
  create(context: Rule.RuleContext) {
    const noDupeKeysListener: Rule.RuleListener = noDupeKeysRule.create(context);
    const noDupeClassMembersListener: Rule.RuleListener = noDupeClassMembersRule.create(context);
    const jsxNoDuplicatePropsListener: Rule.RuleListener = jsxNoDuplicatePropsRule.create(context);

    return mergeRules(noDupeKeysListener, noDupeClassMembersListener, jsxNoDuplicatePropsListener);
  },
};
