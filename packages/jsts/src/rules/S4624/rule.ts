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
// https://sonarsource.github.io/rspec/#/rspec/S4624

import type { TSESTree } from '@typescript-eslint/utils';
import { ancestorsChain, generateMeta } from '../helpers/index.js';
import type { Rule } from 'eslint';
import estree from 'estree';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      nestedTemplateLiterals: 'Refactor this code to not use nested template literals.',
    },
  }),
  create(context) {
    return {
      'TemplateLiteral TemplateLiteral': (node: estree.Node) => {
        const ancestors = ancestorsChain(node as TSESTree.Node, new Set(['TemplateLiteral']));
        const nestingTemplate = ancestors[ancestors.length - 1];

        const { start: nestingStart, end: nestingEnd } = nestingTemplate.loc;
        const { start: nestedStart, end: nestedEnd } = (node as TSESTree.Node).loc;

        if (nestedStart.line === nestingStart.line || nestedEnd.line === nestingEnd.line) {
          context.report({
            messageId: 'nestedTemplateLiterals',
            node,
          });
        }
      },
    };
  },
};
