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
// https://sonarsource.github.io/rspec/#/rspec/S5257/javascript

import type { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/utils';
import estree from 'estree';
import { generateMeta, isPresentationTable } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      noLayoutTable: 'Replace this layout table with a CSS layout.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      JSXOpeningElement(node: estree.Node) {
        const jsxNode = node as unknown as TSESTree.JSXOpeningElement;
        if (isPresentationTable(context, jsxNode)) {
          context.report({
            node,
            messageId: 'noLayoutTable',
          });
        }
      },
    };
  },
};
