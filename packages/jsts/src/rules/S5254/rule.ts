/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S5254/javascript

import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import { rules } from '../external/a11y.js';
import { generateMeta, interceptReport, mergeRules } from '../helpers/index.js';
import { meta } from './meta.js';

const langRule = rules['lang'];
const htmlHasLangRule = rules['html-has-lang'];
const decoratedHasLangRule = decorate(htmlHasLangRule);

function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(rule, (context, reportDescriptor) => {
    const node = (reportDescriptor as any).node as TSESTree.JSXOpeningElement;
    (reportDescriptor as any).node = node.name;
    context.report(reportDescriptor);
  });
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    hasSuggestions: true,
    messages: {
      ...langRule.meta!.messages,
      ...decoratedHasLangRule.meta!.messages,
    },
  }),

  create(context: Rule.RuleContext) {
    const langListener: Rule.RuleListener = langRule.create(context);
    const htmlHasLangListener: Rule.RuleListener = decoratedHasLangRule.create(context);

    return mergeRules(langListener, htmlHasLangListener);
  },
};
