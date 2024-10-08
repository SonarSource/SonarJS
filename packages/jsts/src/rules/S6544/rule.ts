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
// https://sonarsource.github.io/rspec/#/rspec/S6544/javascript

import type { Rule } from 'eslint';
import { tsEslintRules } from '../typescript-eslint/index.js';
import { eslintRules } from '../core/index.js';
import {
  FUNCTION_NODES,
  generateMeta,
  getMainFunctionTokenLocation,
  interceptReport,
  mergeRules,
  RuleContext,
} from '../helpers/index.js';
import { TSESTree } from '@typescript-eslint/utils';
import { meta } from './meta.js';

/**
 * We keep a single occurrence of issues raised by both rules, discarding the ones raised by 'no-async-promise-executor'
 * The current logic relies on the fact that the listener of 'no-misused-promises' runs first because
 * it is alphabetically "smaller", which is how we set them up in mergeRules.
 */

/**
 * start offsets of nodes that raised issues in typescript-eslint's no-misused-promises
 */
const flaggedNodeStarts = new Map();

const noMisusedPromisesRule = tsEslintRules['no-misused-promises'];
const decoratedNoMisusedPromisesRule = interceptReport(
  noMisusedPromisesRule,
  (context, descriptor) => {
    if ('node' in descriptor) {
      const node = descriptor.node as TSESTree.Node;
      const start = node.range[0];
      if (!flaggedNodeStarts.get(start)) {
        flaggedNodeStarts.set(start, true);
        if (FUNCTION_NODES.includes(node.type)) {
          const loc = getMainFunctionTokenLocation(
            node as TSESTree.FunctionLike,
            node.parent,
            context as unknown as RuleContext,
          );
          context.report({ ...descriptor, loc });
        } else {
          context.report(descriptor);
        }
      }
    }
  },
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
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      ...decoratedNoMisusedPromisesRule.meta!.messages,
      ...decoratedNoAsyncPromiseExecutorRule.meta!.messages,
    },
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {},
      },
    ],
  }),
  create(context: Rule.RuleContext) {
    return {
      'Program:exit': () => {
        flaggedNodeStarts.clear();
      },
      ...mergeRules(
        decoratedNoAsyncPromiseExecutorRule.create(context),
        decoratedNoMisusedPromisesRule.create(context),
      ),
    };
  },
};
