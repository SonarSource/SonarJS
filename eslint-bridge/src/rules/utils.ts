/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import { AST, Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { EncodedMessage } from 'eslint-plugin-sonarjs/lib/utils/locations';
import { IssueLocation } from '../analyzer';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { RequiredParserServices } from '../utils/isRequiredParserServices';
import * as tsTypes from 'typescript';
import { isLiteral } from 'eslint-plugin-sonarjs/lib/utils/nodes';

export const functionLike = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'MethodDefinition',
]);

export const sortLike = ['sort', '"sort"', "'sort'"];

export type FunctionNodeType =
  | estree.FunctionDeclaration
  | estree.FunctionExpression
  | estree.ArrowFunctionExpression;

export type LoopLike =
  | estree.WhileStatement
  | estree.DoWhileStatement
  | estree.ForStatement
  | estree.ForOfStatement
  | estree.ForInStatement;

export const FUNCTION_NODES = [
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
];

/**
 * Returns the module name, when an identifier either represents a namespace for that module,
 * or is an alias for the default exported value.
 *
 * Returns undefined otherwise.
 * example: Given `import * as X from 'module_name'`, `getModuleNameOfIdentifier(X)`
 * returns `module_name`.
 */
export function getModuleNameOfIdentifier(
  context: Rule.RuleContext,
  identifier: estree.Identifier,
): estree.Literal | undefined {
  const { name } = identifier;
  // check if importing using `import * as X from 'module_name'`
  const importDeclaration = getImportDeclarations(context).find(
    importDecl => isNamespaceSpecifier(importDecl, name) || isDefaultSpecifier(importDecl, name),
  );
  if (importDeclaration) {
    return importDeclaration.source;
  }
  // check if importing using `const X = require('module_name')`
  const writeExpression = getUniqueWriteUsage(context, name);
  if (writeExpression) {
    return getModuleNameFromRequire(writeExpression);
  }
  return undefined;
}

/**
 * Returns the module name of either a directly `require`d or referenced module in
 * the following cases:
 *
 *  1. If `node` is a `require('m')` call;
 *  2. If `node` is an identifier `i` bound by an import, as in `import i from 'm'`;
 *  3. If `node` is an identifier `i`, and there is a single assignment with a `require`
 *     on the right hand side, i.e. `var i = require('m')`;
 *
 * then, in all three cases, the returned value will be the name of the module `'m'`.
 *
 * @param node the expression that is expected to evaluate to a module
 * @param context the rule context
 * @return literal with the name of the module or `undefined`.
 */
export function getModuleNameOfNode(
  context: Rule.RuleContext,
  node: estree.Node,
): estree.Literal | undefined {
  if (node.type === 'Identifier') {
    return getModuleNameOfIdentifier(context, node);
  } else {
    return getModuleNameFromRequire(node);
  }
}

/**
 * Returns the module name, when an identifier represents a binding imported from another module.
 * Returns undefined otherwise.
 * example: Given `import { f } from 'module_name'`, `getModuleNameOfImportedIdentifier(f)` returns `module_name`
 */
export function getModuleNameOfImportedIdentifier(
  context: Rule.RuleContext,
  identifier: estree.Identifier,
) {
  // check if importing using `import { f } from 'module_name'`
  const importedDeclaration = getImportDeclarations(context).find(({ specifiers }) =>
    specifiers.some(
      spec => spec.type === 'ImportSpecifier' && spec.imported.name === identifier.name,
    ),
  );
  if (importedDeclaration) {
    return importedDeclaration.source;
  }
  // check if importing using `const f = require('module_name').f`
  const writeExpression = getUniqueWriteUsage(context, identifier.name);
  if (
    writeExpression &&
    writeExpression.type === 'MemberExpression' &&
    isIdentifier(writeExpression.property, identifier.name)
  ) {
    return getModuleNameFromRequire(writeExpression.object);
  }

  return undefined;
}

export function getImportDeclarations(context: Rule.RuleContext) {
  const program = context.getAncestors().find(node => node.type === 'Program') as estree.Program;
  if (program.sourceType === 'module') {
    return program.body.filter(
      node => node.type === 'ImportDeclaration',
    ) as estree.ImportDeclaration[];
  }
  return [];
}

export function getRequireCalls(context: Rule.RuleContext) {
  const required: estree.CallExpression[] = [];
  const variables = context.getScope().variables;
  variables.forEach(variable =>
    variable.defs.forEach(def => {
      if (
        def.type === 'Variable' &&
        def.node.init?.type === 'CallExpression' &&
        def.node.init.callee.type === 'Identifier' &&
        def.node.init.callee.name === 'require' &&
        def.node.init.arguments.length === 1
      ) {
        required.push(def.node.init);
      }
    }),
  );
  return required;
}

function isNamespaceSpecifier(importDeclaration: estree.ImportDeclaration, name: string) {
  return importDeclaration.specifiers.some(
    ({ type, local }) => type === 'ImportNamespaceSpecifier' && local.name === name,
  );
}

function isDefaultSpecifier(importDeclaration: estree.ImportDeclaration, name: string) {
  return importDeclaration.specifiers.some(
    ({ type, local }) => type === 'ImportDefaultSpecifier' && local.name === name,
  );
}

export function getModuleNameFromRequire(node: estree.Node): estree.Literal | undefined {
  if (
    node.type === 'CallExpression' &&
    isIdentifier(node.callee, 'require') &&
    node.arguments.length === 1
  ) {
    const moduleName = node.arguments[0];
    if (moduleName.type === 'Literal') {
      return moduleName;
    }
  }
  return undefined;
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
  expr: estree.Node | undefined,
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
      return flatMap(n.elements, recHelper);
    } else {
      return [n];
    }
  }

  return flatMap(args, recHelper);
}

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

export function toEncodedMessage(
  message: string,
  secondaryLocationsHolder: Array<AST.Token | TSESTree.Node | estree.Node>,
  secondaryMessages?: string[],
  cost?: number,
): string {
  const encodedMessage: EncodedMessage = {
    message,
    cost,
    secondaryLocations: secondaryLocationsHolder.map((locationHolder, index) =>
      toSecondaryLocation(
        locationHolder,
        !!secondaryMessages ? secondaryMessages[index] : undefined,
      ),
    ),
  };
  return JSON.stringify(encodedMessage);
}

function toSecondaryLocation(
  locationHolder: AST.Token | TSESTree.Node | estree.Node,
  message?: string,
): IssueLocation {
  if (!locationHolder.loc) {
    throw new Error('Invalid secondary location');
  }
  return {
    message,
    column: locationHolder.loc.start.column,
    line: locationHolder.loc.start.line,
    endColumn: locationHolder.loc.end.column,
    endLine: locationHolder.loc.end.line,
  };
}

export function findFirstMatchingLocalAncestor(
  node: TSESTree.Node,
  predicate: (node: TSESTree.Node) => boolean,
) {
  return localAncestorsChain(node).find(predicate);
}

export function findFirstMatchingAncestor(
  node: TSESTree.Node,
  predicate: (node: TSESTree.Node) => boolean,
) {
  return ancestorsChain(node, new Set()).find(predicate);
}

export function localAncestorsChain(node: TSESTree.Node) {
  return ancestorsChain(node, functionLike);
}

export function ancestorsChain(node: TSESTree.Node, boundaryTypes: Set<string>) {
  const chain: TSESTree.Node[] = [];

  let currentNode = node.parent;
  while (currentNode) {
    chain.push(currentNode);
    if (boundaryTypes.has(currentNode.type)) {
      break;
    }
    currentNode = currentNode.parent;
  }
  return chain;
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

export function isArray(node: estree.Node, services: RequiredParserServices) {
  const type = getTypeFromTreeNode(node, services);
  return type.symbol && type.symbol.name === 'Array';
}

export function isString(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const typ = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
  return (typ.getFlags() & tsTypes.TypeFlags.StringLike) !== 0;
}

export function isFunction(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const type = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
  return type.symbol && (type.symbol.flags & tsTypes.SymbolFlags.Function) !== 0;
}

export function getTypeFromTreeNode(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  return checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
}

export function getTypeAsString(node: estree.Node, services: RequiredParserServices) {
  const { typeToString, getBaseTypeOfLiteralType } = services.program.getTypeChecker();
  return typeToString(getBaseTypeOfLiteralType(getTypeFromTreeNode(node, services)));
}

export function getSymbolAtLocation(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  return checker.getSymbolAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
}

export function getSignatureFromCallee(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  return checker.getResolvedSignature(
    services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node) as tsTypes.CallLikeExpression,
  );
}

export function isFunctionNode(node: estree.Node): node is FunctionNodeType {
  return FUNCTION_NODES.includes(node.type);
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
) {
  const unsafeProperty = getObjectExpressionProperty(objectExpression, propertyName);
  if (unsafeProperty) {
    const unsafePropertyValue = getValueOfExpression(context, unsafeProperty.value, 'Literal');
    if (unsafePropertyValue?.value === propertyValue) {
      return unsafeProperty;
    }
  }
  return undefined;
}

export function isCallToFQN(
  context: Rule.RuleContext,
  callExpression: estree.CallExpression,
  moduleName: string,
  functionName: string,
) {
  const { callee } = callExpression;
  if (callee.type !== 'MemberExpression') {
    return false;
  }
  const module = getModuleNameOfNode(context, callee.object);
  return module?.value === moduleName && isIdentifier(callee.property, functionName);
}

export function flatMap<A, B>(xs: A[], f: (e: A) => B[]): B[] {
  const acc: B[] = [];
  for (const x of xs) {
    acc.push(...f(x));
  }
  return acc;
}
