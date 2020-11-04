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

import { Rule } from 'eslint';
import * as estree from 'estree';
import { flattenArgs, getModuleNameOfNode, isMethodInvocation } from './utils';

/**
 * This modules provides utilities for writing rules about Express.js.
 */
export namespace Express {
  const EXPRESS = 'express';

  /**
   * Checks whether the declaration looks somewhat like `<id> = express()`
   * and returns `<id>` if it matches.
   */
  export function attemptFindAppInstantiation(
    varDecl: estree.VariableDeclarator,
    context: Rule.RuleContext,
  ): estree.Identifier | undefined {
    const rhs = varDecl.init;
    if (rhs && rhs.type === 'CallExpression') {
      const { callee } = rhs as estree.CallExpression;
      if (getModuleNameOfNode(context, callee)?.value === EXPRESS) {
        const pattern = varDecl.id;
        return pattern.type === 'Identifier' ? pattern : undefined;
      }
    }
    return undefined;
  }

  /**
   * Checks whether the expression looks somewhat like `app.use(m1, [m2, m3], ..., mN)`,
   * where one of `mK`-nodes satisfies the given predicate.
   */
  export function isUsingMiddleware(
    context: Rule.RuleContext,
    callExpression: estree.CallExpression,
    app: estree.Identifier,
    middlewareNodePredicate: (n: estree.Node) => boolean,
  ): boolean {
    if (isMethodInvocation(callExpression, app.name, 'use', 1)) {
      const flattenedArgs = flattenArgs(context, callExpression.arguments);
      return Boolean(flattenedArgs.find(middlewareNodePredicate));
    }
    return false;
  }

  /**
   * Checks whether a node looks somewhat like `require('m')()` for
   * some middleware `m` from the list of middlewares.
   */
  export function isMiddlewareInstance(
    context: Rule.RuleContext,
    middlewares: string[],
    n: estree.Node,
  ): boolean {
    if (n.type === 'CallExpression') {
      const usedMiddleware = getModuleNameOfNode(context, n.callee)?.value;
      if (usedMiddleware) {
        return middlewares.includes(String(usedMiddleware));
      }
    }
    return false;
  }

  export function SensitiveMiddlewarePropertyRule(
    sensitivePropertyFinder: (
      context: Rule.RuleContext,
      middlewareCall: estree.CallExpression,
    ) => estree.Property | undefined,
    message: string,
  ): Rule.RuleModule {
    return {
      create(context: Rule.RuleContext) {
        let instantiatedApp: estree.Identifier | null;
        let sensitiveProperty: estree.Property | undefined;
        let isSafe: boolean;

        function isExposing(middlewareNode: estree.Node): boolean {
          return Boolean((sensitiveProperty = findSensitiveProperty(middlewareNode)));
        }

        function findSensitiveProperty(middlewareNode: estree.Node): estree.Property | undefined {
          if (middlewareNode.type === 'CallExpression') {
            return sensitivePropertyFinder(context, middlewareNode);
          }
          return undefined;
        }

        return {
          Program: () => {
            instantiatedApp = null;
            sensitiveProperty = undefined;
            isSafe = true;
          },
          CallExpression: (node: estree.Node) => {
            if (isSafe && instantiatedApp) {
              const callExpr = node as estree.CallExpression;
              isSafe = !isUsingMiddleware(context, callExpr, instantiatedApp, isExposing);
            }
          },
          VariableDeclarator: (node: estree.Node) => {
            if (isSafe && !instantiatedApp) {
              const varDecl = node as estree.VariableDeclarator;
              const app = attemptFindAppInstantiation(varDecl, context);
              if (app) {
                instantiatedApp = app;
              }
            }
          },
          'Program:exit': () => {
            if (!isSafe && sensitiveProperty) {
              context.report({
                node: sensitiveProperty,
                message,
              });
            }
          },
        };
      },
    };
  }
}
