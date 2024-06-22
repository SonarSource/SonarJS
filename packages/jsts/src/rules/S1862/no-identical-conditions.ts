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
// https://sonarsource.github.io/rspec/#/rspec/S1862

import type { TSESTree, TSESLint } from '@typescript-eslint/utils';
import { areEquivalent } from '../utils/equivalence';
import { report, issueLocation } from '../utils/locations';
import docsUrl from '../utils/docs-url';

const duplicatedConditionMessage = 'This condition is covered by the one on line {{line}}';
const duplicatedCaseMessage = 'This case duplicates the one on line {{line}}';

const rule: TSESLint.RuleModule<string, string[]> = {
  defaultOptions: [],
  meta: {
    messages: {
      duplicatedCondition: duplicatedConditionMessage,
      duplicatedCase: duplicatedCaseMessage,
      sonarRuntime: '{{sonarRuntimeData}}',
    },
    type: 'problem',
    docs: {
      description:
        'Related "if-else-if" and "switch-case" statements should not have the same condition',
      recommended: 'recommended',
      url: docsUrl(__filename),
    },
    schema: [
      {
        // internal parameter
        type: 'string',
        enum: ['sonar-runtime'],
      },
    ],
  },
  create(context) {
    const { sourceCode } = context;
    return {
      IfStatement(node: TSESTree.Node) {
        const { test } = node as TSESTree.IfStatement;
        const conditionsToCheck =
          test.type === 'LogicalExpression' && test.operator === '&&'
            ? [test, ...splitByAnd(test)]
            : [test];

        let current = node;
        let operandsToCheck = conditionsToCheck.map(c => splitByOr(c).map(splitByAnd));
        while (current.parent?.type === 'IfStatement' && current.parent.alternate === current) {
          current = current.parent;

          const currentOrOperands = splitByOr(current.test).map(splitByAnd);
          operandsToCheck = operandsToCheck.map(orOperands =>
            orOperands.filter(
              orOperand =>
                !currentOrOperands.some(currentOrOperand =>
                  isSubset(currentOrOperand, orOperand, sourceCode),
                ),
            ),
          );

          if (operandsToCheck.some(orOperands => orOperands.length === 0)) {
            report(
              context,
              {
                messageId: 'duplicatedCondition',
                data: { line: current.test.loc.start.line },
                node: test,
              },
              [issueLocation(current.test.loc, current.test.loc, 'Covering')],
              duplicatedConditionMessage,
            );
            break;
          }
        }
      },
      SwitchStatement(node: TSESTree.Node) {
        const switchStmt = node as TSESTree.SwitchStatement;
        const previousTests: TSESTree.Expression[] = [];
        for (const switchCase of switchStmt.cases) {
          if (switchCase.test) {
            const { test } = switchCase;
            const duplicateTest = previousTests.find(previousTest =>
              areEquivalent(test, previousTest, sourceCode),
            );
            if (duplicateTest) {
              report(
                context,
                {
                  messageId: 'duplicatedCase',
                  data: {
                    line: duplicateTest.loc.start.line,
                  },
                  node: test,
                },
                [issueLocation(duplicateTest.loc, duplicateTest.loc, 'Original')],
                duplicatedCaseMessage,
              );
            } else {
              previousTests.push(test);
            }
          }
        }
      },
    };
  },
};

const splitByOr = splitByLogicalOperator.bind(null, '||');
const splitByAnd = splitByLogicalOperator.bind(null, '&&');

function splitByLogicalOperator(
  operator: '??' | '&&' | '||',
  node: TSESTree.Node,
): TSESTree.Node[] {
  if (node.type === 'LogicalExpression' && node.operator === operator) {
    return [
      ...splitByLogicalOperator(operator, node.left),
      ...splitByLogicalOperator(operator, node.right),
    ];
  }
  return [node];
}

function isSubset(
  first: TSESTree.Node[],
  second: TSESTree.Node[],
  sourceCode: TSESLint.SourceCode,
): boolean {
  return first.every(fst => second.some(snd => isSubsetOf(fst, snd, sourceCode)));

  function isSubsetOf(
    first: TSESTree.Node,
    second: TSESTree.Node,
    sourceCode: TSESLint.SourceCode,
  ): boolean {
    if (first.type !== second.type) {
      return false;
    }

    if (first.type === 'LogicalExpression') {
      const second1 = second as TSESTree.LogicalExpression;
      if (
        (first.operator === '||' || first.operator === '&&') &&
        first.operator === second1.operator
      ) {
        return (
          (isSubsetOf(first.left, second1.left, sourceCode) &&
            isSubsetOf(first.right, second1.right, sourceCode)) ||
          (isSubsetOf(first.left, second1.right, sourceCode) &&
            isSubsetOf(first.right, second1.left, sourceCode))
        );
      }
    }

    return areEquivalent(first, second, sourceCode);
  }
}

export = rule;
