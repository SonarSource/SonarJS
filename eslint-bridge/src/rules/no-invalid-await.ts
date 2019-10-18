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
// https://jira.sonarsource.com/browse/RSPEC-4123

import { Rule } from "eslint";
import * as estree from "estree";
import {
  isRequiredParserServices,
  RequiredParserServices,
} from "../utils/isRequiredParserServices";
import { TSESTree } from "@typescript-eslint/experimental-utils";

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (isRequiredParserServices(services)) {
      const ts = require("typescript");
      return {
        AwaitExpression: (node: estree.Node) => {
          const awaitedType = getTypeFromTreeNode(
            (node as estree.AwaitExpression).argument,
            services,
          );
          if (
            !hasThenMethod(awaitedType, ts) &&
            !isAny(awaitedType, ts) &&
            !isUnion(awaitedType, ts)
          ) {
            context.report({
              message: "Refactor this redundant 'await' on a non-promise.",
              node,
            });
          }
        },
      };
    }
    return {};
  },
};

function getTypeFromTreeNode(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  return checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
}

function hasThenMethod(type: any, ts: any) {
  const thenProperty = type.getProperty("then");
  return Boolean(thenProperty && thenProperty.flags & ts.SymbolFlags.Method);
}

function isAny(type: any, ts: any) {
  return Boolean(type.flags & ts.TypeFlags.Any);
}

function isUnion(type: any, ts: any) {
  return Boolean(type.flags & ts.TypeFlags.Union);
}
