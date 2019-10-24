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
// https://jira.sonarsource.com/browse/RSPEC-4043

import { Rule } from "eslint";
import * as estree from "estree";
import {
  isRequiredParserServices,
  RequiredParserServices,
} from "../utils/isRequiredParserServices";
import { TSESTree } from "@typescript-eslint/experimental-utils";
import { isArray, getSymbolAtLocation, findFirstMatchingLocalAncestor, sortLike } from "./utils";

const arrayMutatingMethods = ["reverse", "'reverse'", '"reverse"', ...sortLike];

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const services = context.parserServices;

    if (isRequiredParserServices(services)) {
      const ts = require("typescript");

      return {
        CallExpression(node: estree.Node) {
          const callee = (node as estree.CallExpression).callee;
          if (callee.type === "MemberExpression") {
            const propertyText = context.getSourceCode().getText(callee.property);
            if (isArrayMutatingCall(callee, services, propertyText)) {
              const mutatedArray = callee.object;

              if (
                isIdentifierOrPropertyAccessExpression(mutatedArray, services, ts) &&
                !isInSelfAssignment(mutatedArray, node) &&
                isForbiddenOperation(node)
              ) {
                context.report({
                  message: formatMessage(propertyText),
                  node,
                });
              }
            }
          }
        },
      };
    }
    return {};
  },
};

function formatMessage(mutatingMethod: string) {
  let mutatingMethodText;
  if (mutatingMethod.startsWith('"') || mutatingMethod.startsWith("'")) {
    mutatingMethodText = mutatingMethod.substr(1, mutatingMethod.length - 2);
  } else {
    mutatingMethodText = mutatingMethod;
  }
  return `Move this array "${mutatingMethodText}" operation to a separate statement.`;
}

function isArrayMutatingCall(
  memberExpression: estree.MemberExpression,
  services: RequiredParserServices,
  propertyText: string,
) {
  return arrayMutatingMethods.includes(propertyText) && isArray(memberExpression.object, services);
}

function isIdentifierOrPropertyAccessExpression(
  node: estree.Node,
  services: RequiredParserServices,
  ts: any,
): boolean {
  return (
    node.type === "Identifier" ||
    (node.type === "MemberExpression" && !isGetAccessor(node.property, services, ts))
  );
}

function isGetAccessor(node: estree.Node, services: RequiredParserServices, ts: any): boolean {
  const symbol = getSymbolAtLocation(node, services);
  const declarations = symbol && symbol.declarations;
  return (
    declarations !== undefined &&
    declarations.length === 1 &&
    declarations[0].kind === ts.SyntaxKind.GetAccessor
  );
}

function isInSelfAssignment(mutatedArray: estree.Node, node?: estree.Node): boolean {
  const parent = (node as TSESTree.Node).parent;
  return (
    // check assignment
    parent !== undefined &&
    parent.type === "AssignmentExpression" &&
    parent.operator === "=" &&
    parent.left.type === "Identifier" &&
    mutatedArray.type === "Identifier" &&
    parent.left.name === mutatedArray.name
  );
}

function isForbiddenOperation(node: estree.Node) {
  const parent = (node as TSESTree.Node).parent;
  return (
    parent &&
    parent.type !== "ExpressionStatement" &&
    findFirstMatchingLocalAncestor(node as TSESTree.Node, n => n.type === "ReturnStatement") ===
      undefined
  );
}
