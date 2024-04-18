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
// https://sonarsource.github.io/rspec/#/rspec/S5254/javascript

import { TSESTree } from '@typescript-eslint/utils';
import { Rule } from 'eslint';
import { rules as jsxA11yRules } from 'eslint-plugin-jsx-a11y';
import { interceptReport, mergeRules } from '../helpers';

const langRule = jsxA11yRules['lang'];
const htmlHasLangRule = jsxA11yRules['html-has-lang'];
const decoratedHasLangRule = decorate(htmlHasLangRule);

function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(rule, (context, reportDescriptor) => {
    const node = (reportDescriptor as any).node as TSESTree.JSXOpeningElement;
    (reportDescriptor as any).node = node.name;
    context.report(reportDescriptor);
  });
}

export const rule: Rule.RuleModule = {
  meta: {
    hasSuggestions: true,
    messages: {
      ...langRule.meta!.messages,
      ...decoratedHasLangRule.meta!.messages,
    },
  },

  create(context: Rule.RuleContext) {
    const langListener: Rule.RuleListener = langRule.create(context);
    const htmlHasLangListener: Rule.RuleListener = decoratedHasLangRule.create(context);

    return mergeRules(langListener, htmlHasLangListener);
  },
};
