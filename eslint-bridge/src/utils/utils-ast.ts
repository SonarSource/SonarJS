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
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { flatMap, toEncodedMessage } from '.';

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

export function isIdentifier(
  node: estree.Node | undefined,
  ...values: string[]
): node is estree.Identifier {
  return (
    node?.type === 'Identifier' &&
    (values.length === 0 || values.some(value => value === node.name))
  );
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

export function isBinaryPlus(
  node: estree.Node,
): node is estree.BinaryExpression & { operator: '+' } {
  return node.type === 'BinaryExpression' && node.operator === '+';
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

export function isFunctionInvocation(
  callExpression: estree.CallExpression,
  functionName: string,
  minArgs: number,
): boolean {
  return (
    callExpression.callee.type === 'Identifier' &&
    isIdentifier(callExpression.callee, functionName) &&
    callExpression.arguments.length >= minArgs
  );
}

export function isFunctionCall(
  node: estree.Node,
): node is estree.CallExpression & { callee: estree.Identifier } {
  return node.type === 'CallExpression' && node.callee.type === 'Identifier';
}

export function isMethodCall(callExpr: estree.CallExpression): callExpr is estree.CallExpression & {
  callee: estree.MemberExpression & { property: estree.Identifier };
} {
  return (
    callExpr.callee.type === 'MemberExpression' &&
    !callExpr.callee.computed &&
    callExpr.callee.property.type === 'Identifier'
  );
}

export function isCallingMethod(
  callExpr: estree.CallExpression,
  arity: number,
  ...methodNames: string[]
): callExpr is estree.CallExpression & {
  callee: estree.MemberExpression & { property: estree.Identifier };
} {
  return (
    isMethodCall(callExpr) &&
    callExpr.arguments.length === arity &&
    methodNames.includes(callExpr.callee.property.name)
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

export function getUniqueWriteUsage(context: Rule.RuleContext, name: string) {
  const variable = getVariableFromName(context, name);
  if (variable) {
    const writeReferences = variable.references.filter(reference => reference.isWrite());
    if (writeReferences.length === 1 && writeReferences[0].writeExpr) {
      return writeReferences[0].writeExpr;
    }
  }
  return undefined;
}

export function getUniqueWriteUsageOrNode(
  context: Rule.RuleContext,
  node: estree.Node,
): estree.Node {
  if (node.type === 'Identifier') {
    return getUniqueWriteUsage(context, node.name) || node;
  } else {
    return node;
  }
}

export function getValueOfExpression<T extends estree.Node['type']>(
  context: Rule.RuleContext,
  expr: estree.Node | undefined | null,
  type: T,
) {
  if (!expr) {
    return undefined;
  }
  if (expr.type === 'Identifier') {
    const usage = getUniqueWriteUsage(context, expr.name);
    if (usage && isNodeType(usage, type)) {
      return usage;
    }
  }

  if (isNodeType(expr, type)) {
    return expr;
  }
  return undefined;
}

// see https://stackoverflow.com/questions/64262105/narrowing-return-value-of-function-based-on-argument
function isNodeType<T extends estree.Node['type']>(
  node: estree.Node,
  type: T,
): node is Extract<estree.Node, { type: T }> {
  return node.type === type;
}

/**
 * for `x = 42` or `let x = 42` when visiting '42' returns 'x' variable
 */
export function getLhsVariable(context: Rule.RuleContext): Scope.Variable | undefined {
  const parent = context.getAncestors()[context.getAncestors().length - 1];
  let formIdentifier: estree.Identifier | undefined;
  if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    formIdentifier = parent.id;
  } else if (parent.type === 'AssignmentExpression' && parent.left.type === 'Identifier') {
    formIdentifier = parent.left;
  }
  if (formIdentifier) {
    return getVariableFromName(context, formIdentifier.name);
  }

  return undefined;
}

export function getVariableFromName(context: Rule.RuleContext, name: string) {
  let scope: Scope.Scope | null = context.getScope();
  let variable;
  while (variable == null && scope != null) {
    variable = scope.variables.find(value => value.name === name);
    scope = scope.upper;
  }
  return variable;
}

/**
 * Takes array of arguments. Keeps following variable definitions
 * and unpacking arrays as long as possible. Returns flattened
 * array with all collected nodes.
 *
 * A usage example should clarify why this might be useful.
 * According to ExpressJs `app.use` spec, the arguments can be:
 *
 * - A middleware function.
 * - A series of middleware functions (separated by commas).
 * - An array of middleware functions.
 * - A combination of all of the above.
 *
 * This means that methods like `app.use` accept variable arguments,
 * but also arrays, or combinations thereof. This methods helps
 * to flatten out such complicated composed argument lists.
 */
export function flattenArgs(context: Rule.RuleContext, args: estree.Node[]): estree.Node[] {
  // Invokes `getUniqueWriteUsageOrNode` at most once, from then on
  // only flattens arrays.
  function recHelper(nodePossiblyIdentifier: estree.Node): estree.Node[] {
    const n = getUniqueWriteUsageOrNode(context, nodePossiblyIdentifier);
    if (n.type === 'ArrayExpression') {
      return flatMap(n.elements as estree.Node[], recHelper);
    } else {
      return [n];
    }
  }

  return flatMap(args, recHelper);
}

export function resolveIdentifiers(
  node: TSESTree.Node,
  acceptShorthand = false,
): TSESTree.Identifier[] {
  const identifiers: TSESTree.Identifier[] = [];
  resolveIdentifiersAcc(node, identifiers, acceptShorthand);
  return identifiers;
}

function resolveIdentifiersAcc(
  node: TSESTree.Node,
  identifiers: TSESTree.Identifier[],
  acceptShorthand: boolean,
): void {
  if (!node) {
    return;
  }
  switch (node.type) {
    case 'Identifier':
      identifiers.push(node);
      break;
    case 'ObjectPattern':
      node.properties.forEach(prop => resolveIdentifiersAcc(prop, identifiers, acceptShorthand));
      break;
    case 'ArrayPattern':
      node.elements.forEach(
        elem => elem && resolveIdentifiersAcc(elem, identifiers, acceptShorthand),
      );
      break;
    case 'Property':
      if (acceptShorthand || !node.shorthand) {
        resolveIdentifiersAcc(node.value, identifiers, acceptShorthand);
      }
      break;
    case 'RestElement':
      resolveIdentifiersAcc(node.argument, identifiers, acceptShorthand);
      break;
    case 'AssignmentPattern':
      resolveIdentifiersAcc(node.left, identifiers, acceptShorthand);
      break;
    case 'TSParameterProperty':
      resolveIdentifiersAcc(node.parameter, identifiers, acceptShorthand);
      break;
  }
}

export function getObjectExpressionProperty(
  node: estree.Node | undefined | null,
  propertyKey: string,
): estree.Property | undefined {
  if (node?.type === 'ObjectExpression') {
    const properties = node.properties.filter(
      p =>
        p.type === 'Property' &&
        (isIdentifier(p.key, propertyKey) || (isLiteral(p.key) && p.key.value === propertyKey)),
    ) as estree.Property[];
    // if property is duplicated, we return the last defined
    return properties[properties.length - 1];
  }
  return undefined;
}

export function getPropertyWithValue(
  context: Rule.RuleContext,
  objectExpression: estree.ObjectExpression,
  propertyName: string,
  propertyValue: estree.Literal['value'],
): estree.Property | undefined {
  const maybeProperty = getObjectExpressionProperty(objectExpression, propertyName);
  if (maybeProperty) {
    const maybePropertyValue = getValueOfExpression(context, maybeProperty.value, 'Literal');
    if (maybePropertyValue?.value === propertyValue) {
      return maybeProperty;
    }
  }
  return undefined;
}

export function resolveFromFunctionReference(
  context: Rule.RuleContext,
  functionIdentifier: estree.Identifier,
) {
  const { scopeManager } = context.getSourceCode();
  for (const scope of scopeManager.scopes) {
    const reference = scope.references.find(r => r.identifier === functionIdentifier);
    if (
      reference?.resolved &&
      reference.resolved.defs.length === 1 &&
      reference.resolved.defs[0].type === 'FunctionName'
    ) {
      return reference.resolved.defs[0].node;
    }
  }
  return null;
}

export function resolveFunction(
  context: Rule.RuleContext,
  node: estree.Node,
): estree.Function | null {
  if (isFunctionNode(node)) {
    return node;
  } else if (node.type === 'Identifier') {
    return resolveFromFunctionReference(context, node);
  } else {
    return null;
  }
}

export function checkSensitiveCall(
  context: Rule.RuleContext,
  callExpression: estree.CallExpression,
  sensitiveArgumentIndex: number,
  sensitiveProperty: string,
  sensitivePropertyValue: boolean,
  message: string,
) {
  if (callExpression.arguments.length < sensitiveArgumentIndex + 1) {
    return;
  }
  const sensitiveArgument = callExpression.arguments[sensitiveArgumentIndex];
  const options = getValueOfExpression(context, sensitiveArgument, 'ObjectExpression');
  if (!options) {
    return;
  }
  const unsafeProperty = getPropertyWithValue(
    context,
    options,
    sensitiveProperty,
    sensitivePropertyValue,
  );
  if (unsafeProperty) {
    context.report({
      node: callExpression.callee,
      message: toEncodedMessage(message, [unsafeProperty]),
    });
  }
}

export function isStringLiteral(node: estree.Node): node is estree.Literal & { value: string } {
  return isLiteral(node) && typeof node.value === 'string';
}

export function isNumberLiteral(node: estree.Node): node is estree.Literal & { value: number } {
  return isLiteral(node) && typeof node.value === 'number';
}

export function isRegexLiteral(node: estree.Node): node is estree.RegExpLiteral {
  return node.type === 'Literal' && node.value instanceof RegExp;
}

export function isDotNotation(
  node: estree.Node,
): node is estree.MemberExpression & { property: estree.Identifier } {
  return node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier';
}

export function isObjectDestructuring(
  node: estree.Node,
): node is
  | (estree.VariableDeclarator & { id: estree.ObjectPattern })
  | (estree.AssignmentExpression & { left: estree.ObjectPattern }) {
  return (
    (node.type === 'VariableDeclarator' && node.id.type === 'ObjectPattern') ||
    (node.type === 'AssignmentExpression' && node.left.type === 'ObjectPattern')
  );
}

export function isStaticTemplateLiteral(node: estree.Node): node is estree.TemplateLiteral {
  return (
    node.type === 'TemplateLiteral' && node.expressions.length === 0 && node.quasis.length === 1
  );
}

export function isThisExpression(node: estree.Node): node is estree.ThisExpression {
  return node.type === 'ThisExpression';
}
