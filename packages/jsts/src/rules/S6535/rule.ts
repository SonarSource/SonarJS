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
// https://sonarsource.github.io/rspec/#/rspec/S6535/javascript

import type { Rule } from 'eslint';
import { getESLintCoreRule } from '../external/core.js';
import { generateMeta, interceptReport, mergeRules } from '../helpers/index.js';
import * as meta from './generated-meta.js';

/**
 * We want to merge ESLint rules 'no-useless-escape' and 'no-nonoctal-decimal-escape'. However,
 * both share a common message id 'escapeBackslash' but a different description for quickfixes.
 * To prevent one overwriting the other, we need to decorate one and map the conflicting message
 * id to a different one when intercepting a report.
 *
 * Here we arbitrarily choose to decorate 'no-nonoctal-decimal-escape'.
 */
const noUselessEscapeRule = getESLintCoreRule('no-useless-escape');
const noNonoctalDecimalEscapeRule = getESLintCoreRule('no-nonoctal-decimal-escape');

/**
 * We decorate 'no-nonoctal-decimal-escape' to map suggestions with the message id 'escapeBackslash' to 'nonOctalEscapeBacklash'.
 */
const decoratedNoNonoctalDecimalEscapeRule = decorateNoNonoctalDecimalEscape(
  noNonoctalDecimalEscapeRule,
);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
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
