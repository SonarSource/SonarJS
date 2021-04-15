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
import { Scope } from 'eslint';
import * as estree from 'estree';

export type LoopLike =
  | estree.WhileStatement
  | estree.DoWhileStatement
  | estree.ForStatement
  | estree.ForOfStatement
  | estree.ForInStatement;

export type FunctionNodeType =
  | estree.FunctionDeclaration
  | estree.FunctionExpression
  | estree.ArrowFunctionExpression;

export const FUNCTION_NODES = [
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
];

export const functionLike = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'MethodDefinition',
]);

export function isIdentifier(node: estree.Node, ...values: string[]): node is estree.Identifier {
  return node.type === 'Identifier' && values.some(value => value === node.name);
}

export function isMemberWithProperty(node: estree.Node, ...values: string[]) {
  return node.type === 'MemberExpression' && isIdentifier(node.property, ...values);
}

export function isMemberExpression(
  node: estree.Node,
  objectValue: string,
  ...propertyValue: string[]
) {
  if (node.type === 'MemberExpression') {
    const { object, property } = node;
    if (isIdentifier(object, objectValue) && isIdentifier(property, ...propertyValue)) {
      return true;
    }
  }

  return false;
}

export function isUnaryExpression(node: estree.Node | undefined): node is estree.UnaryExpression {
  return node !== undefined && node.type === 'UnaryExpression';
}

export function isArrayExpression(node: estree.Node | undefined): node is estree.ArrayExpression {
  return node !== undefined && node.type === 'ArrayExpression';
}

export function isRequireModule(node: estree.CallExpression, ...moduleNames: string[]) {
  if (isIdentifier(node.callee, 'require') && node.arguments.length === 1) {
    const argument = node.arguments[0];
    if (argument.type === 'Literal') {
      return moduleNames.includes(String(argument.value));
    }
  }

  return false;
}

export function isMethodInvocation(
  callExpression: estree.CallExpression,
  objectIdentifierName: string,
  methodName: string,
  minArgs: number,
): boolean {
  return (
    callExpression.callee.type === 'MemberExpression' &&
    isIdentifier(callExpression.callee.object, objectIdentifierName) &&
    isIdentifier(callExpression.callee.property, methodName) &&
    callExpression.callee.property.type === 'Identifier' &&
    callExpression.arguments.length >= minArgs
  );
}

export function isNamespaceSpecifier(importDeclaration: estree.ImportDeclaration, name: string) {
  return importDeclaration.specifiers.some(
    ({ type, local }) => type === 'ImportNamespaceSpecifier' && local.name === name,
  );
}

export function isDefaultSpecifier(importDeclaration: estree.ImportDeclaration, name: string) {
  return importDeclaration.specifiers.some(
    ({ type, local }) => type === 'ImportDefaultSpecifier' && local.name === name,
  );
}

export function isModuleExports(node: estree.Node): boolean {
  return (
    node.type === 'MemberExpression' &&
    node.object.type === 'Identifier' &&
    node.object.name === 'module' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'exports'
  );
}

export function isFunctionNode(node: estree.Node): node is FunctionNodeType {
  return FUNCTION_NODES.includes(node.type);
}

// we have similar function in eslint-plugin-sonarjs, however this one accepts null
// eventually we should update eslint-plugin-sonarjs
export function isLiteral(n: estree.Node | null): n is estree.Literal {
  return n != null && n.type === 'Literal';
}

export function isNullLiteral(n: estree.Node): boolean {
  return isLiteral(n) && n.value === null;
}

/**
 * Detect expression statements like the following:
 *  myArray[1] = 42;
 *  myArray[1] += 42;
 *  myObj.prop1 = 3;
 *  myObj.prop1 += 3;
 */
export function isElementWrite(statement: estree.ExpressionStatement, ref: Scope.Reference) {
  if (statement.expression.type === 'AssignmentExpression') {
    const assignmentExpression = statement.expression;
    const lhs = assignmentExpression.left;
    return isMemberExpressionReference(lhs, ref);
  }
  return false;
}

function isMemberExpressionReference(lhs: estree.Node, ref: Scope.Reference): boolean {
  return (
    lhs.type === 'MemberExpression' &&
    (isReferenceTo(ref, lhs.object) || isMemberExpressionReference(lhs.object, ref))
  );
}

export function isReferenceTo(ref: Scope.Reference, node: estree.Node) {
  return node.type === 'Identifier' && node === ref.identifier;
}
