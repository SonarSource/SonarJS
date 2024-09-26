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
// https://sonarsource.github.io/rspec/#/rspec/S6747/javascript

import { Rule } from 'eslint';
import { rules as reactRules } from 'eslint-plugin-react';
import { rules as jsxA11yRules } from 'eslint-plugin-jsx-a11y';
import { generateMeta, getDependencies, interceptReport, mergeRules } from '../helpers';
import { decorate } from './decorator';
import { TSESTree } from '@typescript-eslint/utils';
import { meta } from './meta';

const noUnknownProp = reactRules['no-unknown-property'];
const decoratedNoUnknownProp = decorate(noUnknownProp);

/**
 * We keep a single occurrence of issues raised by both rules, keeping the ones raised by 'aria-props'
 * in case of duplicate.
 * The current logic relies on the fact that the listener of 'aria-props' runs first because
 * it is alphabetically "smaller", which is how we set them up in mergeRules.
 */

/**
 * start offsets of nodes that raised issues in eslint-plugin-jsx-a11y's aria-props
 */
const flaggedNodeStarts = new Map();

const ariaPropsRule = jsxA11yRules['aria-props'];
const decoratedAriaPropsRule = interceptReport(ariaPropsRule, (context, descriptor) => {
  if ('node' in descriptor) {
    const start = (descriptor.node as TSESTree.Node).range[0];
    if (!flaggedNodeStarts.get(start)) {
      flaggedNodeStarts.set(start, true);
      context.report(descriptor);
    }
  }
});

const twiceDecoratedNoUnknownProp = interceptReport(
  decoratedNoUnknownProp,
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
    hasSuggestions: true,
    messages: {
      ...decoratedAriaPropsRule.meta!.messages,
      ...twiceDecoratedNoUnknownProp.meta!.messages,
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignore: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
    ],
  }),

  create(context: Rule.RuleContext) {
    const dependencies = getDependencies(context.filename);
    if (!dependencies.has('react')) {
      return {};
    }

    const ariaPropsListener: Rule.RuleListener = decoratedAriaPropsRule.create(context);
    const noUnknownPropListener: Rule.RuleListener = twiceDecoratedNoUnknownProp.create(context);

    return mergeRules(ariaPropsListener, noUnknownPropListener);
  },
};
