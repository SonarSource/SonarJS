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
// https://jira.sonarsource.com/browse/RSPEC-4324

import { Rule } from "eslint";
import { TSESTree } from "@typescript-eslint/experimental-utils";
import {
  isRequiredParserServices,
  RequiredParserServices,
} from "../utils/isRequiredParserServices";
import * as estree from "estree";

type ReturnedExpression = estree.Expression | undefined | null;

const message = "Remove this return type or change it to a more specific.";

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const services = context.parserServices;

    if (isRequiredParserServices(services)) {
      const ts = require("typescript");
      let returnedExpressions: ReturnedExpression[] = [];
      return {
        ReturnStatement(node: estree.Node) {
          returnedExpressions.push((node as estree.ReturnStatement).argument);
        },
        "FunctionDeclaration:exit": function(node: estree.Node) {
          const returnType = (node as TSESTree.FunctionDeclaration).returnType;
          if (
            returnType &&
            returnType.typeAnnotation.type === "TSAnyKeyword" &&
            returnedExpressions.length > 0 &&
            allReturnTypesEqual(returnedExpressions, services, ts)
          ) {
            context.report({
              message,
              loc: returnType.loc,
            });
          }
          returnedExpressions = [];
        },
      };
    }
    return {};
  },
};

function allReturnTypesEqual(
  returns: ReturnedExpression[],
  services: RequiredParserServices,
  ts: any,
): boolean {
  const firstReturnType = getTypeFromTreeNode(returns.pop(), services);
  if (!!firstReturnType && !!isPrimitiveType(firstReturnType, ts)) {
    return returns.every(nextReturn => {
      const nextReturnType = getTypeFromTreeNode(nextReturn, services);
      return !!nextReturnType && nextReturnType.flags === firstReturnType.flags;
    });
  }
  return false;
}

function getTypeFromTreeNode(node: ReturnedExpression, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  return checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
}

function isPrimitiveType({ flags }: any, ts: any) {
  return (
    flags & ts.TypeFlags.BooleanLike ||
    flags & ts.TypeFlags.NumberLike ||
    flags & ts.TypeFlags.StringLike ||
    flags & ts.TypeFlags.EnumLike
  );
}
