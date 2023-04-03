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
// https://sonarsource.github.io/rspec/#/rspec/S6564/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { getVariableFromScope } from './helpers';

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
  meta: {
    messages: {
      redundantTypeAlias:
        'Remove this redundant type alias and replace its occurrences with "{{type}}".',
    },
  },
  create(context: Rule.RuleContext) {
    function isAliasType(node: TSESTree.TypeNode) {
      if (
        node.type !== 'TSTypeReference' ||
        node.typeName.type !== 'Identifier' ||
        node.typeParameters
      ) {
        return false;
      }
      const scope = context.getScope();
      const variable = getVariableFromScope(scope, node.typeName.name);
      return variable?.defs.some(def => def.node.type === 'TSTypeAliasDeclaration');
    }
    return {
      TSTypeAliasDeclaration(node: estree.Node) {
        const { id, typeAnnotation } = node as unknown as TSESTree.TSTypeAliasDeclaration;
        if (COMMON_NODE_TYPES.has(typeAnnotation.type) || isAliasType(typeAnnotation)) {
          const sourceCode = context.getSourceCode();
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
