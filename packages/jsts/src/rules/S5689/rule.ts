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
// https://sonarsource.github.io/rspec/#/rspec/S5689/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  Express,
  generateMeta,
  getFullyQualifiedName,
  isMethodInvocation,
} from '../helpers/index.js';
import { meta } from './meta.js';

const HELMET = 'helmet';
const HIDE_POWERED_BY = 'hide-powered-by';
const HEADER_X_POWERED_BY = 'X-Powered-By'.toLowerCase();
const PROTECTING_MIDDLEWARES = [HELMET, HIDE_POWERED_BY];
/** Expected number of arguments in `app.set`. */
const APP_SET_NUM_ARGS = 2;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      headerSet: 'Make sure disclosing the fingerprinting of this web technology is safe here.',
      headerDefault:
        'This framework implicitly discloses version information by default. Make sure it is safe here.',
    },
  }),
  create(context: Rule.RuleContext) {
    let appInstantiation: estree.Identifier | null = null;
    let isSafe = false;
    let isExplicitelyUnsafe = false;
    return {
      Program() {
        appInstantiation = null;
        isSafe = false;
        isExplicitelyUnsafe = true;
      },
      CallExpression: (node: estree.Node) => {
        if (!isSafe && appInstantiation) {
          const callExpr = node as estree.CallExpression;
          isSafe =
            Express.isUsingMiddleware(context, callExpr, appInstantiation, isProtecting(context)) ||
            isDisabledXPoweredBy(callExpr, appInstantiation) ||
            isSetFalseXPoweredBy(callExpr, appInstantiation) ||
            isAppEscaping(callExpr, appInstantiation);
          isExplicitelyUnsafe = isSetTrueXPoweredBy(callExpr, appInstantiation);
        }
      },
      VariableDeclarator: (node: estree.Node) => {
        if (!isSafe && !appInstantiation) {
          const varDecl = node as estree.VariableDeclarator;
          const app = Express.attemptFindAppInstantiation(varDecl, context);
          if (app) {
            appInstantiation = app;
          }
        }
      },
      ReturnStatement: (node: estree.Node) => {
        if (!isSafe && appInstantiation) {
          const ret = node as estree.ReturnStatement;
          isSafe = isAppEscapingThroughReturn(ret, appInstantiation);
        }
      },
      'Program:exit'() {
        if (!isSafe && appInstantiation) {
          let messageId = 'headerDefault';
          if (isExplicitelyUnsafe) {
            messageId = 'headerSet';
          }
          context.report({
            node: appInstantiation,
            messageId,
          });
        }
      },
    };
  },
};

/**
 * Checks whether node looks like `helmet.hidePoweredBy()`.
 */
function isHidePoweredByFromHelmet(context: Rule.RuleContext, n: estree.Node): boolean {
  if (n.type === 'CallExpression') {
    return getFullyQualifiedName(context, n) === `${HELMET}.hidePoweredBy`;
  }
  return false;
}

function isProtecting(context: Rule.RuleContext): (n: estree.Node) => boolean {
  return (n: estree.Node) =>
    Express.isMiddlewareInstance(context, PROTECTING_MIDDLEWARES, n) ||
    isHidePoweredByFromHelmet(context, n);
}

function isDisabledXPoweredBy(
  callExpression: estree.CallExpression,
  app: estree.Identifier,
): boolean {
  if (isMethodInvocation(callExpression, app.name, 'disable', 1)) {
    const arg0 = callExpression.arguments[0];
    return arg0.type === 'Literal' && String(arg0.value).toLowerCase() === HEADER_X_POWERED_BY;
  }
  return false;
}

function isSetFalseXPoweredBy(
  callExpression: estree.CallExpression,
  app: estree.Identifier,
): boolean {
  return getSetTrueXPoweredByValue(callExpression, app) === false;
}

function isSetTrueXPoweredBy(
  callExpression: estree.CallExpression,
  app: estree.Identifier,
): boolean {
  return getSetTrueXPoweredByValue(callExpression, app) === true;
}

function getSetTrueXPoweredByValue(callExpression: estree.CallExpression, app: estree.Identifier) {
  if (isMethodInvocation(callExpression, app.name, 'set', APP_SET_NUM_ARGS)) {
    const [headerName, onOff] = callExpression.arguments;
    if (
      headerName.type === 'Literal' &&
      String(headerName.value).toLowerCase() === HEADER_X_POWERED_BY &&
      onOff.type === 'Literal'
    ) {
      return onOff.value;
    }
  }
  return undefined;
}

function isAppEscaping(callExpr: estree.CallExpression, app: estree.Identifier): boolean {
  return Boolean(
    callExpr.arguments.find(arg => arg.type === 'Identifier' && arg.name === app.name),
  );
}

function isAppEscapingThroughReturn(ret: estree.ReturnStatement, app: estree.Identifier): boolean {
  const arg = ret.argument;
  return Boolean(arg && arg.type === 'Identifier' && arg.name === app.name);
}
