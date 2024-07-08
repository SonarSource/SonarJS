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
// https://sonarsource.github.io/rspec/#/rspec/S4822/javascript

import { Rule, SourceCode } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import { isRequiredParserServices, isThenable, report, toSecondaryLocation } from '../helpers';
import { SONAR_RUNTIME } from '../../linter/parameters';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from './meta.json';

type CallLikeExpression =
  | TSESTree.CallExpression
  | TSESTree.NewExpression
  | TSESTree.AwaitExpression;

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (isRequiredParserServices(services)) {
      return {
        TryStatement: (node: estree.Node) =>
          visitTryStatement(node as TSESTree.TryStatement, context, services),
      };
    }
    return {};
  },
};

function visitTryStatement(
  tryStmt: TSESTree.TryStatement,
  context: Rule.RuleContext,
  services: any,
) {
  if (tryStmt.handler) {
    // without '.catch()'
    const openPromises: TSESTree.Node[] = [];
    // with '.catch()'
    const capturedPromises: TSESTree.Node[] = [];

    let hasPotentiallyThrowingCalls = false;
    CallLikeExpressionVisitor.getCallExpressions(tryStmt.block, context).forEach(callLikeExpr => {
      if (
        callLikeExpr.type === 'AwaitExpression' ||
        !isThenable(callLikeExpr as estree.Node, services)
      ) {
        hasPotentiallyThrowingCalls = true;
        return;
      }

      if (isAwaitLike(callLikeExpr) || isThened(callLikeExpr) || isCatch(callLikeExpr)) {
        return;
      }

      (isCaught(callLikeExpr) ? capturedPromises : openPromises).push(callLikeExpr);
    });

    if (!hasPotentiallyThrowingCalls) {
      checkForWrongCatch(tryStmt, openPromises, context);
      checkForUselessCatch(tryStmt, openPromises, capturedPromises, context);
    }
  }
}

class CallLikeExpressionVisitor {
  private readonly callLikeExpressions: CallLikeExpression[] = [];

  static getCallExpressions(node: TSESTree.Node, context: Rule.RuleContext) {
    const visitor = new CallLikeExpressionVisitor();
    visitor.visit(node, context);
    return visitor.callLikeExpressions;
  }

  private visit(root: TSESTree.Node, context: Rule.RuleContext) {
    const visitNode = (node: TSESTree.Node) => {
      switch (node.type) {
        case 'AwaitExpression':
        case 'CallExpression':
        case 'NewExpression':
          this.callLikeExpressions.push(node);
          break;
        case 'FunctionDeclaration':
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
          return;
      }
      childrenOf(node, context.sourceCode.visitorKeys).forEach(visitNode);
    };
    visitNode(root);
  }
}

function checkForWrongCatch(
  tryStmt: TSESTree.TryStatement,
  openPromises: TSESTree.Node[],
  context: Rule.RuleContext,
) {
  if (openPromises.length > 0) {
    const ending = openPromises.length > 1 ? 's' : '';
    const message = `Consider using 'await' for the promise${ending} inside this 'try' or replace it with 'Promise.prototype.catch(...)' usage${ending}.`;
    const token = context.sourceCode.getFirstToken(tryStmt as estree.Node);
    report(
      context,
      {
        message,
        loc: token!.loc,
      },
      openPromises.map(node => toSecondaryLocation(node, 'Promise')),
    );
  }
}

function checkForUselessCatch(
  tryStmt: TSESTree.TryStatement,
  openPromises: TSESTree.Node[],
  capturedPromises: TSESTree.Node[],
  context: Rule.RuleContext,
) {
  if (openPromises.length === 0 && capturedPromises.length > 0) {
    const ending = capturedPromises.length > 1 ? 's' : '';
    const message = `Consider removing this 'try' statement as promise${ending} rejection is already captured by '.catch()' method.`;
    const token = context.sourceCode.getFirstToken(tryStmt as estree.Node);
    report(
      context,
      {
        message,
        loc: token!.loc,
      },
      capturedPromises.map(node => toSecondaryLocation(node, 'Caught promise')),
    );
  }
}

function isAwaitLike(callExpr: CallLikeExpression) {
  return (
    callExpr.parent &&
    (callExpr.parent.type === 'AwaitExpression' || callExpr.parent.type === 'YieldExpression')
  );
}

function isThened(callExpr: CallLikeExpression) {
  return (
    callExpr.parent &&
    callExpr.parent.type === 'MemberExpression' &&
    callExpr.parent.property.type === 'Identifier' &&
    callExpr.parent.property.name === 'then'
  );
}

function isCaught(callExpr: CallLikeExpression) {
  return (
    callExpr.parent &&
    callExpr.parent.type === 'MemberExpression' &&
    callExpr.parent.property.type === 'Identifier' &&
    callExpr.parent.property.name === 'catch'
  );
}

function isCatch(callExpr: CallLikeExpression) {
  return (
    callExpr.type === 'CallExpression' &&
    callExpr.callee.type === 'MemberExpression' &&
    callExpr.callee.property.type === 'Identifier' &&
    callExpr.callee.property.name === 'catch'
  );
}

function childrenOf(node: TSESTree.Node, visitorKeys: SourceCode.VisitorKeys) {
  const keys = visitorKeys[node.type];
  const children = [];
  if (keys) {
    for (const key of keys) {
      const child = (node as any)[key];
      if (Array.isArray(child)) {
        children.push(...child);
      } else {
        children.push(child);
      }
    }
  }
  return children.filter(Boolean);
}
