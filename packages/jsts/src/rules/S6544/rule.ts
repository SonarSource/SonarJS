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
// https://sonarsource.github.io/rspec/#/rspec/S6544/javascript

import type { Rule } from 'eslint';
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { getESLintCoreRule } from '../external/core.js';
import {
  FUNCTION_NODES,
  generateMeta,
  getMainFunctionTokenLocation,
  interceptReport,
  mergeRules,
  RuleContext,
} from '../helpers/index.js';
import type { TSESTree } from '@typescript-eslint/utils';
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

const noAsyncPromiseExecutorRule = getESLintCoreRule('no-async-promise-executor');
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
