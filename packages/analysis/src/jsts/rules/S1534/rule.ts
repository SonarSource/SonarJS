/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import { rules as vueRules } from '../external/vue.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { mergeRules } from '../helpers/decorators/merger.js';
import { decorate } from './decorator.js';
import * as meta from './generated-meta.js';

const noDupeKeysRule = decorate(getESLintCoreRule('no-dupe-keys'));
const noDupeClassMembersRule = tsEslintRules['no-dupe-class-members'];
const jsxNoDuplicatePropsRule = reactRules['jsx-no-duplicate-props'];
const vueNoDuplicateAttributesRule = vueRules['no-duplicate-attributes'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    hasSuggestions: true,
    messages: {
      ...noDupeKeysRule.meta!.messages,
      ...noDupeClassMembersRule.meta!.messages,
      ...jsxNoDuplicatePropsRule.meta!.messages,
      ...vueNoDuplicateAttributesRule.meta?.messages,
    },
    schema: [
      {
        type: 'object',
        properties: {
          ...(jsxNoDuplicatePropsRule.meta!.schema as { properties: object }[])[0].properties,
          ...(
            vueNoDuplicateAttributesRule.meta?.schema as { properties: object }[] | undefined
          )?.[0]?.properties,
        },
        additionalProperties: false,
      },
    ], // the other 2 rules have no options
  }),
  create(context: Rule.RuleContext) {
    const noDupeKeysListener: Rule.RuleListener = noDupeKeysRule.create(context);
    const noDupeClassMembersListener: Rule.RuleListener = noDupeClassMembersRule.create(context);
    const jsxNoDuplicatePropsListener: Rule.RuleListener = jsxNoDuplicatePropsRule.create(context);
    const vueNoDuplicateAttributesListener: Rule.RuleListener =
      vueNoDuplicateAttributesRule.create(context);

    return mergeRules(
      noDupeKeysListener,
      noDupeClassMembersListener,
      jsxNoDuplicatePropsListener,
      vueNoDuplicateAttributesListener,
    );
  },
};
