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
// https://sonarsource.github.io/rspec/#/rspec/S6564/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, isTypeAlias } from '../helpers/index.js';
import { meta } from './meta.js';

const COMMON_NODE_TYPES = new Set([
  'TSAnyKeyword',
  'TSBigIntKeyword',
  'TSBooleanKeyword',
  'TSNeverKeyword',
  'TSNullKeyword',
  'TSNumberKeyword',
  'TSStringKeyword',
  'TSSymbolKeyword',
  'TSUndefinedKeyword',
  'TSUnknownKeyword',
  'TSVoidKeyword',
]);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      redundantTypeAlias:
        'Remove this redundant type alias and replace its occurrences with "{{type}}".',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      TSTypeAliasDeclaration(node: estree.Node) {
        const { id, typeAnnotation } = node as unknown as TSESTree.TSTypeAliasDeclaration;
        if (COMMON_NODE_TYPES.has(typeAnnotation.type) || isTypeAlias(typeAnnotation, context)) {
          const sourceCode = context.sourceCode;
          const tpe = sourceCode.getTokens(typeAnnotation as unknown as estree.Node)[0];
          context.report({
            messageId: 'redundantTypeAlias',
            node: id,
            data: {
              type: tpe.value,
            },
          });
        }
      },
    };
  },
};
