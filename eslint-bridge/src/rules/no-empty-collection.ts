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
// https://jira.sonarsource.com/browse/RSPEC-4158

import { Rule, Scope } from "eslint";
import { isIdentifier, findFirstMatchingAncestor, isReferenceTo, ancestorsChain } from "./utils";
import { TSESTree } from "@typescript-eslint/experimental-utils";
import * as estree from "estree";
import { collectionConstructor } from "../utils/collections";

// Methods that mutate the collection but can't add elements
const nonAdditiveMutatorMethods = [
  // array methods
  "copyWithin",
  "pop",
  "reverse",
  "shift",
  "sort",
  // map, set methods
  "delete",
  "clear",
];
const accessorMethods = [
  // array methods
  "concat",
  "includes",
  "indexOf",
  "join",
  "lastIndexOf",
  "slice",
  "toSource",
  "toString",
  "toLocaleString",
  // map, set methods
  "get",
  "has",
];
const iterationMethods = [
  "entries",
  "every",
  "filter",
  "find",
  "findIndex",
  "forEach",
  "keys",
  "map",
  "reduce",
  "reduceRight",
  "some",
  "values",
];

const strictlyReadingMethods = new Set([
  ...nonAdditiveMutatorMethods,
  ...accessorMethods,
  ...iterationMethods,
]);

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      "Program:exit": function() {
        reportEmptyCollectionsUsage(context.getScope(), context);
      },
    };
  },
};

export function reportEmptyCollectionsUsage(scope: Scope.Scope, context: Rule.RuleContext) {
  if (scope.type !== "global") {
    scope.variables.forEach(v => {
      reportEmptyCollectionUsage(v, context);
    });
  }

  scope.childScopes.forEach(childScope => {
    reportEmptyCollectionsUsage(childScope, context);
  });
}

function reportEmptyCollectionUsage(variable: Scope.Variable, context: Rule.RuleContext) {
  if (variable.references.length <= 1) {
    return;
  }

  const usedReferences = [];
  let isEmptyCollection = false;

  for (const ref of variable.references) {
    if (ref.isWriteOnly()) {
      isEmptyCollection = isReferenceAssigningEmptyCollection(ref);
    } else {
      if (isReadCollectionPattern(ref)) {
        if (isEmptyCollection) {
          usedReferences.push(ref);
        }
      } else {
        // One references is a write
        return;
      }
    }
  }

  usedReferences.forEach(ref => {
    context.report({
      message: `Review this usage of "${ref.identifier.name}" as it can only be empty here.`,
      node: ref.identifier,
    });
  });
}

function isReferenceAssigningEmptyCollection(ref: Scope.Reference) {
  const declOrExprStmt = findFirstMatchingAncestor(
    ref.identifier as TSESTree.Node,
    n => n.type === "VariableDeclarator" || n.type === "ExpressionStatement",
  ) as estree.Node;
  if (declOrExprStmt) {
    if (declOrExprStmt.type === "VariableDeclarator" && declOrExprStmt.init) {
      return isEmptyCollectionType(declOrExprStmt.init);
    }

    if (declOrExprStmt.type === "ExpressionStatement") {
      const expression = declOrExprStmt.expression;
      return (
        expression.type === "AssignmentExpression" &&
        isReferenceTo(ref, expression.left) &&
        isEmptyCollectionType(expression.right)
      );
    }
  }
  return false;
}

function isEmptyCollectionType(node: estree.Node) {
  if (node && node.type === "ArrayExpression") {
    return node.elements.length === 0;
  } else if (node && (node.type === "CallExpression" || node.type === "NewExpression")) {
    return isIdentifier(node.callee, ...collectionConstructor) && node.arguments.length === 0;
  }
  return false;
}

function isReadCollectionPattern(ref: Scope.Reference) {
  return isStrictlyReadingMethodCall(ref) || isForIterationPattern(ref) || isElementRead(ref);
}

function isStrictlyReadingMethodCall(usage: Scope.Reference) {
  const parent = (usage.identifier as TSESTree.Node).parent;
  if (parent && parent.type === "MemberExpression") {
    const memberExpressionParent = parent.parent;
    if (memberExpressionParent && memberExpressionParent.type === "CallExpression") {
      return isIdentifier(parent.property as estree.Node, ...strictlyReadingMethods);
    }
  }
  return false;
}

function isForIterationPattern(ref: Scope.Reference) {
  const forInOrOfStatement = findFirstMatchingAncestor(
    ref.identifier as TSESTree.Node,
    n => n.type === "ForOfStatement" || n.type === "ForInStatement",
  ) as TSESTree.ForOfStatement | TSESTree.ForInStatement;

  return forInOrOfStatement && forInOrOfStatement.right === ref.identifier;
}

function isElementRead(ref: Scope.Reference) {
  const parent = (ref.identifier as TSESTree.Node).parent;

  return parent && parent.type === "MemberExpression" && parent.computed && !isElementWrite(parent);
}

function isElementWrite(memberExpression: TSESTree.MemberExpression) {
  const ancestors = ancestorsChain(memberExpression, new Set());
  const assignment = ancestors.find(
    n => n.type === "AssignmentExpression",
  ) as TSESTree.AssignmentExpression;
  if (assignment && assignment.operator === "=") {
    return [memberExpression, ...ancestors].includes(assignment.left);
  }
  return false;
}
