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
// https://jira.sonarsource.com/browse/RSPEC-2819

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import {
  isRequiredParserServices,
  getValueOfExpression,
  getTypeAsString,
  childrenOf,
  resolveFunction,
} from '../utils';

const MESSAGE = `Verify the message's origin in this cross-origin communication.`;
const POST_MESSAGE = 'postMessage';
const ADD_EVENT_LISTENER = 'addEventListener';

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    return {
      [`CallExpression:matches([callee.name="${POST_MESSAGE}"], [callee.property.name="${POST_MESSAGE}"])`]: (
        node: estree.Node,
      ) => {
        checkPostMessageCall(node as estree.CallExpression, context);
      },
      [`CallExpression[callee.property.name="${ADD_EVENT_LISTENER}"]`]: (node: estree.Node) => {
        checkAddEventListenerCall(node as estree.CallExpression, context);
      },
    };
  },
};

function isWindowObject(node: estree.Node, context: Rule.RuleContext) {
  const type = getTypeAsString(node, context.parserServices);
  const hasWindowName = WindowNameVisitor.containsWindowName(node, context);
  return type.match(/window/i) || type.match(/globalThis/i) || hasWindowName;
}

function checkPostMessageCall(callExpr: estree.CallExpression, context: Rule.RuleContext) {
  const { callee } = callExpr;
  // Window.postMessage() can take 2 or 3 arguments
  if (
    ![2, 3].includes(callExpr.arguments.length) ||
    getValueOfExpression(context, callExpr.arguments[1], 'Literal')?.value !== '*'
  ) {
    return;
  }
  if (callee.type === 'Identifier') {
    context.report({
      node: callee,
      message: MESSAGE,
    });
  }
  if (callee.type !== 'MemberExpression') {
    return;
  }
  if (isWindowObject(callee.object, context)) {
    context.report({
      node: callee,
      message: MESSAGE,
    });
  }
}

function checkAddEventListenerCall(callExpr: estree.CallExpression, context: Rule.RuleContext) {
  const { callee, arguments: args } = callExpr;
  if (!isWindowObject(callee, context) || args.length < 2) {
    return;
  }
  const listener = resolveFunction(context, args[1]);
  if (!listener || listener.params.length === 0) {
    return;
  }
  const event = listener.params[0];
  if (event.type !== 'Identifier') {
    return;
  }
  const hasVerifiedOrigin = EventListenerVisitor.isSenderIdentityVerified(
    listener.body,
    event,
    context,
  );
  if (!hasVerifiedOrigin) {
    context.report({
      node: callee,
      message: MESSAGE,
    });
  }
}

class WindowNameVisitor {
  private hasWindowName = false;

  static containsWindowName(node: estree.Node, context: Rule.RuleContext) {
    const visitor = new WindowNameVisitor();
    visitor.visit(node, context);
    return visitor.hasWindowName;
  }

  private visit(root: estree.Node, context: Rule.RuleContext) {
    const visitNode = (node: estree.Node) => {
      if (node.type === 'Identifier' && node.name.match(/window/i)) {
        this.hasWindowName = true;
      }
      childrenOf(node, context.getSourceCode().visitorKeys).forEach(visitNode);
    };
    visitNode(root);
  }
}

class EventListenerVisitor {
  private hasVerifiedOrigin = false;

  static isSenderIdentityVerified(
    node: estree.Node,
    event: estree.Identifier,
    context: Rule.RuleContext,
  ) {
    const visitor = new EventListenerVisitor();
    visitor.visit(node, event, context);
    return visitor.hasVerifiedOrigin;
  }

  private visit(root: estree.Node, event: estree.Identifier, context: Rule.RuleContext) {
    const visitNode = (node: estree.Node) => {
      if (this.hasVerifiedOrigin) {
        return;
      }
      const n = node as TSESTree.Node;
      if (n.type === 'MemberExpression' && n.parent?.type === 'BinaryExpression') {
        const { object, property } = n;
        if (
          object.type === 'Identifier' &&
          object.name === event.name &&
          property.type === 'Identifier' &&
          property.name === 'origin'
        ) {
          this.hasVerifiedOrigin = true;
          return;
        }
      }
      childrenOf(node, context.getSourceCode().visitorKeys).forEach(visitNode);
    };
    visitNode(root);
  }
}
