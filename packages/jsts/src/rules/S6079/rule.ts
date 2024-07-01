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
// https://sonarsource.github.io/rspec/#/rspec/S6079/javascript

import { Rule, Scope } from 'eslint';
import { getVariableFromIdentifier, Mocha, toEncodedMessage } from '../helpers';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import { SONAR_RUNTIME } from '../parameters';

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    let currentDoneVariable: Scope.Variable | undefined;
    let doneCall: estree.Node | undefined;
    let doneSegment: Rule.CodePathSegment | undefined;

    let currentSegment: Rule.CodePathSegment | undefined;
    let currentCase: Mocha.TestCase;
    const segmentFirstStatement: Map<Rule.CodePathSegment, estree.Node> = new Map();

    function checkForTestCase(node: estree.Node) {
      const testCase = Mocha.extractTestCase(node);
      if (!testCase) {
        return;
      }

      currentCase = testCase;
      currentDoneVariable = undefined;
      if (testCase.callback.params.length === 0) {
        return;
      }
      const [done] = testCase.callback.params;
      if (done.type !== 'Identifier') {
        return;
      }
      const callbackScope = context.sourceCode
        .getScope(node)
        .childScopes.find(scope => scope.block === testCase.callback);
      if (!callbackScope) {
        return;
      }
      currentDoneVariable = getVariableFromIdentifier(done, callbackScope);
    }

    function checkForDoneCall(node: estree.CallExpression) {
      const { callee } = node;
      if (currentDoneVariable?.references.some(ref => ref.identifier === callee)) {
        doneCall = node;
        doneSegment = currentSegment;
      }
    }

    function report(statementAfterDone: estree.Node) {
      context.report({
        node: statementAfterDone,
        message: toEncodedMessage(`Move this code before the call to "done".`, [
          doneCall as TSESTree.Node,
        ]),
      });

      doneSegment = undefined;
      doneCall = undefined;
      currentDoneVariable = undefined;
    }

    return {
      CallExpression: (node: estree.Node) => {
        checkForTestCase(node);
        checkForDoneCall(node as estree.CallExpression);
      },

      ExpressionStatement: (node: estree.Node) => {
        if (currentSegment && currentSegment === doneSegment) {
          report(node);
        }

        if (currentSegment && !segmentFirstStatement.has(currentSegment)) {
          segmentFirstStatement.set(currentSegment, node);
        }
      },

      onCodePathSegmentStart(segment: Rule.CodePathSegment) {
        currentSegment = segment;
      },

      onCodePathEnd(_codePath: Rule.CodePath, node: estree.Node) {
        currentSegment = undefined;
        if (currentCase?.callback === node && doneSegment) {
          // we report an issue if one of 'doneSegment.nextSegments' is not empty
          const statementAfterDone = doneSegment.nextSegments
            .map(segment => segmentFirstStatement.get(segment))
            .find(stmt => !!stmt);
          if (statementAfterDone) {
            report(statementAfterDone);
          }
        }
      },
    };
  },
};
