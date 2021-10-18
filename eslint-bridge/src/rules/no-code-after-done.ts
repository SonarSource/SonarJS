/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S6079/javascript

import { Rule, Scope } from 'eslint';
import { localAncestorsChain, Mocha, toEncodedMessage } from '../utils';
import * as estree from 'estree';
import { getVariableFromIdentifier } from './reachingDefinitions';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/experimental-utils';

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ['sonar-runtime'],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    let currentDone: Scope.Variable | undefined;

    function visitTestCase(node: estree.Node) {
      const testCase = Mocha.extractTestCase(node);
      if (testCase !== null) {
        // to be more precise we should reset 'currentDone' when leaving the test case
        // but it's good enough when entering a next test case
        currentDone = undefined;
        if (testCase.callback.params.length === 0) {
          return;
        }
        const [done] = testCase.callback.params;
        if (done.type !== 'Identifier') {
          return;
        }
        const callbackScope = context
          .getScope()
          .childScopes.find(scope => scope.block === testCase.callback);
        if (!callbackScope) {
          return;
        }
        currentDone = getVariableFromIdentifier(done, callbackScope);
      }
    }

    function checkDoneIsLast(node: estree.CallExpression) {
      if (!currentDone) {
        return;
      }

      const { callee } = node;
      if (!currentDone.references.some(ref => ref.identifier === callee)) {
        return;
      }

      const ancestors = localAncestorsChain(node as TSESTree.Node);
      const statementWithDone = ancestors.find(
        parent => parent.type === AST_NODE_TYPES.ExpressionStatement,
      );
      const parentBlock = ancestors.find(
        parent => parent.type === AST_NODE_TYPES.BlockStatement,
      ) as estree.BlockStatement;
      if (!statementWithDone || !parentBlock) {
        return;
      }
      const indexDoneStatement = parentBlock.body.findIndex(stmt => stmt === statementWithDone);
      if (indexDoneStatement >= 0 && indexDoneStatement !== parentBlock.body.length - 1) {
        context.report({
          node: parentBlock.body[indexDoneStatement + 1],
          message: toEncodedMessage(`Move this code before the call to "done".`, [
            node as TSESTree.Node,
          ]),
        });
      }
    }

    return {
      CallExpression: (node: estree.Node) => {
        visitTestCase(node);
        checkDoneIsLast(node as estree.CallExpression);
      },
    };
  },
};
