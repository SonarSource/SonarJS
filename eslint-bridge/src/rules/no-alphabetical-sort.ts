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
// https://jira.sonarsource.com/browse/RSPEC-2871

import { Rule } from "eslint";
import * as estree from "estree";
import {
  isRequiredParserServices,
  RequiredParserServices,
} from "../utils/isRequiredParserServices";
import { TSESTree } from "@typescript-eslint/experimental-utils";
import { sortLike } from "./utils";

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (isRequiredParserServices(services)) {
      const ts = require("typescript");
      return {
        CallExpression: (node: estree.Node) => {
          const call = node as TSESTree.CallExpression;
          const callee = call.callee;
          if (call.arguments.length === 0 && callee.type === "MemberExpression") {
            const { object, property } = callee;
            const text = context.getSourceCode().getText(property as estree.Node);
            if (sortLike.includes(text)) {
              const arrayElementType = arrayElementTypeOf(object, services, ts);
              if (arrayElementType && arrayElementType.kind === ts.SyntaxKind.NumberKeyword) {
                context.report({
                  message: "Provide a compare function to avoid sorting elements alphabetically.",
                  node: property as estree.Node,
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

function arrayElementTypeOf(node: TSESTree.Node, services: RequiredParserServices, ts: any) {
  const { typeToTypeNode, getTypeAtLocation } = services.program.getTypeChecker();
  const typeNode = typeToTypeNode(getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node)));
  if (typeNode && typeNode.kind === ts.SyntaxKind.ArrayType) {
    return (typeNode as any).elementType;
  }
  return undefined;
}
