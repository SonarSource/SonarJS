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
// https://sonarsource.github.io/rspec/#/rspec/S6572/javascript

import estree from 'estree';
import { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, isNumberLiteral } from '../helpers/index.js';
import { meta } from './meta';
import { tsEslintRules } from '../typescript-eslint';
const baseRuleModule = tsEslintRules['prefer-enum-initializers'];

// The core implementation of this rule reports all enums for which there is a member value that is
// not initialized explicitly. Here, the decorator's purpose is to restrict the scope of the rule only
// to enums that already initialize a subset of members and leave the remaining ones uninitialized, except
// those that enforce a numerical order by assigning a literal to the first member value.
// In other words, the decorated rule ignores enums that don't initialize any member value or those
// that initialize their first member with a number literal.
export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    ...baseRuleModule.meta!,
    hasSuggestions: true,
  }),
  create(context) {
    const baseRuleListener = baseRuleModule.create(context) as unknown as {
      TSEnumDeclaration: (node: Rule.Node) => void;
    };
    return {
      TSEnumDeclaration: (node: Rule.Node) => {
        const enumDecl = node as unknown as TSESTree.TSEnumDeclaration;
        if (anyInitialized(enumDecl) && !numericalOrder(enumDecl)) {
          baseRuleListener.TSEnumDeclaration(node);
        }
      },
    };
  },
};

function isEnumWithBody(
  enumDecl: TSESTree.TSEnumDeclaration,
): enumDecl is TSESTree.TSEnumDeclaration & { body: { members: TSESTree.TSEnumMember[] } } {
  return (enumDecl as any).body;
}

function anyInitialized(enumDecl: TSESTree.TSEnumDeclaration) {
  return enumDecl.members.some(m => m.initializer !== undefined);
}

function numericalOrder(enumDecl: TSESTree.TSEnumDeclaration) {
  const firstMember = enumDecl.members[0];
  const membersRest = enumDecl.members.slice(1);
  return (
    firstMember.initializer?.type === 'Literal' &&
    isNumberLiteral(firstMember.initializer as estree.Node) &&
    membersRest.every(m => m.initializer === undefined)
  );
}
