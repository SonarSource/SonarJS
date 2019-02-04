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

// https://jira.sonarsource.com/browse/RSPEC-4721

import { Rule } from "eslint";
import * as estree from "estree";
import { getModuleFromIdentifier, getModuleFromImportedIdentifier } from "./utils";

const QUESTIONABLE_FUNCTIONS = new Set([
  "exec",
  "execSync",
  "spawn",
  "spawnSync",
  "execFile",
  "execFileSync",
]);

const CHILD_PROCESS_MODULE = "child_process";

const MESSAGE = "Make sure that executing this OS command is safe here.";

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.Node) =>
        checkCallExpression(node as estree.CallExpression, context),
    };
  },
};

function checkCallExpression(node: estree.CallExpression, context: Rule.RuleContext) {
  if (node.callee.type === "MemberExpression") {
    if (node.callee.object.type === "Identifier") {
      const moduleName = getModuleFromIdentifier(node.callee.object, context);
      checkOSCommand(moduleName, node.callee.property, node.arguments, context);
    }
  } else if (node.callee.type === "Identifier") {
    const moduleName = getModuleFromImportedIdentifier(node.callee, context);
    checkOSCommand(moduleName, node.callee, node.arguments, context);
  }
}

function checkOSCommand(
  moduleName: estree.Literal | undefined,
  expression: estree.Expression,
  args: Array<estree.Expression | estree.SpreadElement>,
  context: Rule.RuleContext,
) {
  if (
    moduleName &&
    moduleName.value === CHILD_PROCESS_MODULE &&
    isQuestionableFunctionCall(expression, args)
  ) {
    context.report({
      node: expression,
      message: MESSAGE,
    });
  }
}

function isQuestionableFunctionCall(
  expression: estree.Expression,
  [command, options]: Array<estree.Expression | estree.SpreadElement>,
) {
  if (!command || command.type === "Literal") {
    return;
  }
  if (options && !containsShellOption(options)) {
    return;
  }
  return expression.type === "Identifier" && QUESTIONABLE_FUNCTIONS.has(expression.name);
}

function containsShellOption(options: estree.Expression | estree.SpreadElement) {
  return (
    options.type === "ObjectExpression" &&
    options.properties.some(
      ({ key, value }) =>
        isIdentifier(key, "shell") && value.type === "Literal" && value.value === true,
    )
  );
}

function isIdentifier(node: estree.Node, value: string) {
  return node.type === "Identifier" && node.name === value;
}
