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
// https://jira.sonarsource.com/browse/RSPEC-2819

import { Rule } from "eslint";
import * as estree from "estree";
import { isRequiredParserServices } from "../utils/isRequiredParserServices";
import { TSESTree } from "@typescript-eslint/experimental-utils";

const message = "Make sure this cross-domain message is being sent to the intended domain.";

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (isRequiredParserServices(services)) {
      const checker = services.program.getTypeChecker();

      return {
        CallExpression(node: estree.Node) {
          const callee = (node as estree.CallExpression).callee;
          if (callee.type === "MemberExpression") {
            const typ = checker.getTypeAtLocation(
              services.esTreeNodeToTSNodeMap.get(callee.object as TSESTree.Node),
            );
            const isWindow =
              (typ.symbol && typ.symbol.name === "Window") ||
              hasWindowLikeName(callee.object, context);
            const propertyName = context.getSourceCode().getText(callee.property);
            if (isWindow && propertyName === "postMessage") {
              context.report({
                message,
                node,
              });
            }
          }
        },
      };
    }
    return {};
  },
};

function hasWindowLikeName(expression: estree.Node, context: Rule.RuleContext) {
  const str = context.getSourceCode().getText(expression);
  return str.includes("window") || str.includes("Window");
}
