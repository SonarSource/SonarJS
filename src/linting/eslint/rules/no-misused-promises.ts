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
// https://sonarsource.github.io/rspec/#/rspec/S6544/javascript

import { Rule } from 'eslint';
import { rules as typeScriptESLintRules } from '@typescript-eslint/eslint-plugin';
import { eslintRules } from 'linting/eslint/rules/core';
import { interceptReport, mergeRules } from '../rules/decorators/helpers';
import { sanitizeTypeScriptESLintRule } from '../linter/decoration';
import { TSESTree } from '@typescript-eslint/experimental-utils';

/**
 * We keep a single occurence of issues raised by both rules, discarding the ones raised by 'no-async-promise-executor'
 * The current logic relies on the fact that the listener of 'no-misused-promises' runs first because
 * it is alphabetically "smaller", which is how we set them up in mergeRules.
 */

/**
 * start offsets of nodes that raised issues in typescript-eslint's no-misused-promises
 */
const flaggedNodeStarts = new Map();

const noMisusedPromisesRule = sanitizeTypeScriptESLintRule(
  typeScriptESLintRules['no-misused-promises'],
);
const decoratedNoMisusedPromisesRule = interceptReport(
  noMisusedPromisesRule,
  (context, descriptor) => {
    if ('node' in descriptor) {
      const start = (descriptor.node as TSESTree.Node).range[0];
      flaggedNodeStarts.set(start, true);
    }
    context.report(descriptor);
  },
);

const noFloatingPromisesRule = sanitizeTypeScriptESLintRule(
  typeScriptESLintRules['no-floating-promises'],
);

const noAsyncPromiseExecutorRule = eslintRules['no-async-promise-executor'];
const decoratedNoAsyncPromiseExecutorRule = interceptReport(
  noAsyncPromiseExecutorRule,
  (context, descriptor) => {
    if ('node' in descriptor) {
      const start = (descriptor.node as TSESTree.Node).range[0];
      if (!flaggedNodeStarts.get(start)) {
        context.report(descriptor);
      }
    }
  },
);

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      ...decoratedNoMisusedPromisesRule.meta!.messages,
      ...decoratedNoAsyncPromiseExecutorRule.meta!.messages,
      ...noFloatingPromisesRule.meta!.messages,
    },
    hasSuggestions: true,
  },
  create(context: Rule.RuleContext) {
    return {
      'Program:exit': () => {
        flaggedNodeStarts.clear();
      },
      ...mergeRules(
        decoratedNoAsyncPromiseExecutorRule.create(context),
        decoratedNoMisusedPromisesRule.create(context),
        noFloatingPromisesRule.create(context),
      ),
    };
  },
};
