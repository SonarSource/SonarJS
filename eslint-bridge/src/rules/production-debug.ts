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
// https://jira.sonarsource.com/browse/RSPEC-4507

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  getModuleNameOfIdentifier,
  getUniqueWriteUsage,
  getVariableFromName,
  isIdentifier,
} from './utils';

const ERRORHANDLER_MODULE = 'errorhandler';
const message =
  'Make sure this debug feature is deactivated before delivering the code in production.';

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      DebuggerStatement(node: estree.Node) {
        context.report({
          node,
          message,
        });
      },
      CallExpression(node: estree.Node) {
        const callExpression = node as estree.CallExpression;

        // alert(...)
        checkOpenDialogFunction(context, callExpression);

        // app.use(...)
        checkErrorHandlerMiddleware(context, callExpression);
      },
    };
  },
};

function checkOpenDialogFunction(context: Rule.RuleContext, callExpression: estree.CallExpression) {
  const { callee } = callExpression;
  if (callee.type === 'Identifier') {
    const { name } = callee;

    if (name === 'alert' || name === 'prompt' || name === 'confirm') {
      const variable = getVariableFromName(context, name);
      if (variable) {
        // we don't report on custom function
        return;
      }
      context.report({
        node: callExpression,
        message,
      });
    }
  }
}

function checkErrorHandlerMiddleware(
  context: Rule.RuleContext,
  callExpression: estree.CallExpression,
) {
  const { callee, arguments: args } = callExpression;
  if (
    callee.type === 'MemberExpression' &&
    isIdentifier(callee.property, 'use') &&
    args.length > 0 &&
    !isInsideConditional(context)
  ) {
    let middleware: estree.Node | undefined = args[0];
    if (middleware.type === 'Identifier') {
      middleware = getUniqueWriteUsage(context, middleware.name);
    }

    if (
      middleware &&
      middleware.type === 'CallExpression' &&
      middleware.callee.type === 'Identifier'
    ) {
      const module = getModuleNameOfIdentifier(middleware.callee, context);
      if (module?.value === ERRORHANDLER_MODULE) {
        context.report({
          node: callExpression,
          message,
        });
      }
    }
  }
}

function isInsideConditional(context: Rule.RuleContext) {
  const ancestors = context.getAncestors();
  return ancestors.some(ancestor => ancestor.type === 'IfStatement');
}
