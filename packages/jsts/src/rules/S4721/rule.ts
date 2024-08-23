/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S4721/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  generateMeta,
  getFullyQualifiedName,
  isIdentifier,
  isLiteral,
  isStaticTemplateLiteral,
} from '../helpers';
import { meta } from './meta';

const EXEC_FUNCTIONS = ['exec', 'execSync'];

const SPAWN_EXEC_FILE_FUNCTIONS = ['spawn', 'spawnSync', 'execFile', 'execFileSync'];

const CHILD_PROCESS_MODULE = 'child_process';

type Argument = estree.Expression | estree.SpreadElement;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      safeOSCommand: 'Make sure that executing this OS command is safe here.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.Node) => checkOSCommand(context, node as estree.CallExpression),
    };
  },
};

function checkOSCommand(context: Rule.RuleContext, call: estree.CallExpression) {
  const { callee, arguments: args } = call;
  const fqn = getFullyQualifiedName(context, call);
  if (!fqn) {
    return;
  }
  const [module, method] = fqn.split('.');
  if (module === CHILD_PROCESS_MODULE && isQuestionable(method, args)) {
    context.report({
      node: callee,
      messageId: 'safeOSCommand',
    });
  }
}

function isQuestionable(method: string, [command, ...otherArguments]: Argument[]) {
  // if command is hardcoded => no issue
  if (!command || isLiteral(command) || isStaticTemplateLiteral(command)) {
    return false;
  }
  // for `spawn` and `execFile`, `shell` option must be set to `true`
  if (SPAWN_EXEC_FILE_FUNCTIONS.includes(method)) {
    return containsShellOption(otherArguments);
  }
  return EXEC_FUNCTIONS.includes(method);
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
