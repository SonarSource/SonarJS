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
// https://jira.sonarsource.com/browse/RSPEC-5728

import { Rule } from 'eslint';
import * as estree from 'estree';
import { Express, getModuleNameOfNode, getPropertyWithValue } from './utils';

const HELMET = 'helmet';
const CONTENT_SECURITY_POLICY = 'contentSecurityPolicy';

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    let instantiatedApp: estree.Identifier | null;
    let isSafe: boolean;
    return {
      Program: () => {
        instantiatedApp = null;
        isSafe = false;
      },
      CallExpression: (node: estree.Node) => {
        if (!isSafe && instantiatedApp) {
          const callExpr = node as estree.CallExpression;
          isSafe = Express.isUsingMiddleware(
            context,
            callExpr,
            instantiatedApp,
            isProtecting(context),
          );
        }
      },
      VariableDeclarator: (node: estree.Node) => {
        if (!isSafe && !instantiatedApp) {
          const varDecl = node as estree.VariableDeclarator;
          const app = Express.attemptFindAppInstantiation(varDecl, context);
          if (app) {
            instantiatedApp = app;
          }
        }
      },
      'Program:exit': () => {
        if (!isSafe && instantiatedApp) {
          context.report({
            message: `Make sure not enabling content security policy fetch directives is safe here.`,
            node: instantiatedApp,
          });
        }
      },
    };
  },
};

function isProtecting(context: Rule.RuleContext): (n: estree.Node) => boolean {
  return (n: estree.Node) => !isSetFalseContentSecurityPolicyFromHelmet(context, n);
}

/**
 * Checks whether node looks like `helmet(<options>?)`,
 * where <options> includes `contentSecurityPolicy: false`.
 */
function isSetFalseContentSecurityPolicyFromHelmet(
  context: Rule.RuleContext,
  node: estree.Node,
): boolean {
  if (node.type === 'CallExpression') {
    const { callee, arguments: args } = node;
    return (
      callee.type === 'Identifier' &&
      getModuleNameOfNode(context, callee)?.value === HELMET &&
      Boolean(
        args.find(
          arg =>
            arg.type === 'ObjectExpression' &&
            Boolean(getPropertyWithValue(context, arg, CONTENT_SECURITY_POLICY, false)),
        ),
      )
    );
  }
  return false;
}
