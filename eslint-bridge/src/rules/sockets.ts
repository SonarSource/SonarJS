/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-4818

import { Rule } from "eslint";
import * as estree from "estree";
import { getModuleNameOfIdentifier, getModuleNameOfImportedIdentifier } from "./utils";

const NET_MODULE = "net";

const MESSAGE = "Make sure that sockets are used safely here.";

const SOCKET_CREATION_FUNCTIONS = new Set(["createConnection", "connect"]);

const SOCKET_CONSTRUCTOR = "Socket";

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      NewExpression: (node: estree.Node) =>
        checkCallExpression(node as estree.NewExpression, context),
      CallExpression: (node: estree.Node) =>
        checkCallExpression(node as estree.CallExpression, context),
    };
  },
};

function checkCallExpression({ callee, type }: estree.CallExpression, context: Rule.RuleContext) {
  let moduleName;
  let expression: estree.Expression | undefined;
  if (callee.type === "MemberExpression" && callee.object.type === "Identifier") {
    moduleName = getModuleNameOfIdentifier(callee.object, context);
    expression = callee.property;
  }

  if (callee.type === "Identifier") {
    moduleName = getModuleNameOfImportedIdentifier(callee, context);
    expression = callee;
  }

  if (expression && isQuestionable(expression, type === "NewExpression", moduleName)) {
    context.report({ message: MESSAGE, node: callee });
  }
}

function isQuestionable(
  expression: estree.Expression,
  isConstructor: boolean,
  moduleName?: estree.Literal,
) {
  if (!moduleName || moduleName.value !== NET_MODULE || expression.type !== "Identifier") {
    return false;
  }

  if (isConstructor) {
    return expression.name === SOCKET_CONSTRUCTOR;
  }

  return SOCKET_CREATION_FUNCTIONS.has(expression.name);
}
