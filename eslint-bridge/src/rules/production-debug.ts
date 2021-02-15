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
// https://jira.sonarsource.com/browse/RSPEC-4507

import { Rule } from 'eslint';
import * as estree from 'estree';
import { isIdentifier } from '../utils/ast-shape';
import { getModuleNameOfNode } from '../utils/module-resolving';
import { flattenArgs, getUniqueWriteUsageOrNode } from '../utils/node-extractors';

const ERRORHANDLER_MODULE = 'errorhandler';
const message =
  'Make sure this debug feature is deactivated before delivering the code in production.';

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.Node) {
        const callExpression = node as estree.CallExpression;
        // app.use(...)
        checkErrorHandlerMiddleware(context, callExpression);
      },
    };
  },
};

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
    for (const m of flattenArgs(context, args)) {
      const middleware = getUniqueWriteUsageOrNode(context, m);

      if (
        middleware &&
        middleware.type === 'CallExpression' &&
        getModuleNameOfNode(context, middleware.callee)?.value === ERRORHANDLER_MODULE
      ) {
        context.report({
          node: middleware,
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
