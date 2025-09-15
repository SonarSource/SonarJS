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
// https://sonarsource.github.io/rspec/#/rspec/S1871

import type { TSESTree } from '@typescript-eslint/utils';
import {
  areEquivalent,
  collectIfBranches,
  collectSwitchBranches,
  generateMeta,
  isIfStatement,
  last,
  report,
  takeWithoutBreak,
  toSecondaryLocation,
} from '../helpers/index.js';
import type { Rule } from 'eslint';
import type estree from 'estree';
import * as meta from './generated-meta.js';

const message =
  "This {{type}}'s code block is the same as the block for the {{type}} on line {{line}}.";

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      sameConditionalBlock: message,
    },
  }),
  create(context) {
    return {
      IfStatement(node: estree.IfStatement) {
        visitIfStatement(node);
      },
      SwitchStatement(node: estree.SwitchStatement) {
        visitSwitchStatement(node);
      },
    };

    function visitIfStatement(ifStmt: estree.IfStatement) {
      if (isIfStatement((ifStmt as TSESTree.IfStatement).parent)) {
        return;
      }
      const { branches, endsWithElse } = collectIfBranches(ifStmt);

      if (allEquivalentWithoutDefault(branches, endsWithElse)) {
        for (const [i, branch] of branches.slice(1).entries()) {
          reportIssue(branch, branches[i], 'branch');
        }
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

    function visitSwitchStatement(switchStmt: estree.SwitchStatement) {
      const { cases } = switchStmt;
      const { endsWithDefault } = collectSwitchBranches(switchStmt);
      const nonEmptyCases = cases.filter(
        c => takeWithoutBreak(expandSingleBlockStatement(c.consequent)).length > 0,
      );
      const casesWithoutBreak = nonEmptyCases.map(c =>
        takeWithoutBreak(expandSingleBlockStatement(c.consequent)),
      );

      if (allEquivalentWithoutDefault(casesWithoutBreak, endsWithDefault)) {
        for (const [i, caseStmt] of nonEmptyCases.slice(1).entries()) {
          reportIssue(caseStmt, nonEmptyCases[i], 'case');
        }
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

    function hasRequiredSize(nodes: estree.Statement[]) {
      if (nodes.length > 0) {
        const tokens = [
          ...context.sourceCode.getTokens(nodes[0]),
          ...context.sourceCode.getTokens(last(nodes)),
        ].filter(token => token.value !== '{' && token.value !== '}');
        return tokens.length > 0 && last(tokens).loc.end.line > tokens[0].loc.start.line;
      }
      return false;
    }

    function compareIfBranches(a: estree.Statement, b: estree.Statement) {
      const equivalent = areEquivalent(a, b, context.sourceCode);
      if (equivalent && b.loc) {
        reportIssue(a, b, 'branch');
      }
      return equivalent;
    }

    function allEquivalentWithoutDefault(
      branches: Array<estree.Node | estree.Node[]>,
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

    function reportIssue(node: estree.Node, equivalentNode: estree.Node, type: string) {
      const equivalentNodeLoc = (equivalentNode as TSESTree.Node).loc;
      report(
        context,
        {
          message,
          messageId: 'sameConditionalBlock',
          data: { type, line: String(equivalentNodeLoc.start.line) },
          node,
        },
        [toSecondaryLocation(equivalentNode, 'Original')],
      );
    }
  },
};

function expandSingleBlockStatement(nodes: estree.Statement[]) {
  if (nodes.length === 1) {
    const node = nodes[0];
    if (node.type === 'BlockStatement') {
      return node.body;
    }
  }
  return nodes;
}
