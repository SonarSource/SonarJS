/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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

import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import {
  isRequiredParserServices,
  getValueOfExpression,
  getTypeAsString,
  resolveFunction,
  isIdentifier,
  findFirstMatchingLocalAncestor,
} from '../helpers';
import { childrenOf } from '../../linter';
import { isIfStatement } from 'eslint-plugin-sonarjs/lib/utils/nodes';

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

/**
 * Checks if event.origin or event.originalEvent.origin is verified
 */
function hasVerifiedOrigin(
  context: Rule.RuleContext,
  listener: estree.Function,
  event: estree.Identifier,
) {
  const scope = context.sourceCode.scopeManager.acquire(listener);
  const eventVariable = scope?.variables.find(v => v.name === event.name);
  if (eventVariable) {
    const eventIdentifiers = eventVariable.references.map(e => e.identifier);
    for (const reference of eventVariable.references) {
      const eventRef = reference.identifier as TSESTree.Identifier;

      if (isEventOriginCompared(eventRef) || isEventOriginalEventCompared(eventRef)) {
        return true;
      }
      // event OR-ed with event.originalEvent
      const unionEvent = findUnionEvent(eventRef, eventIdentifiers as TSESTree.Identifier[]);
      if (unionEvent !== null && isReferenceCompared(scope, unionEvent as TSESTree.Identifier)) {
        return true;
      }
      // event.origin OR-ed with event.originalEvent.origin
      const unionOrigin = findUnionOrigin(eventRef, eventIdentifiers as TSESTree.Identifier[]);
      if (
        unionOrigin !== null &&
        isEventOriginReferenceCompared(scope, unionOrigin as TSESTree.Identifier)
      ) {
        return true;
      }
    }
  }
  return false;

  /**
   * Looks for unionEvent = event | event.originalEvent
   */
  function findUnionEvent(event: TSESTree.Node, eventIdentifiers: TSESTree.Identifier[]) {
    const logicalExpr = event.parent;
    if (logicalExpr?.type !== 'LogicalExpression') {
      return null;
    }
    if (
      (logicalExpr.left === event &&
        isEventOriginalEvent(logicalExpr.right as estree.MemberExpression, eventIdentifiers)) ||
      (logicalExpr.right === event &&
        isEventOriginalEvent(logicalExpr.left as estree.MemberExpression, eventIdentifiers))
    ) {
      return extractVariableDeclaratorIfExists(logicalExpr);
    }
    return null;
  }

  /**
   * looks for unionOrigin = event.origin | event.originalEvent.origin
   */
  function findUnionOrigin(eventRef: TSESTree.Node, eventIdentifiers: TSESTree.Identifier[]) {
    const memberExpr = eventRef.parent;
    // looks for event.origin in a LogicalExpr
    if (
      !(memberExpr?.type === 'MemberExpression' && memberExpr.parent?.type === 'LogicalExpression')
    ) {
      return null;
    }
    const logicalExpr = memberExpr.parent;
    if (
      !(
        logicalExpr.left === memberExpr &&
        isEventOriginalEventOrigin(logicalExpr.right as estree.MemberExpression, eventIdentifiers)
      ) &&
      !(
        logicalExpr.right === memberExpr &&
        isEventOriginalEventOrigin(logicalExpr.left as estree.MemberExpression, eventIdentifiers)
      )
    ) {
      return null;
    }
    return extractVariableDeclaratorIfExists(logicalExpr);

    /**
     * checks if memberExpr is event.originalEvent.origin
     */
    function isEventOriginalEventOrigin(
      memberExpr: estree.MemberExpression,
      eventIdentifiers: TSESTree.Identifier[],
    ) {
      const subMemberExpr = memberExpr.object;
      if (subMemberExpr?.type !== 'MemberExpression') {
        return false;
      }
      const isOrigin =
        memberExpr.property.type === 'Identifier' && memberExpr.property.name === 'origin';
      return isEventOriginalEvent(subMemberExpr, eventIdentifiers) && isOrigin;
    }
  }
}

/**
 * Looks for an occurence of the provided node in an IfStatement
 */
function isReferenceCompared(scope: Scope.Scope | null, identifier: TSESTree.Identifier) {
  function getGrandParent(node: TSESTree.Node) {
    return node?.parent?.parent as TSESTree.Identifier;
  }
  return checkReference(scope, identifier, getGrandParent);
}

/**
 * checks if a reference of identifier is
 * node.identifier
 */
function isEventOriginReferenceCompared(
  scope: Scope.Scope | null,
  identifier: TSESTree.Identifier,
) {
  function getParent(node: TSESTree.Node) {
    return node?.parent as TSESTree.Identifier;
  }
  return checkReference(scope, identifier, getParent);
}

/**
 *
 */
function checkReference(
  scope: Scope.Scope | null,
  identifier: TSESTree.Identifier,
  callback: Function,
) {
  const identifierVariable = scope?.variables.find(v => v.name === identifier.name);
  if (!identifierVariable) {
    return false;
  }
  for (const reference of identifierVariable.references) {
    const binaryExpressionCandidate = callback(reference.identifier);
    if (isInIfStatement(binaryExpressionCandidate)) {
      return true;
    }
  }
  return false;
}

/**
 * checks if memberExpr is event.originalEvent
 */
function isEventOriginalEvent(
  memberExpr: estree.MemberExpression,
  eventIdentifiers: TSESTree.Identifier[],
) {
  const isEvent =
    memberExpr.object.type === 'Identifier' &&
    eventIdentifiers.includes(memberExpr.object as TSESTree.Identifier);
  const isOriginalEvent =
    memberExpr.property.type === 'Identifier' && memberExpr.property.name === 'originalEvent';
  return isEvent && isOriginalEvent;
}

/**
 * Extracts the identifier to which the 'node' expression is assigned to
 */
function extractVariableDeclaratorIfExists(node: TSESTree.Node) {
  if (node.parent?.type !== 'VariableDeclarator') {
    return null;
  }
  return node.parent.id;
}

/**
 * Looks for an IfStatement with event.origin
 */
function isEventOriginCompared(event: TSESTree.Identifier) {
  const memberExpr = findEventOrigin(event);
  return isInIfStatement(memberExpr);
}

/**
 * Looks for an IfStatement with event.originalEvent.origin
 */
function isEventOriginalEventCompared(event: TSESTree.Identifier) {
  const eventOriginalEvent = findEventOriginalEvent(event);
  if (!eventOriginalEvent || !eventOriginalEvent.parent) {
    return false;
  }

  if (!isPropertyOrigin(eventOriginalEvent.parent as TSESTree.MemberExpression)) {
    return false;
  }
  return isInIfStatement(eventOriginalEvent);
}

/**
 * Returns event.origin MemberExpression, if exists
 */
function findEventOrigin(event: TSESTree.Identifier) {
  const parent = event.parent;
  if (parent?.type !== 'MemberExpression') {
    return null;
  }
  if (isPropertyOrigin(parent)) {
    return parent;
  } else {
    return null;
  }
}

/**
 * Checks if node has a property 'origin'
 */
function isPropertyOrigin(node: TSESTree.MemberExpression) {
  return isIdentifier(node.property as estree.Node, 'origin');
}

/**
 * Returns event.originalEvent MemberExpression, if exists
 */
function findEventOriginalEvent(event: TSESTree.Identifier) {
  const memberExpr = event.parent;
  if (memberExpr?.type !== 'MemberExpression') {
    return null;
  }
  const { object: eventCandidate, property: originalEventIdentifierCandidate } = memberExpr;
  if (
    eventCandidate === event &&
    isIdentifier(originalEventIdentifierCandidate as estree.Node, 'originalEvent')
  ) {
    return memberExpr;
  }
  return null;
}

/**
 * Checks if the current node is nested in an IfStatement
 */
function isInIfStatement(node: TSESTree.Node | undefined | null) {
  // this checks for 'undefined' and 'null', because node.parent can be 'null'
  if (node == null) {
    return false;
  }
  return findFirstMatchingLocalAncestor(node, isIfStatement) != null;
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
      childrenOf(node, context.sourceCode.visitorKeys).forEach(visitNode);
    };
    visitNode(root);
  }
}
