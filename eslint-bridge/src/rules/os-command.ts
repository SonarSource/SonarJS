/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  isIdentifier,
  getModuleNameOfIdentifier,
  getModuleNameOfImportedIdentifier,
} from '../utils';

const EXEC_FUNCTIONS = ['exec', 'execSync'];

const SPAWN_EXEC_FILE_FUNCTIONS = ['spawn', 'spawnSync', 'execFile', 'execFileSync'];

const CHILD_PROCESS_MODULE = 'child_process';

const MESSAGE = 'Make sure that executing this OS command is safe here.';

type Argument = estree.Expression | estree.SpreadElement;

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
  if (callee.type === 'MemberExpression') {
    if (callee.object.type === 'Identifier') {
      const moduleName = getModuleNameOfIdentifier(context, callee.object);
      checkOSCommand(moduleName, callee.property, args, context);
    }
  } else if (callee.type === 'Identifier') {
    const moduleName = getModuleNameOfImportedIdentifier(context, callee);
    checkOSCommand(moduleName, callee, args, context);
  }
}

function checkOSCommand(
  moduleName: estree.Literal | undefined,
  callee: estree.Expression | estree.PrivateIdentifier,
  args: Argument[],
  context: Rule.RuleContext,
) {
  if (moduleName && moduleName.value === CHILD_PROCESS_MODULE && isQuestionable(callee, args)) {
    context.report({
      node: callee,
      message: MESSAGE,
    });
  }
}

function isQuestionable(
  expression: estree.Expression | estree.PrivateIdentifier,
  [command, ...otherArguments]: Argument[],
) {
  // if command is hardcoded => no issue
  if (!command || command.type === 'Literal') {
    return false;
  }
  // for `spawn` and `execFile`, `shell` option must be set to `true`
  if (isIdentifier(expression, ...SPAWN_EXEC_FILE_FUNCTIONS)) {
    return containsShellOption(otherArguments);
  }
  return isIdentifier(expression, ...EXEC_FUNCTIONS);
}

function containsShellOption(otherArguments: Argument[]) {
  return otherArguments.some(
    arg =>
      arg.type === 'ObjectExpression' &&
      (arg.properties.filter(v => v.type === 'Property') as estree.Property[]).some(
        ({ key, value }) =>
          isIdentifier(key, 'shell') && value.type === 'Literal' && value.value === true,
      ),
  );
}
