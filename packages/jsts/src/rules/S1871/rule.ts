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
// https://sonarsource.github.io/rspec/#/rspec/S1871

import type { TSESTree, TSESLint } from '@typescript-eslint/utils';
import { isIfStatement, isBlockStatement } from '../utils/nodes';
import { areEquivalent } from '../utils/equivalence';
import { collectIfBranches, takeWithoutBreak, collectSwitchBranches } from '../utils/conditions';
import { report, issueLocation } from '../utils/locations';
import docsUrl from '../utils/docs-url';

const message =
  "This {{type}}'s code block is the same as the block for the {{type}} on line {{line}}.";

const rule: TSESLint.RuleModule<string, string[]> = {
  defaultOptions: [],
  meta: {
    messages: {
      sameConditionalBlock: message,
      sonarRuntime: '{{sonarRuntimeData}}',
    },
    type: 'problem',
    docs: {
      description:
        'Two branches in a conditional structure should not have exactly the same implementation',
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
    return {
      IfStatement(node: TSESTree.Node) {
        visitIfStatement(node as TSESTree.IfStatement);
      },
      SwitchStatement(node: TSESTree.Node) {
        visitSwitchStatement(node as TSESTree.SwitchStatement);
      },
    };

    function visitIfStatement(ifStmt: TSESTree.IfStatement) {
      if (isIfStatement(ifStmt.parent)) {
        return;
      }
      const { branches, endsWithElse } = collectIfBranches(ifStmt);

      if (allEquivalentWithoutDefault(branches, endsWithElse)) {
        branches.slice(1).forEach((branch, i) => reportIssue(branch, branches[i], 'branch'));
        return;
      }

      for (let i = 1; i < branches.length; i++) {
        if (hasRequiredSize([branches[i]])) {
          for (let j = 0; j < i; j++) {
            if (compareIfBranches(branches[i], branches[j])) {
              break;
            }
          }
        }
      }
    }

    function visitSwitchStatement(switchStmt: TSESTree.SwitchStatement) {
      const { cases } = switchStmt;
      const { endsWithDefault } = collectSwitchBranches(switchStmt);
      const nonEmptyCases = cases.filter(
        c => takeWithoutBreak(expandSingleBlockStatement(c.consequent)).length > 0,
      );
      const casesWithoutBreak = nonEmptyCases.map(c =>
        takeWithoutBreak(expandSingleBlockStatement(c.consequent)),
      );

      if (allEquivalentWithoutDefault(casesWithoutBreak, endsWithDefault)) {
        nonEmptyCases
          .slice(1)
          .forEach((caseStmt, i) => reportIssue(caseStmt, nonEmptyCases[i], 'case'));
        return;
      }

      for (let i = 1; i < cases.length; i++) {
        const firstClauseWithoutBreak = takeWithoutBreak(
          expandSingleBlockStatement(cases[i].consequent),
        );

        if (hasRequiredSize(firstClauseWithoutBreak)) {
          for (let j = 0; j < i; j++) {
            const secondClauseWithoutBreak = takeWithoutBreak(
              expandSingleBlockStatement(cases[j].consequent),
            );

            if (
              areEquivalent(firstClauseWithoutBreak, secondClauseWithoutBreak, context.sourceCode)
            ) {
              reportIssue(cases[i], cases[j], 'case');
              break;
            }
          }
        }
      }
    }

    function hasRequiredSize(nodes: TSESTree.Statement[]) {
      if (nodes.length > 0) {
        const tokens = [
          ...context.sourceCode.getTokens(nodes[0]),
          ...context.sourceCode.getTokens(nodes[nodes.length - 1]),
        ].filter(token => token.value !== '{' && token.value !== '}');
        return (
          tokens.length > 0 && tokens[tokens.length - 1].loc.end.line > tokens[0].loc.start.line
        );
      }
      return false;
    }

    function compareIfBranches(a: TSESTree.Statement, b: TSESTree.Statement) {
      const equivalent = areEquivalent(a, b, context.sourceCode);
      if (equivalent && b.loc) {
        reportIssue(a, b, 'branch');
      }
      return equivalent;
    }

    function expandSingleBlockStatement(nodes: TSESTree.Statement[]) {
      if (nodes.length === 1) {
        const node = nodes[0];
        if (isBlockStatement(node)) {
          return node.body;
        }
      }
      return nodes;
    }

    function allEquivalentWithoutDefault(
      branches: Array<TSESTree.Node | TSESTree.Node[]>,
      endsWithDefault: boolean,
    ) {
      return (
        !endsWithDefault &&
        branches.length > 1 &&
        branches
          .slice(1)
          .every((branch, index) => areEquivalent(branch, branches[index], context.sourceCode))
      );
    }

    function reportIssue(node: TSESTree.Node, equivalentNode: TSESTree.Node, type: string) {
      const equivalentNodeLoc = equivalentNode.loc;
      report(
        context,
        {
          messageId: 'sameConditionalBlock',
          data: { type, line: String(equivalentNode.loc.start.line) },
          node,
        },
        [issueLocation(equivalentNodeLoc, equivalentNodeLoc, 'Original')],
        message,
      );
    }
  },
};

export = rule;
