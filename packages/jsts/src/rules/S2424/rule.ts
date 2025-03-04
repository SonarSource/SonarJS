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
// https://sonarsource.github.io/rspec/#/rspec/S2424/javascript

import { generateMeta, globalsByLibraries } from '../helpers/index.js';
import { Rule, Scope } from 'eslint';
import estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import * as meta from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
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
