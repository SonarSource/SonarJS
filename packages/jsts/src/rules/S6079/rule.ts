/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S6079/javascript

import { Rule, Scope } from 'eslint';
import {
  generateMeta,
  getVariableFromIdentifier,
  Mocha,
  report as contextReport,
  toSecondaryLocation,
} from '../helpers/index.js';
import estree from 'estree';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, undefined, true),
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
      contextReport(
        context,
        {
          node: statementAfterDone,
          message: `Move this code before the call to "done".`,
        },
        [toSecondaryLocation(doneCall!)],
      );

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
