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
// https://jira.sonarsource.com/browse/RSPEC-1515

import { Rule, Scope } from "eslint";
import * as estree from "estree";
import { getParent } from "eslint-plugin-sonarjs/lib/utils/nodes";
import { getMainFunctionTokenLocation } from "eslint-plugin-sonarjs/lib/utils/locations";
import { findFirstMatchingLocalAncestor } from "./utils";
import { TSESTree } from "@typescript-eslint/experimental-utils";

const message = "Define this function outside of a loop.";

const loopLike = "WhileStatement,DoWhileStatement,ForStatement,ForOfStatement,ForInStatement";
const functionLike = "FunctionDeclaration,FunctionExpression,ArrowFunctionExpression";

const allowedCallbacks = [
  "replace",
  "forEach",
  "filter",
  "map",
  "find",
  "findIndex",
  "every",
  "some",
  "reduce",
  "reduceRight",
  "sort",
];

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    function getLocalEnclosingLoop(node: estree.Node) {
      return findFirstMatchingLocalAncestor(node as TSESTree.Node, n => loopLike.includes(n.type));
    }

    return {
      [functionLike]: (node: estree.Node) => {
        const loopNode = getLocalEnclosingLoop(node);
        if (loopNode) {
          if (
            !isIIEF(node, context) &&
            !isAllowedCallbacks(context) &&
            context.getScope().through.some(ref => !isSafe(ref, loopNode as estree.Node))
          ) {
            context.report({
              message,
              loc: getMainFunctionTokenLocation(
                node as estree.Function,
                getParent(context),
                context,
              ),
            });
          }
        }
      },
    };
  },
};

function isIIEF(node: estree.Node, context: Rule.RuleContext) {
  const parent = getParent(context);
  return (
    parent &&
    ((parent.type === "CallExpression" && parent.callee === node) ||
      (parent.type === "MemberExpression" && parent.object === node))
  );
}

function isAllowedCallbacks(context: Rule.RuleContext) {
  const parent = getParent(context);
  if (parent && parent.type === "CallExpression") {
    const callee = parent.callee;
    if (callee.type === "MemberExpression") {
      return (
        callee.property.type === "Identifier" && allowedCallbacks.includes(callee.property.name)
      );
    }
  }
  return false;
}

function isSafe(ref: Scope.Reference, loopNode: estree.Node) {
  const variable = ref.resolved;
  if (variable) {
    const definition = variable.defs[0];
    const declaration = definition && definition.parent;
    const kind = declaration && declaration.type === "VariableDeclaration" ? declaration.kind : "";

    if (kind !== "let") {
      return hasConstValue(variable, loopNode);
    }
  }

  return true;
}

function hasConstValue(variable: Scope.Variable, loopNode: estree.Node): boolean {
  for (const ref of variable.references) {
    if (!ref.init && ref.isWrite()) {
      return false;
    }

    const refRange = ref.identifier.range;

    if (
      ref.init &&
      ref.isWrite() &&
      loopNode.range &&
      refRange &&
      refRange[0] > loopNode.range[0] &&
      refRange[1] < loopNode.range[1]
    ) {
      return false;
    }
  }
  return true;
}
