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
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      removeOverride: 'Remove this override of "{{overridden}}".',
    },
  }),
  create(context: Rule.RuleContext) {
    const overridden: Set<estree.Identifier> = new Set();

    function checkVariable(variable: Scope.Variable) {
      if (isBuiltIn(variable)) {
        for (const def of variable.defs) overridden.add(def.name);
        for (const ref of variable.references.filter(ref => ref.isWrite()))
          overridden.add(ref.identifier);
      }
    }

    function checkScope(scope: Scope.Scope) {
      for (const variable of scope.variables) {
        checkVariable(variable);
      }
      for (const childScope of scope.childScopes) {
        checkScope(childScope);
      }
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
        for (const node of overridden) {
          if (!isTSEnumMemberId(node)) {
            context.report({
              messageId: 'removeOverride',
              data: {
                overridden: node.name,
              },
              node,
            });
          }
        }
        overridden.clear();
      },
    };
  },
};

function isBuiltIn(variable: Scope.Variable) {
  return globalsByLibraries.builtin.includes(variable.name);
}
