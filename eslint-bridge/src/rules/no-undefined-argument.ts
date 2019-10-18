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
// https://jira.sonarsource.com/browse/RSPEC-4623

import { Rule } from "eslint";
import { TSESTree } from "@typescript-eslint/experimental-utils";
import {
  isRequiredParserServices,
  RequiredParserServices,
} from "../utils/isRequiredParserServices";
import * as estree from "estree";

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (isRequiredParserServices(services)) {
      const ts = require("typescript");
      return {
        CallExpression: (node: estree.Node) => {
          const call = node as estree.CallExpression;
          const { arguments: args } = call;
          if (args.length === 0) {
            return;
          }

          const lastArgument = args[args.length - 1];
          if (
            isUndefined(lastArgument) &&
            isOptionalParameter(args.length - 1, call, services, ts)
          ) {
            context.report({
              message: `Remove this redundant "undefined".`,
              node: lastArgument,
            });
          }
        },
      };
    }
    return {};
  },
};

function isUndefined(node: estree.Node) {
  return node.type === "Identifier" && node.name === "undefined";
}

function isOptionalParameter(
  paramIndex: number,
  node: estree.CallExpression,
  services: RequiredParserServices,
  ts: any,
) {
  const signature = services.program
    .getTypeChecker()
    .getResolvedSignature(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
  if (signature) {
    const declaration = signature.declaration;
    if (declaration && isFunctionLikeDeclaration(declaration, ts)) {
      const { parameters } = declaration;
      const parameter = parameters[paramIndex];
      return parameter && ((parameter as any).initializer || (parameter as any).questionToken);
    }
  }
  return false;
}

function isFunctionLikeDeclaration(declaration: any, ts: any) {
  return [
    ts.SyntaxKind.FunctionDeclaration,
    ts.SyntaxKind.FunctionExpression,
    ts.SyntaxKind.ArrowFunction,
    ts.SyntaxKind.MethodDeclaration,
    ts.SyntaxKind.Constructor,
    ts.SyntaxKind.GetAccessor,
    ts.SyntaxKind.SetAccessor,
  ].includes(declaration.kind);
}
