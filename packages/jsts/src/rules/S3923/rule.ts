/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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
  docsUrl,
  isIfStatement,
  RuleContext,
} from '../helpers';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      removeOrEditConditionalStructure:
        "Remove this conditional structure or edit its code blocks so that they're not all the same.",
      returnsTheSameValue:
        'This conditional operation returns the same value whether the condition is "true" or "false".',
    },
    schema: [],
    type: 'problem',
    docs: {
      description:
        'All branches in a conditional structure should not have exactly the same implementation',
      recommended: true,
      url: docsUrl(__filename),
    },
  },
  create(context) {
    return {
      IfStatement(ifStmt: estree.IfStatement) {
        // don't visit `else if` statements
        if (!isIfStatement((ifStmt as TSESTree.IfStatement).parent)) {
          const { branches, endsWithElse } = collectIfBranches(ifStmt as TSESTree.IfStatement);
          if (endsWithElse && allDuplicated(branches)) {
            context.report({ messageId: 'removeOrEditConditionalStructure', node: ifStmt });
          }
        }
      },

      SwitchStatement(switchStmt: estree.SwitchStatement) {
        const { branches, endsWithDefault } = collectSwitchBranches(
          switchStmt as TSESTree.SwitchStatement,
        );
        if (endsWithDefault && allDuplicated(branches)) {
          context.report({ messageId: 'removeOrEditConditionalStructure', node: switchStmt });
        }
      },

      ConditionalExpression(conditional: estree.ConditionalExpression) {
        const condExprTS = conditional as TSESTree.ConditionalExpression;
        const branches = [condExprTS.consequent, condExprTS.alternate];
        if (allDuplicated(branches)) {
          context.report({ messageId: 'returnsTheSameValue', node: conditional });
        }
      },
    };

    function allDuplicated(branches: Array<TSESTree.Node | TSESTree.Node[]>) {
      return (
        branches.length > 1 &&
        branches.slice(1).every((branch, index) => {
          return areEquivalent(
            branch,
            branches[index],
            (context as unknown as RuleContext).sourceCode,
          );
        })
      );
    }
  },
};
