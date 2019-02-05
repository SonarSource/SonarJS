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
import {
  getModuleNameOfIdentifier,
  getModuleNameOfImportedIdentifier,
  isIdentifier,
} from "./utils";

const EXEC_FUNCTIONS = ["exec", "execSync"];

const SPAWN_EXEC_FILE_FUNCTIONS = ["spawn", "spawnSync", "execFile", "execFileSync"];

const CHILD_PROCESS_MODULE = "child_process";

const MESSAGE = "Make sure that executing this OS command is safe here.";

type Argument = estree.Expression | estree.SpreadElement;

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
      const moduleName = getModuleNameOfIdentifier(node.callee.object, context);
      checkOSCommand(moduleName, node.callee.property, node.arguments, context);
    }
  } else if (node.callee.type === "Identifier") {
    const moduleName = getModuleNameOfImportedIdentifier(node.callee, context);
    checkOSCommand(moduleName, node.callee, node.arguments, context);
  }
}

function checkOSCommand(
  moduleName: estree.Literal | undefined,
  expression: estree.Expression,
  args: Argument[],
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

function isQuestionableFunctionCall(expression: estree.Expression, [command, options]: Argument[]) {
  // if command is hardcoded => no issue
  if (!command || command.type === "Literal") {
    return false;
  }
  // for `spawn` and `execFile`, `shell` option must be set to `true`
  if (isIdentifier(expression, ...SPAWN_EXEC_FILE_FUNCTIONS)) {
    return options && containsShellOption(options);
  }
  return isIdentifier(expression, ...EXEC_FUNCTIONS);
}

function containsShellOption(options: Argument) {
  return (
    options.type === "ObjectExpression" &&
    options.properties.some(
      ({ key, value }) =>
        isIdentifier(key, "shell") && value.type === "Literal" && value.value === true,
    )
  );
}
