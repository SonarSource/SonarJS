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
// https://sonarsource.github.io/rspec/#/rspec/S4622/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, isIdentifier, UTILITY_TYPES } from '../helpers/index.js';
import { FromSchema } from 'json-schema-to-ts';
import * as meta from './generated-meta.js';

const DEFAULT_THRESHOLD = 3;

const messages = {
  refactorUnion: 'Refactor this union type to have less than {{threshold}} elements.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    return {
      TSUnionType: (node: estree.Node) => {
        const union = node as unknown as TSESTree.TSUnionType;
        if (isUsedWithUtilityType(union)) {
          return;
        }
        const threshold =
          (context.options as FromSchema<typeof meta.schema>)[0]?.threshold ?? DEFAULT_THRESHOLD;
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
