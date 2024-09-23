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
// https://sonarsource.github.io/rspec/#/rspec/S2424/javascript

import { generateMeta, globalsByLibraries } from '../helpers/index.js';
import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      removeOverride: 'Remove this override of "{{overridden}}".',
    },
  }),
  create(context: Rule.RuleContext) {
    const overriden: Set<estree.Identifier> = new Set();

    function isBuiltIn(variable: Scope.Variable) {
      return globalsByLibraries.builtin.includes(variable.name);
    }

    function checkVariable(variable: Scope.Variable) {
      if (isBuiltIn(variable)) {
        variable.defs.forEach(def => overriden.add(def.name));
        variable.references
          .filter(ref => ref.isWrite())
          .forEach(ref => overriden.add(ref.identifier));
      }
    }

    function checkScope(scope: Scope.Scope) {
      scope.variables.forEach(checkVariable);
      scope.childScopes.forEach(checkScope);
    }

    function isTSEnumMemberId(node: estree.Identifier) {
      const id = node as TSESTree.Identifier;
      return id.parent?.type === 'TSEnumMember';
    }

    return {
      Program: (node: estree.Node) => {
        checkScope(context.sourceCode.getScope(node));
      },
      'Program:exit': () => {
        overriden.forEach(node => {
          if (!isTSEnumMemberId(node)) {
            context.report({
              messageId: 'removeOverride',
              data: {
                overridden: node.name,
              },
              node,
            });
          }
        });
        overriden.clear();
      },
    };
  },
};
