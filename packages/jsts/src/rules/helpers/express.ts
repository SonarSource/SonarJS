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
import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  getFullyQualifiedName,
  isModuleExports,
  isMethodInvocation,
  flattenArgs,
  getParent,
  report,
  toSecondaryLocation,
} from '.';

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
    if (rhs && rhs.type === 'CallExpression' && getFullyQualifiedName(context, rhs) === EXPRESS) {
      const pattern = varDecl.id;
      return pattern.type === 'Identifier' ? pattern : undefined;
    }
    return undefined;
  }

  /**
   * Checks whether the function injects an instantiated app and is exported like `module.exports = function(app) {}`
   * or `module.exports.property = function(app) {}`, and returns app if it matches.
   */
  export function attemptFindAppInjection(
    functionDef: estree.Function,
    context: Rule.RuleContext,
    node: estree.Node,
  ): estree.Identifier | undefined {
    const app = functionDef.params.find(
      param => param.type === 'Identifier' && param.name === 'app',
    ) as estree.Identifier | undefined;
    if (app) {
      const parent = getParent(context, node);
      if (parent?.type === 'AssignmentExpression') {
        const { left } = parent;
        if (
          left.type === 'MemberExpression' &&
          (isModuleExports(left) || isModuleExports(left.object))
        ) {
          return app;
        }
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
      const fqn = getFullyQualifiedName(context, n);
      return middlewares.some(middleware => middleware === fqn);
    }
    return false;
  }

  /**
   * Rule factory for detecting sensitive settings that are passed to
   * middlewares eventually used by Express.js applications:
   *
   * app.use(
   *   middleware(settings)
   * )
   *
   * or
   *
   * app.use(
   *   middleware.method(settings)
   * )
   *
   * @param sensitivePropertyFinder - a function looking for a sensitive setting on a middleware call
   * @param message - the reported message when an issue is raised
   * @param meta - the rule metadata
   * @returns a rule module that raises issues when a sensitive property is found
   */
  export function SensitiveMiddlewarePropertyRule(
    sensitivePropertyFinder: (
      context: Rule.RuleContext,
      middlewareCall: estree.CallExpression,
    ) => estree.Property[],
    message: string,
    meta: Rule.RuleMetaData = {},
  ): Rule.RuleModule {
    return {
      meta,
      create(context: Rule.RuleContext) {
        let app: estree.Identifier | null;
        let sensitiveProperties: estree.Property[];

        function isExposing(middlewareNode: estree.Node): boolean {
          return Boolean(sensitiveProperties.push(...findSensitiveProperty(middlewareNode)));
        }

        function findSensitiveProperty(middlewareNode: estree.Node): estree.Property[] {
          if (middlewareNode.type === 'CallExpression') {
            return sensitivePropertyFinder(context, middlewareNode);
          }
          return [];
        }

        return {
          Program: () => {
            app = null;
            sensitiveProperties = [];
          },
          CallExpression: (node: estree.Node) => {
            if (app) {
              const callExpr = node as estree.CallExpression;
              const isSafe = !isUsingMiddleware(context, callExpr, app, isExposing);
              if (!isSafe) {
                for (const sensitive of sensitiveProperties) {
                  report(
                    context,
                    {
                      node: callExpr,
                      message,
                    },
                    [toSecondaryLocation(sensitive)],
                  );
                }
                sensitiveProperties = [];
              }
            }
          },
          VariableDeclarator: (node: estree.Node) => {
            if (!app) {
              const varDecl = node as estree.VariableDeclarator;
              const instantiatedApp = attemptFindAppInstantiation(varDecl, context);
              if (instantiatedApp) {
                app = instantiatedApp;
              }
            }
          },
          ':function': (node: estree.Node) => {
            if (!app) {
              const functionDef = node as estree.Function;
              const injectedApp = attemptFindAppInjection(functionDef, context, node);
              if (injectedApp) {
                app = injectedApp;
              }
            }
          },
        };
      },
    };
  }
}
