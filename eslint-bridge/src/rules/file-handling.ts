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
// https://jira.sonarsource.com/browse/RSPEC-4797

import { Rule } from "eslint";
import * as estree from "estree";
import { getModuleNameOfIdentifier, getModuleNameOfImportedIdentifier } from "./utils";

type Argument = estree.Expression | estree.SpreadElement;

const FS_FUNCTIONS: { [key: string]: { pathArgs: number[] } } = {
  access: { pathArgs: [0] },
  appendFile: { pathArgs: [0] },
  chmod: { pathArgs: [0] },
  chown: { pathArgs: [0] },
  copyFile: { pathArgs: [0, 1] },
  createReadStream: { pathArgs: [0] },
  createWriteStream: { pathArgs: [0] },
  exists: { pathArgs: [0] },
  lchmod: { pathArgs: [0] },
  lchown: { pathArgs: [0] },
  link: { pathArgs: [0, 1] },
  lstat: { pathArgs: [0] },
  mkdir: { pathArgs: [0] },
  open: { pathArgs: [0] },
  readdir: { pathArgs: [0] },
  readFile: { pathArgs: [0] },
  readlink: { pathArgs: [0] },
  realpath: { pathArgs: [0] },
  rename: { pathArgs: [0, 1] },
  rmdir: { pathArgs: [0] },
  stat: { pathArgs: [0] },
  symlink: { pathArgs: [0, 1] },
  truncate: { pathArgs: [0] },
  unlink: { pathArgs: [0] },
  utimes: { pathArgs: [0] },
  writeFile: { pathArgs: [0] },
};

const FS_MODULE = "fs";

const MESSAGE = "Make sure this file handling is safe here.";

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.Node) =>
        checkCallExpression(node as estree.CallExpression, context),
    };
  },
};

function checkCallExpression(
  { callee, arguments: args }: estree.CallExpression,
  context: Rule.RuleContext,
) {
  if (
    callee.type === "MemberExpression" &&
    callee.object.type === "Identifier" &&
    isQuestionable(callee.property, args, getModuleNameOfIdentifier(callee.object, context))
  ) {
    context.report({ message: MESSAGE, node: callee });
  } else if (
    callee.type === "Identifier" &&
    isQuestionable(callee, args, getModuleNameOfImportedIdentifier(callee, context))
  ) {
    context.report({ message: MESSAGE, node: callee });
  }
}

function isQuestionable(
  expression: estree.Expression,
  args: Argument[],
  moduleName?: estree.Literal,
) {
  if (!moduleName || moduleName.value !== FS_MODULE) {
    return false;
  }
  if (expression.type === "Identifier") {
    const { name } = expression;
    const fsFunction = FS_FUNCTIONS[name] || FS_FUNCTIONS[name.replace("Sync", "")];
    return fsFunction && fsFunction.pathArgs.some(index => args[index].type !== "Literal");
  }
  return false;
}
