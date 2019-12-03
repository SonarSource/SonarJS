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
// https://jira.sonarsource.com/browse/RSPEC-1154

import { Rule } from "eslint";
import * as estree from "estree";
import { isRequiredParserServices } from "../utils/isRequiredParserServices";
import { TSESTree } from "@typescript-eslint/experimental-utils";

let ts: any;

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (isRequiredParserServices(services)) {
      ts = require("typescript");
      const checker = services.program.getTypeChecker();

      function isString(node: estree.Node) {
        const typ = checker.getTypeAtLocation(
          services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node),
        );
        return typ.flags & ts.TypeFlags.StringLike;
      }

      function isReplaceExclusion(
        property: estree.Node,
        args: Array<estree.Expression | estree.SpreadElement>,
      ) {
        if (property.type === "Identifier" && property.name === "replace" && args.length === 2) {
          const secondArgument = args[1];
          return !isString(secondArgument);
        }
        return false;
      }

      function getVariable(memberExpression: estree.MemberExpression) {
        const variableName = context.getSourceCode().getText(memberExpression.object);
        if (variableName.length > 30) {
          return "String";
        }
        return variableName;
      }

      return {
        ExpressionStatement(node: estree.Node) {
          const expression = (node as estree.ExpressionStatement).expression;
          if (expression.type === "CallExpression") {
            const callee = (expression as estree.CallExpression).callee;
            if (callee.type === "MemberExpression") {
              if (
                isString(callee.object) &&
                !isReplaceExclusion(callee.property, expression.arguments)
              ) {
                context.report({
                  message: `${getVariable(
                    callee,
                  )} is an immutable object; you must either store or return the result of the operation.`,
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
