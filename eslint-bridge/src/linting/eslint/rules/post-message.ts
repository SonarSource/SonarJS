/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S2819/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import {
  isRequiredParserServices,
  getValueOfExpression,
  getTypeAsString,
  resolveFunction,
  isIdentifier,
} from './helpers';
import { childrenOf } from 'linting/eslint';

const POST_MESSAGE = 'postMessage';
const ADD_EVENT_LISTENER = 'addEventListener';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      specifyTarget: `Specify a target origin for this message.`,
      verifyOrigin: `Verify the origin of the received message.`,
    },
  },
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    return {
      [`CallExpression:matches([callee.name="${POST_MESSAGE}"], [callee.property.name="${POST_MESSAGE}"])`]:
        (node: estree.Node) => {
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
      messageId: 'specifyTarget',
    });
  }
  if (callee.type !== 'MemberExpression') {
    return;
  }
  if (isWindowObject(callee.object, context)) {
    context.report({
      node: callee,
      messageId: 'specifyTarget',
    });
  }
}

function checkAddEventListenerCall(callExpr: estree.CallExpression, context: Rule.RuleContext) {
  const { callee, arguments: args } = callExpr;
  if (
    !isWindowObject(callee, context) ||
    args.length < 2 ||
    !isMessageTypeEvent(args[0], context)
  ) {
    return;
  }

  let listener = resolveFunction(context, args[1]);
  if (listener?.body.type === 'CallExpression') {
    listener = resolveFunction(context, listener.body);
  }
  if (!listener || listener.params.length === 0) {
    return;
  }

  const event = listener.params[0];
  if (event.type !== 'Identifier') {
    return;
  }

  if (!hasVerifiedOrigin(context, listener, event)) {
    context.report({
      node: callee,
      messageId: 'verifyOrigin',
    });
  }
}

function hasVerifiedOrigin(
  context: Rule.RuleContext,
  listener: estree.Function,
  event: estree.Identifier,
) {
  const scope = context.getSourceCode().scopeManager.acquire(listener);
  const variable = scope?.variables.find(v => v.name === event.name);
  if (variable) {
    for (const reference of variable.references) {
      const identifier = reference.identifier as TSESTree.Identifier;
      const parent = identifier.parent;
      if (parent?.type === 'MemberExpression' && parent.parent?.type === 'BinaryExpression') {
        const { object, property } = parent;
        if (object === identifier && isIdentifier(property as estree.Node, 'origin')) {
          return true;
        }
      }
    }
  }
  return false;
}

function isMessageTypeEvent(eventNode: estree.Node, context: Rule.RuleContext) {
  const eventValue = getValueOfExpression(context, eventNode, 'Literal');
  return typeof eventValue?.value === 'string' && eventValue.value.toLowerCase() === 'message';
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
