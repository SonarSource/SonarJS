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
// https://jira.sonarsource.com/browse/RSPEC-3981

import { Rule } from "eslint";
import * as estree from "estree";
import {
  isRequiredParserServices,
  RequiredParserServices,
} from "../utils/isRequiredParserServices";
import { TSESTree } from "@typescript-eslint/experimental-utils";

const CollectionLike = ["Array", "Map", "Set"];
const CollectionSizeLike = ["length", "size"];

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (isRequiredParserServices(services)) {
      return {
        BinaryExpression: (node: estree.Node) => {
          const expr = node as estree.BinaryExpression;
          if (["<", ">="].includes(expr.operator)) {
            const lhs = expr.left;
            const rhs = expr.right;
            if (isZeroLiteral(rhs) && lhs.type === "MemberExpression") {
              const object = lhs.object;
              const property = lhs.property;
              if (
                property.type === "Identifier" &&
                CollectionSizeLike.includes(property.name) &&
                isCollection(object, services)
              ) {
                context.report({
                  message: `Fix this expression; ${
                    property.name
                  } of \"${context
                    .getSourceCode()
                    .getText(object)}\" is always greater or equal to zero.`,
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

function isZeroLiteral(node: estree.Node) {
  return node.type === "Literal" && node.value === 0;
}

function isCollection(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const tp = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
  return !!tp.symbol && CollectionLike.includes(tp.symbol.name);
}
