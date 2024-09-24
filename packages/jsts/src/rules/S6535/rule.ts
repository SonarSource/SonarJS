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
// https://sonarsource.github.io/rspec/#/rspec/S6535/javascript

import { Rule } from 'eslint';
import { eslintRules } from '../core/index.ts';
import { generateMeta, interceptReport, mergeRules } from '../helpers/index.ts';
import { meta } from './meta.ts';

/**
 * We want to merge ESLint rules 'no-useless-escape' and 'no-nonoctal-decimal-escape'. However,
 * both share a common message id 'escapeBackslash' but a different description for quickfixes.
 * To prevent one overwriting the other, we need to decorate one and map the conflicting message
 * id to a different one when intercepting a report.
 *
 * Here we arbitrarily choose to decorate 'no-nonoctal-decimal-escape'.
 */
const noUselessEscapeRule = eslintRules['no-useless-escape'];
const noNonoctalDecimalEscapeRule = eslintRules['no-nonoctal-decimal-escape'];

/**
 * We decorate 'no-nonoctal-decimal-escape' to map suggestions with the message id 'escapeBackslash' to 'nonOctalEscapeBacklash'.
 */
const decoratedNoNonoctalDecimalEscapeRule = decorateNoNonoctalDecimalEscape(
  noNonoctalDecimalEscapeRule,
);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    ...decoratedNoNonoctalDecimalEscapeRule.meta,
    ...noUselessEscapeRule.meta,
    messages: {
      /**
       * We replace the message id 'escapeBackslash' of 'no-nonoctal-decimal-escape' with 'nonOctalEscapeBacklash'.
       */
      nonOctalEscapeBacklash: noNonoctalDecimalEscapeRule.meta!.messages!['escapeBackslash'],
      ...decoratedNoNonoctalDecimalEscapeRule.meta!.messages,
      ...noUselessEscapeRule.meta!.messages,
    },
  }),
  create(context: Rule.RuleContext) {
    const noUselessEscapeListener: Rule.RuleListener = noUselessEscapeRule.create(context);
    const decoratedNoNonoctalDecimalEscapeListener: Rule.RuleListener =
      decoratedNoNonoctalDecimalEscapeRule.create(context);
    return mergeRules(noUselessEscapeListener, decoratedNoNonoctalDecimalEscapeListener);
  },
};

function decorateNoNonoctalDecimalEscape(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(rule, (context, descriptor) => {
    const { suggest, ...rest } = descriptor;
    suggest?.forEach(s => {
      const suggestion = s as { messageId: string };
      if (suggestion.messageId === 'escapeBackslash') {
        suggestion.messageId = 'nonOctalEscapeBacklash';
      }
    });
    context.report({ suggest, ...rest });
  });
}
