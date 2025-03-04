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
// https://sonarsource.github.io/rspec/#/rspec/S1862

import type { TSESTree } from '@typescript-eslint/utils';
import { Rule, SourceCode } from 'eslint';
import { areEquivalent, generateMeta, report, toSecondaryLocation } from '../helpers/index.js';
import estree from 'estree';
import * as meta from './meta.js';

const duplicatedConditionMessage = 'This condition is covered by the one on line {{line}}';
const duplicatedCaseMessage = 'This case duplicates the one on line {{line}}';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      duplicatedCondition: duplicatedConditionMessage,
      duplicatedCase: duplicatedCaseMessage,
    },
  }),
  create(context) {
    const { sourceCode } = context;
    return {
      IfStatement(node: estree.IfStatement) {
        const { test } = node;
        const conditionsToCheck =
          test.type === 'LogicalExpression' && test.operator === '&&'
            ? [test, ...splitByAnd(test)]
            : [test];

        let current = node as TSESTree.Node;
        let operandsToCheck = conditionsToCheck.map(c => splitByOr(c).map(splitByAnd));
        while (current.parent?.type === 'IfStatement' && current.parent.alternate === current) {
          current = current.parent;

          const currentOrOperands = splitByOr(current.test as estree.Node).map(splitByAnd);
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
                message: duplicatedConditionMessage,
                messageId: 'duplicatedCondition',
                data: { line: current.test.loc.start.line as any },
                node: test,
              },
              [toSecondaryLocation({ loc: current.test.loc }, 'Covering')],
            );
            break;
          }
        }
      },
      SwitchStatement(switchStmt: estree.SwitchStatement) {
        const previousTests: estree.Expression[] = [];
        for (const switchCase of switchStmt.cases) {
          if (switchCase.test) {
            const { test } = switchCase;
            const duplicateTest = previousTests.find(previousTest =>
              areEquivalent(test as TSESTree.Node, previousTest as TSESTree.Node, sourceCode),
            ) as TSESTree.Node;
            if (duplicateTest) {
              report(
                context,
                {
                  messageId: 'duplicatedCase',
                  message: duplicatedCaseMessage,
                  data: {
                    line: duplicateTest.loc.start.line as any,
                  },
                  node: test,
                },
                [toSecondaryLocation({ loc: duplicateTest.loc }, 'Original')],
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

function splitByLogicalOperator(operator: '??' | '&&' | '||', node: estree.Node): estree.Node[] {
  if (node.type === 'LogicalExpression' && node.operator === operator) {
    return [
      ...splitByLogicalOperator(operator, node.left),
      ...splitByLogicalOperator(operator, node.right),
    ];
  }
  return [node];
}

function isSubset(first: estree.Node[], second: estree.Node[], sourceCode: SourceCode): boolean {
  return first.every(fst => second.some(snd => isSubsetOf(fst, snd, sourceCode)));

  function isSubsetOf(first: estree.Node, second: estree.Node, sourceCode: SourceCode): boolean {
    if (first.type !== second.type) {
      return false;
    }

    if (first.type === 'LogicalExpression') {
      const second1 = second as estree.LogicalExpression;
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

    return areEquivalent(first as TSESTree.Node, second as TSESTree.Node, sourceCode);
  }
}
