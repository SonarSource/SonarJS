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
// https://sonarsource.github.io/rspec/#/rspec/S4622/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, isIdentifier, UTILITY_TYPES } from '../helpers/index.js';
import { FromSchema } from 'json-schema-to-ts';
import { meta, schema } from './meta.js';

const DEFAULT_THRESHOLD = 3;

const messages = {
  refactorUnion: 'Refactor this union type to have less than {{threshold}} elements.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, { messages, schema }),
  create(context: Rule.RuleContext) {
    return {
      TSUnionType: (node: estree.Node) => {
        const union = node as unknown as TSESTree.TSUnionType;
        if (isUsedWithUtilityType(union)) {
          return;
        }
        const threshold =
          (context.options as FromSchema<typeof schema>)[0]?.threshold ?? DEFAULT_THRESHOLD;
        if (union.types.length > threshold && !isFromTypeStatement(union)) {
          context.report({
            messageId: 'refactorUnion',
            data: {
              threshold: `${threshold}`,
            },
            node,
          });
        }
      },
    };
  },
};

function isFromTypeStatement(node: TSESTree.TSUnionType): boolean {
  return node.parent!.type === 'TSTypeAliasDeclaration';
}

function isUsedWithUtilityType(node: TSESTree.TSUnionType): boolean {
  return (
    node.parent!.type === 'TSTypeParameterInstantiation' &&
    node.parent!.parent!.type === 'TSTypeReference' &&
    isIdentifier(node.parent!.parent!.typeName, ...UTILITY_TYPES)
  );
}
