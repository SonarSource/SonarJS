/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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

// https://jira.sonarsource.com/browse/RSPEC-2077

import { Rule } from "eslint";
import * as estree from "estree";
import {
  getModuleNameOfIdentifier,
  getModuleNameOfImportedIdentifier,
  isMemberExpression,
  isIdentifier,
} from "./utils";

const MESSAGE = `Make sure that this http request is sent safely.`;

const httpRequestFunctions = new Set(["request", "get"]);
const requestFunctions = [
  "request",
  "get",
  "post",
  "put",
  "patch",
  "del",
  "delete",
  "head",
  "options",
];

const jQueryFunctions = ["ajax", "get", "getJson", "getScript", "post", "load"];

const httpModules: { [key: string]: Set<string> } = {
  http: httpRequestFunctions,
  https: httpRequestFunctions,
  request: new Set(requestFunctions),
  axios: new Set(["axios", ...requestFunctions]),
};

const httpRequestConstructors = new Set(["XMLHttpRequest", "ActiveXObject", "XDomainRequest"]);

type Callee = estree.Expression | estree.Super;

let openCalls: Callee[] = [];
let isHttpRequestConstructorCalled = false;

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      Program() {
        // init flag for each file
        openCalls = [];
        isHttpRequestConstructorCalled = false;
      },
      NewExpression(node: estree.Node) {
        const { callee } = node as estree.NewExpression;
        if (isGlobalIdentifier(callee, ...httpRequestConstructors)) {
          isHttpRequestConstructorCalled = true;
        }
      },
      CallExpression: (node: estree.Node) =>
        checkCallExpression(node as estree.CallExpression, context),
      "Program:exit"() {
        if (isHttpRequestConstructorCalled) {
          openCalls.forEach(callee => context.report({ message: MESSAGE, node: callee }));
        }
      },
    };
  },
};

function checkCallExpression({ callee }: estree.CallExpression, context: Rule.RuleContext) {
  // check for fetch API and jQuery API
  if (isGlobalIdentifier(callee, "fetch") || isMemberExpression(callee, "$", ...jQueryFunctions)) {
    context.report({ message: MESSAGE, node: callee });
    return;
  }

  const [moduleName, expression] = getNodeModule(callee, context);

  if (expression && isQuestionable(expression, moduleName)) {
    context.report({
      message: MESSAGE,
      node: callee,
    });
    return;
  }

  // open calls may be questionable when they are called on a httpRequestConstructors
  if (expression && isIdentifier(expression, "open")) {
    openCalls.push(callee);
  }
}

function isGlobalIdentifier(callee: Callee, ...values: string[]) {
  return isIdentifier(callee, ...values) || isMemberExpression(callee, "window", ...values);
}

function getNodeModule(
  callee: Callee,
  context: Rule.RuleContext,
): [estree.Literal?, estree.Expression?] {
  let moduleName;
  let expression: estree.Expression | undefined;
  if (callee.type === "MemberExpression" && callee.object.type === "Identifier") {
    moduleName = getModuleNameOfIdentifier(callee.object, context);
    expression = callee.property;
  }

  if (callee.type === "Identifier") {
    moduleName =
      getModuleNameOfImportedIdentifier(callee, context) ||
      getModuleNameOfIdentifier(callee, context);
    expression = callee;
  }

  return [moduleName, expression];
}

function isQuestionable(expression: estree.Expression, moduleName?: estree.Literal) {
  if (!moduleName || expression.type !== "Identifier") {
    return false;
  }
  const questionableFunctions = httpModules[String(moduleName.value)];
  return questionableFunctions && questionableFunctions.has(expression.name);
}
