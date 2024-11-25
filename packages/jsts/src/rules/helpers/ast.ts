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
import { TSESTree } from '@typescript-eslint/utils';
import { Rule, Scope } from 'eslint';
import estree from 'estree';
import {
  findFirstMatchingAncestor,
  flatMap,
  getFullyQualifiedName,
  report,
  toSecondaryLocation,
} from './index.js';

export type Node = estree.Node | TSESTree.Node;

const MODULE_DECLARATION_NODES = [
  'ImportDeclaration',
  'ExportNamedDeclaration',
  'ExportDefaultDeclaration',
  'ExportAllDeclaration',
];

export function isModuleDeclaration(
  node: estree.Node | undefined,
): node is
  | estree.ExportAllDeclaration
  | estree.ExportDefaultDeclaration
  | estree.ExportNamedDeclaration
  | estree.ImportDeclaration {
  return node !== undefined && MODULE_DECLARATION_NODES.includes(node.type);
}

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

export type StringLiteral = (estree.Literal | TSESTree.Literal) & { value: string };

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

export function isFunctionExpression(
  node: TSESTree.Node | undefined,
): node is TSESTree.FunctionExpression {
  return node !== undefined && node.type === 'FunctionExpression';
}

export function isFunctionDeclaration(
  node: TSESTree.Node | undefined,
): node is TSESTree.FunctionDeclaration {
  return node !== undefined && node.type === 'FunctionDeclaration';
}

export function isArrowFunctionExpression(
  node: TSESTree.Node | undefined,
): node is TSESTree.ArrowFunctionExpression {
  return node !== undefined && node.type === 'ArrowFunctionExpression';
}

export function isIdentifier(
  node: Node | undefined,
  ...values: string[]
): node is estree.Identifier | TSESTree.Identifier {
  return (
    node?.type === 'Identifier' &&
    (values.length === 0 || values.some(value => value === node.name))
  );
}

export function getProgramStatements(program: estree.Program) {
  return program.body.filter((node): node is estree.Statement => !isModuleDeclaration(node));
}
export function isIfStatement(node: Node | undefined): node is TSESTree.IfStatement {
  return node !== undefined && node.type === 'IfStatement';
}

export function isMemberWithProperty(node: estree.Node, ...values: string[]) {
  return node.type === 'MemberExpression' && isIdentifier(node.property, ...values);
}

export function isThrowStatement(node: Node | undefined): node is TSESTree.ThrowStatement {
  return node !== undefined && node.type === 'ThrowStatement';
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

export function isLogicalExpression(
  node: TSESTree.Node | undefined,
): node is TSESTree.LogicalExpression {
  return node !== undefined && node.type === 'LogicalExpression';
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

export function isVariableDeclaration(
  node: TSESTree.Node | undefined,
): node is TSESTree.VariableDeclaration {
  return node !== undefined && node.type === 'VariableDeclaration';
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
export function isLiteral(
  n: estree.Node | TSESTree.Node | null,
): n is estree.Literal | TSESTree.Literal {
  return n != null && n.type === 'Literal';
}

export function isNullLiteral(n: estree.Node): boolean {
  return isLiteral(n) && n.value === null;
}

export function isFalseLiteral(n: estree.Node): boolean {
  return isLiteral(n) && n.value === false;
}

export function isUndefined(node: Node): boolean {
  return node.type === 'Identifier' && node.name === 'undefined';
}

/**
 * Detect expression statements like the following:
 *  myArray[1] = 42;
 *  myArray[1] += 42;
 *  myObj.prop1 = 3;
 *  myObj.prop1 += 3;
 */
export function isElementWrite(
  statement: estree.ExpressionStatement,
  ref: Scope.Reference,
  recursive = true,
): boolean {
  if (statement.expression.type === 'AssignmentExpression') {
    const assignmentExpression = statement.expression;
    const lhs = assignmentExpression.left;
    return isMemberExpressionReference(lhs, ref, recursive);
  }
  return false;
}

function isMemberExpressionReference(
  lhs: estree.Node,
  ref: Scope.Reference,
  recursive = true,
): boolean {
  return (
    lhs.type === 'MemberExpression' &&
    (isReferenceTo(ref, lhs.object) ||
      (recursive && isMemberExpressionReference(lhs.object, ref, recursive)))
  );
}

export function isReferenceTo(ref: Scope.Reference, node: estree.Node) {
  return node.type === 'Identifier' && node === ref.identifier;
}

export function getUniqueWriteUsage(context: Rule.RuleContext, name: string, node: estree.Node) {
  const variable = getVariableFromName(context, name, node);
  return getUniqueWriteReference(variable);
}

export function getUniqueWriteReference(
  variable: Scope.Variable | undefined,
): estree.Node | undefined {
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
  recursive = false,
): estree.Node {
  if (node.type === 'Identifier') {
    const usage = getUniqueWriteUsage(context, node.name, node);
    if (usage) {
      return recursive ? getUniqueWriteUsageOrNode(context, usage, recursive) : usage;
    } else {
      return node;
    }
  } else {
    return node;
  }
}

export function getValueOfExpression<T extends estree.Node['type']>(
  context: Rule.RuleContext,
  expr: estree.Node | undefined | null,
  type: T,
  recursive = false,
): Extract<estree.Node, { type: T }> | undefined {
  if (!expr) {
    return undefined;
  }
  if (isNodeType(expr, type)) {
    return expr;
  }
  if (expr.type === 'Identifier') {
    const usage = getUniqueWriteUsage(context, expr.name, expr);
    if (usage) {
      if (isNodeType(usage, type)) {
        return usage;
      }
      if (recursive) {
        return getValueOfExpression(context, usage, type, true);
      }
    }
  }

  return undefined;
}

// see https://stackoverflow.com/questions/64262105/narrowing-return-value-of-function-based-on-argument
function isNodeType<T extends Node['type']>(
  node: Node,
  type: T,
): node is Extract<Node, { type: T }> {
  return node.type === type;
}

/**
 * for `x = 42` or `let x = 42` when visiting '42' returns 'x' variable
 */
export function getLhsVariable(
  context: Rule.RuleContext,
  node: estree.Node,
): Scope.Variable | undefined {
  const ancestors = context.sourceCode.getAncestors(node);
  const parent = ancestors[ancestors.length - 1];
  let formIdentifier: estree.Identifier | undefined;
  if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    formIdentifier = parent.id;
  } else if (parent.type === 'AssignmentExpression' && parent.left.type === 'Identifier') {
    formIdentifier = parent.left;
  }
  if (formIdentifier) {
    return getVariableFromName(context, formIdentifier.name, node);
  }

  return undefined;
}

export function getVariableFromScope(scope: Scope.Scope | null, name: string) {
  let variable;
  while (variable == null && scope != null) {
    variable = scope.variables.find(value => value.name === name);
    scope = scope.upper;
  }
  return variable;
}

export function getVariableFromName(context: Rule.RuleContext, name: string, node: estree.Node) {
  const scope: Scope.Scope | null = context.sourceCode.getScope(node);
  return getVariableFromScope(scope, name);
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

export function getPropertyWithValue(
  context: Rule.RuleContext,
  objectExpression: estree.ObjectExpression,
  propertyName: string,
  propertyValue: estree.Literal['value'],
): estree.Property | undefined {
  const maybeProperty = getProperty(objectExpression, propertyName, context);
  if (maybeProperty) {
    const maybePropertyValue = getValueOfExpression(context, maybeProperty.value, 'Literal');
    if (maybePropertyValue?.value === propertyValue) {
      return maybeProperty;
    }
  }
  return undefined;
}

function getPropertyFromSpreadElement(
  spreadElement: estree.SpreadElement,
  key: string,
  ctx: Rule.RuleContext,
): estree.Property | null | undefined {
  const props = getValueOfExpression(ctx, spreadElement.argument, 'ObjectExpression');
  const recursiveDefinition = findFirstMatchingAncestor(
    spreadElement.argument as TSESTree.Node,
    node => node === props,
  );
  if (recursiveDefinition || props === undefined) {
    return undefined;
  }
  return getProperty(props, key, ctx);
}

/**
 * Retrieves the property with the specified key from the given node.
 * @returns The property if found, or null if not found, or undefined if property not found and one of the properties
 * is an unresolved SpreadElement.
 */
export function getProperty(
  expr: estree.Node | undefined | null,
  key: string,
  ctx: Rule.RuleContext,
): estree.Property | null | undefined {
  if (expr?.type !== 'ObjectExpression') {
    return null;
  }
  let unresolvedSpreadElement = false;
  for (let i = expr.properties.length - 1; i >= 0; --i) {
    const property = expr.properties[i];
    if (isProperty(property, key)) {
      return property;
    }
    if (property.type === 'SpreadElement') {
      const prop = getPropertyFromSpreadElement(property, key, ctx);
      if (prop === undefined) {
        unresolvedSpreadElement = true;
      } else if (prop !== null) {
        return prop;
      }
    }
  }
  if (unresolvedSpreadElement) {
    return undefined;
  }
  return null;

  function isProperty(node: estree.Node, key: string): node is estree.Property {
    return (
      node.type === 'Property' &&
      (isIdentifier(node.key, key) || (isStringLiteral(node.key) && node.key.value === key))
    );
  }
}

export function resolveFromFunctionReference(
  context: Rule.RuleContext,
  functionIdentifier: estree.Identifier,
) {
  const { scopeManager } = context.sourceCode;
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
    report(
      context,
      {
        node: callExpression.callee,
        message,
      },
      [toSecondaryLocation(unsafeProperty)],
    );
  }
}

export function isStringLiteral(node: estree.Node | TSESTree.Node): node is StringLiteral {
  return isLiteral(node) && typeof node.value === 'string';
}

export function isBooleanLiteral(node: estree.Node): node is estree.Literal & { value: boolean } {
  return isLiteral(node) && typeof node.value === 'boolean';
}

export function isNumberLiteral(node: estree.Node): node is estree.Literal & { value: number } {
  return isLiteral(node) && typeof node.value === 'number';
}

export function isRegexLiteral(node: estree.Node): node is estree.RegExpLiteral {
  return node.type === 'Literal' && node.value instanceof RegExp;
}

/**
 * Checks if the node is of the form: foo.bar
 *
 * @param node
 * @returns
 */
export function isDotNotation(
  node: estree.Node,
): node is estree.MemberExpression & { property: estree.Identifier } {
  return node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier';
}

/**
 * Checks if the node is of the form: foo["bar"]
 *
 * @param node
 * @returns
 */
export function isIndexNotation(
  node: estree.Node,
): node is estree.MemberExpression & { property: StringLiteral } {
  return node.type === 'MemberExpression' && node.computed && isStringLiteral(node.property);
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

// Test for raw expressions like: String.raw`c:\foo\bar.txt` that corresponds to 'c:\\foo\\bar.txt'
export function isSimpleRawString(node: estree.Node): node is estree.TaggedTemplateExpression {
  return (
    node.type === 'TaggedTemplateExpression' &&
    isDotNotation(node.tag) &&
    isIdentifier(node.tag.object, 'String') &&
    isIdentifier(node.tag.property, 'raw') &&
    isStaticTemplateLiteral(node.quasi)
  );
}

// In simple raw strings, the literal value is: node.quasi.quasis[0].value.raw
// This function fails if isSimpleRawString() is not returning true for the node.
export function getSimpleRawStringValue(node: estree.TaggedTemplateExpression) {
  return node.quasi.quasis[0].value.raw;
}

export function isThisExpression(node: estree.Node): node is estree.ThisExpression {
  return node.type === 'ThisExpression';
}

export function isProperty(node: estree.Node): node is estree.Property {
  return node.type === 'Property';
}

/**
 * Check if an identifier has no known value, meaning:
 *
 * - It's not imported/required
 * - Defined variable without any write references (function parameter?)
 * - Non-defined variable (a possible global?)
 *
 * @param node Node to check
 * @param ctx Rule context
 */
export function isUnresolved(node: estree.Node | undefined | null, ctx: Rule.RuleContext): boolean {
  if (!node || getFullyQualifiedName(ctx, node) || isUndefined(node)) {
    return false;
  }
  let nodeToCheck: estree.Node = node;
  while (nodeToCheck.type === 'MemberExpression') {
    nodeToCheck = nodeToCheck.object;
  }

  if (nodeToCheck.type === 'Identifier') {
    const variable = getVariableFromName(ctx, nodeToCheck.name, node);
    const writeReferences = variable?.references.filter(reference => reference.isWrite());
    if (!variable || !writeReferences?.length) {
      return true;
    }
  }
  return false;
}
