/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S4822/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  childrenOf,
  generateMeta,
  isRequiredParserServices,
  isThenable,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

type CallLikeExpression =
  | TSESTree.CallExpression
  | TSESTree.NewExpression
  | TSESTree.AwaitExpression;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
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
    for (const callLikeExpr of CallLikeExpressionVisitor.getCallExpressions(
      tryStmt.block,
      context,
    )) {
      if (
        callLikeExpr.type === 'AwaitExpression' ||
        !isThenable(callLikeExpr as estree.Node, services)
      ) {
        hasPotentiallyThrowingCalls = true;
        continue;
      }

      if (isAwaitLike(callLikeExpr) || isThened(callLikeExpr) || isCatch(callLikeExpr)) {
        continue;
      }

      (isCaught(callLikeExpr) ? capturedPromises : openPromises).push(callLikeExpr);
    }

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
    const visitNode = (node: estree.Node) => {
      switch (node.type) {
        case 'AwaitExpression':
        case 'CallExpression':
        case 'NewExpression':
          this.callLikeExpressions.push(node as TSESTree.NewExpression);
          break;
        case 'FunctionDeclaration':
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
          return;
      }
      for (const childNode of childrenOf(node as estree.Node, context.sourceCode.visitorKeys)) {
        visitNode(childNode);
      }
    };
    visitNode(root as estree.Node);
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
