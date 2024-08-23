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
// https://sonarsource.github.io/rspec/#/rspec/S4507/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  flattenArgs,
  generateMeta,
  getFullyQualifiedName,
  getUniqueWriteUsageOrNode,
  isMemberWithProperty,
} from '../helpers';
import { meta } from './meta';

const ERRORHANDLER_MODULE = 'errorhandler';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      deactivateDebug:
        'Make sure this debug feature is deactivated before delivering the code in production.',
    },
  }),
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
    isMemberWithProperty(callee, 'use') &&
    args.length > 0 &&
    !isInsideConditional(context, callExpression)
  ) {
    for (const m of flattenArgs(context, args)) {
      const middleware = getUniqueWriteUsageOrNode(context, m);
      if (
        middleware.type === 'CallExpression' &&
        getFullyQualifiedName(context, middleware) === ERRORHANDLER_MODULE
      ) {
        context.report({
          node: middleware,
          messageId: 'deactivateDebug',
        });
      }
    }
  }
}

function isInsideConditional(context: Rule.RuleContext, node: estree.Node): boolean {
  const ancestors = context.sourceCode.getAncestors(node);
  return ancestors.some(ancestor => ancestor.type === 'IfStatement');
}
