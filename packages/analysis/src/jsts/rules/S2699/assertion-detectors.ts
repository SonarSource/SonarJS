/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import { isMethodCall } from '../helpers/ast.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import { getFullyQualifiedNameTS } from '../helpers/module-ts.js';

const ADDITIONAL_CHAI_ASSERT_FQNS = new Set(['chai.assert.instance', 'chai.assert.is']);
const SHOULD_TERMINAL_CALLS = new Set(['calledWith', 'lengthOf', 'property']);
const SHOULD_TERMINAL_PROPERTIES = new Set([
  'exists',
  'exist',
  'false',
  'null',
  'true',
  'undefined',
]);

export function isAdditionalAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  return isAdditionalAssertCall(context, node) || isAdditionalShouldAssertion(node);
}

export function isAdditionalTSAssertion(
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
): boolean {
  return isAdditionalTSAssertCall(services, node) || isAdditionalTSShouldAssertion(node);
}

export function isStandaloneShouldAccess(context: Rule.RuleContext, node: estree.Node): boolean {
  if (
    node.type !== 'MemberExpression' ||
    node.computed ||
    node.property.type !== 'Identifier' ||
    node.property.name !== 'should'
  ) {
    return false;
  }

  const parent = context.sourceCode.getAncestors(node).at(-1);
  return !isExtendingShouldChainParent(parent, node);
}

export function isStandaloneTSShouldAccess(node: ts.Node): boolean {
  if (!isTSPropertyAccess(node, 'should')) {
    return false;
  }

  return !isTSExtendingShouldChainParent(node.parent, node);
}

function isAdditionalAssertCall(context: Rule.RuleContext, node: estree.Node): boolean {
  return (
    node.type === 'CallExpression' &&
    ADDITIONAL_CHAI_ASSERT_FQNS.has(getFullyQualifiedName(context, node.callee) ?? '')
  );
}

function isAdditionalTSAssertCall(
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
): boolean {
  return (
    node.kind === ts.SyntaxKind.CallExpression &&
    ADDITIONAL_CHAI_ASSERT_FQNS.has(getFullyQualifiedNameTS(services, node) ?? '')
  );
}

function isAdditionalShouldAssertion(node: estree.Node): boolean {
  if (node.type === 'CallExpression') {
    return isAdditionalShouldCall(node);
  }
  return isAdditionalShouldProperty(node);
}

function isAdditionalShouldCall(node: estree.CallExpression): boolean {
  return (
    isMethodCall(node) &&
    SHOULD_TERMINAL_CALLS.has(node.callee.property.name) &&
    hasShouldChain(node.callee.object)
  );
}

function isAdditionalShouldProperty(node: estree.Node): boolean {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property.type === 'Identifier' &&
    SHOULD_TERMINAL_PROPERTIES.has(node.property.name) &&
    hasShouldChain(node.object)
  );
}

function hasShouldChain(node: estree.Node): boolean {
  let current: estree.Node | estree.Expression | estree.Super = node;

  while (current.type === 'MemberExpression' || current.type === 'CallExpression') {
    if (current.type === 'MemberExpression') {
      if (
        !current.computed &&
        current.property.type === 'Identifier' &&
        current.property.name === 'should'
      ) {
        return true;
      }
      current = current.object;
    } else if (current.callee.type === 'MemberExpression') {
      current = current.callee.object;
    } else {
      return false;
    }
  }

  return false;
}

function isAdditionalTSShouldAssertion(node: ts.Node): boolean {
  if (node.kind === ts.SyntaxKind.CallExpression) {
    return isAdditionalTSShouldCall(node as ts.CallExpression);
  }
  return isAdditionalTSShouldProperty(node);
}

function isAdditionalTSShouldCall(node: ts.CallExpression): boolean {
  return (
    ts.isPropertyAccessExpression(node.expression) &&
    SHOULD_TERMINAL_CALLS.has(node.expression.name.text) &&
    hasTSShouldChain(node.expression.expression)
  );
}

function isAdditionalTSShouldProperty(node: ts.Node): boolean {
  return (
    ts.isPropertyAccessExpression(node) &&
    SHOULD_TERMINAL_PROPERTIES.has(node.name.text) &&
    hasTSShouldChain(node.expression)
  );
}

function hasTSShouldChain(node: ts.Expression): boolean {
  let current: ts.Node = node;

  while (ts.isPropertyAccessExpression(current) || ts.isCallExpression(current)) {
    if (ts.isPropertyAccessExpression(current)) {
      if (current.name.text === 'should') {
        return true;
      }
      current = current.expression;
    } else if (ts.isPropertyAccessExpression(current.expression)) {
      current = current.expression.expression;
    } else {
      return false;
    }
  }

  return false;
}

function isExtendingShouldChainParent(
  parent: estree.Node | undefined,
  node: estree.MemberExpression,
): boolean {
  return (
    (parent?.type === 'MemberExpression' && parent.object === node) ||
    (parent?.type === 'CallExpression' && parent.callee === node)
  );
}

function isTSPropertyAccess(node: ts.Node, name: string): node is ts.PropertyAccessExpression {
  return ts.isPropertyAccessExpression(node) && node.name.text === name;
}

function isTSExtendingShouldChainParent(parent: ts.Node | undefined, node: ts.Node): boolean {
  return (
    (ts.isPropertyAccessExpression(parent) && parent.expression === node) ||
    (ts.isCallExpression(parent) && parent.expression === node)
  );
}
