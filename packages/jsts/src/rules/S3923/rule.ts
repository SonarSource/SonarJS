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
// https://sonarsource.github.io/rspec/#/rspec/S3923

import type { TSESTree } from '@typescript-eslint/utils';
import { Rule } from 'eslint';
import estree from 'estree';
import {
  areEquivalent,
  collectIfBranches,
  collectSwitchBranches,
  generateMeta,
  isIfStatement,
} from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      removeOrEditConditionalStructure:
        "Remove this conditional structure or edit its code blocks so that they're not all the same.",
      returnsTheSameValue:
        'This conditional operation returns the same value whether the condition is "true" or "false".',
    },
  }),
  create(context) {
    return {
      IfStatement(ifStmt: estree.IfStatement) {
        // don't visit `else if` statements
        if (!isIfStatement((ifStmt as TSESTree.IfStatement).parent)) {
          const { branches, endsWithElse } = collectIfBranches(ifStmt);
          if (endsWithElse && allDuplicated(branches)) {
            context.report({ messageId: 'removeOrEditConditionalStructure', node: ifStmt });
          }
        }
      },

      SwitchStatement(switchStmt: estree.SwitchStatement) {
        const { branches, endsWithDefault } = collectSwitchBranches(switchStmt);
        if (endsWithDefault && allDuplicated(branches)) {
          context.report({ messageId: 'removeOrEditConditionalStructure', node: switchStmt });
        }
      },

      ConditionalExpression(conditional: estree.ConditionalExpression) {
        const branches = [conditional.consequent, conditional.alternate];
        if (allDuplicated(branches)) {
          context.report({ messageId: 'returnsTheSameValue', node: conditional });
        }
      },
    };

    function allDuplicated(branches: Array<estree.Node | estree.Node[]>) {
      return (
        branches.length > 1 &&
        branches.slice(1).every((branch, index) => {
          return areEquivalent(branch, branches[index], context.sourceCode);
        })
      );
    }
  },
};
