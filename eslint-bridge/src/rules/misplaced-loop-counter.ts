/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-1994

import { Rule } from "eslint";
import * as estree from "estree";
import { areEquivalent } from "eslint-plugin-sonarjs/lib/utils/equivalence";
import { getParent } from "eslint-plugin-sonarjs/lib/utils/nodes";

class ForInfo {
  updatedExpressions: estree.Node[] = [];
  testedExpressions: estree.Node[] = [];

  constructor(readonly forLoop: estree.ForStatement) {}
}

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const forLoopStack: ForInfo[] = [];

    function join(expressions: estree.Node[]) {
      return expressions.map(expr => context.getSourceCode().getText(expr)).join(", ");
    }

    function isInsideUpdate(node: estree.Node) {
      return isInside(node, f => f.update);
    }

    function isInsideTest(node: estree.Node) {
      return isInside(node, f => f.test);
    }

    function isInside(
      node: estree.Node,
      getChild: (loop: estree.ForStatement) => estree.Expression | null | undefined,
    ) {
      if (forLoopStack.length > 0) {
        const currentLoop = peekFor();
        const parentChain = context.getAncestors();
        parentChain.push(node);
        const test = getChild(currentLoop.forLoop);
        if (test) {
          return parentChain.some(parentChainNode => test === parentChainNode);
        }
      }
      return false;
    }

    function peekFor() {
      return forLoopStack[forLoopStack.length - 1];
    }

    return {
      ForStatement: (node: estree.Node) => {
        forLoopStack.push(new ForInfo(node as estree.ForStatement));
      },
      "ForStatement:exit": () => {
        const forInfo = forLoopStack.pop()!;
        if (forInfo.updatedExpressions.length === 0 || !forInfo.forLoop.test) {
          return;
        }
        let isIntersection = forInfo.testedExpressions.some(testedExpr =>
          forInfo.updatedExpressions.some(updatedExpr =>
            areEquivalent(updatedExpr, testedExpr, context.getSourceCode()),
          ),
        );

        if (!isIntersection) {
          context.report({
            loc: context.getSourceCode().getFirstToken(forInfo.forLoop)!.loc,
            message: `This loop's stop condition tests "${join(
              forInfo.testedExpressions,
            )}" but the incrementer updates "${join(forInfo.updatedExpressions)}".`,
          });
        }
      },
      AssignmentExpression: (node: estree.Node) => {
        if (isInsideUpdate(node)) {
          peekFor().updatedExpressions.push((node as estree.AssignmentExpression).left);
        }
      },

      UpdateExpression: (node: estree.Node) => {
        if (isInsideUpdate(node)) {
          peekFor().updatedExpressions.push((node as estree.UpdateExpression).argument);
        }
      },

      CallExpression: (node: estree.Node) => {
        const callee = getCallee(node as estree.CallExpression);
        if (isInsideUpdate(node) && callee != null) {
          peekFor().updatedExpressions.push(callee);
        }

        //         if (isInsideTest(node)) {
        //           if (callee != null) {
        //             peekFor().testedExpressions.push(callee);
        //           }
        //           //      IdentifierTree callee = callee(tree);
        // //      if (callee != null) {
        // //        checkForUpdate(callee);
        // //      } else {
        // //        logTestedExpression(tree.callee());
        // //      }
        // //      scan(tree.argumentClause());
        //         }
      },

      Identifier: (node: estree.Node) => {
        if (isInsideTest(node)) {
          const parent = getParent(context)!;
          if (parent.type !== "MemberExpression" || parent.computed || parent.object === node) {
            peekFor().testedExpressions.push(node);
          }
        }
      },

      MemberExpression: (node: estree.Node) => {
        if (
          isInsideTest(node) &&
          getParent(context)!.type !== "MemberExpression" &&
          getParent(context)!.type !== "CallExpression"
        ) {
          peekFor().testedExpressions.push(node);
        }
      },
    };
  },
};

function getCallee(node: estree.CallExpression) {
  let callee = node.callee;
  while (callee.type === "MemberExpression") {
    callee = callee.object;
  }
  if (callee.type === "Identifier" && callee !== node.callee) {
    return callee;
  }
  return null;
}
