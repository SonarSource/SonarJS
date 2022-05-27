/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S4036/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  isIdentifier,
  isStringLiteral,
  getModuleAndCalledMethod,
  getValueOfExpression,
} from '../utils';

const SENSITIVE_METHODS = ['exec', 'execSync', 'spawn', 'spawnSync', 'execFile', 'execFileSync'];
const REQUIRED_PATH_PREFIXES = ['./', '.\\', '../', '..\\', '/', '\\', 'C:\\'];

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      issue: 'Searching OS commands in PATH is security-sensitive.',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.CallExpression) => {
        const { module, method } = getModuleAndCalledMethod(node.callee, context);
        if (module?.value === 'child_process' && isIdentifier(method, ...SENSITIVE_METHODS)) {
          const sensitiveArg = findSensitiveArgument(
            context,
            node.arguments as estree.Expression[],
          );
          if (sensitiveArg != null) {
            context.report({
              messageId: 'issue',
              node: sensitiveArg,
            });
          }
        }
      },
    };
  },
};

function findSensitiveArgument(context: Rule.RuleContext, functionArgs: estree.Expression[]) {
  if (functionArgs.length === 0) {
    return null;
  }
  const pathArg = functionArgs[0]; // we know this for the SENSITIVE_METHODS
  const literalInExpression: estree.Literal | undefined = getValueOfExpression(
    context,
    pathArg,
    'Literal',
  );
  let stringLiteral: estree.Literal & { value: string };
  if (literalInExpression !== undefined && isStringLiteral(literalInExpression)) {
    stringLiteral = literalInExpression;
  } else {
    return null;
  }
  const startsWithRequiredPrefix = REQUIRED_PATH_PREFIXES.some(prefix =>
    stringLiteral.value.startsWith(prefix),
  );
  return startsWithRequiredPrefix ? null : pathArg;
}
