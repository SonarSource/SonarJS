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
import * as estree from 'estree';
import ts from 'typescript';
import { TSESLint, TSESTree } from '@typescript-eslint/experimental-utils';
import { RequiredParserServices } from 'eslint-plugin-sonarjs/lib/utils/parser-services';
import { getVariableFromScope } from './ast';
import { Rule } from 'eslint';

export type RuleContext = TSESLint.RuleContext<string, string[]>;

export function isArray(node: estree.Node, services: RequiredParserServices) {
  const type = getTypeFromTreeNode(node, services);
  return type.symbol?.name === 'Array';
}

/**
 * TypeScript provides a set of utility types to facilitate type transformations.
 * @see https://www.typescriptlang.org/docs/handbook/utility-types.html
 */
export const UTILITY_TYPES = new Set([
  'Awaited',
  'Partial',
  'Required',
  'Readonly',
  'Record',
  'Pick',
  'Omit',
  'Exclude',
  'Extract',
  'NonNullable',
  'Parameters',
  'ConstructorParameters',
  'ReturnType',
  'InstanceType',
  'ThisParameterType',
  'OmitThisParameter',
  'ThisType',
  'Uppercase',
  'Lowercase',
  'Capitalize',
  'Uncapitalize',
]);

/**
 * JavaScript typed arrays
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Typed_arrays
 */
export const TYPED_ARRAY_TYPES = [
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',
];

/**
 * Checks if the provided node is a JS typed array like "BigInt64Array". See TYPED_ARRAY_TYPES
 *
 * @param node
 * @param services
 * @returns
 */
export function isTypedArray(node: estree.Node, services: RequiredParserServices) {
  const type = getTypeFromTreeNode(node, services);
  return TYPED_ARRAY_TYPES.includes(type.symbol?.name);
}

export function isString(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const typ = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
  return (typ.getFlags() & ts.TypeFlags.StringLike) !== 0;
}

export function isNumber(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const typ = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
  return (typ.getFlags() & ts.TypeFlags.NumberLike) !== 0;
}

export function isBigIntType(type: ts.Type) {
  return (type.getFlags() & ts.TypeFlags.BigIntLike) !== 0;
}

export function isNumberType(type: ts.Type) {
  return (type.getFlags() & ts.TypeFlags.NumberLike) !== 0;
}

export function isStringType(type: ts.Type) {
  return (type.flags & ts.TypeFlags.StringLike) > 0 || type.symbol?.name === 'String';
}

export function isFunction(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const type = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
  return type.symbol && (type.symbol.flags & ts.SymbolFlags.Function) !== 0;
}

export function isUnion(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const type = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
  return type.isUnion();
}

/**
 * Returns an array of the union types if the provided type is a union.
 * Otherwise, returns an array containing the provided type as its unique element.
 * @param type A TypeScript type.
 * @return An array of types. It's never empty.
 */
export function getUnionTypes(type: ts.Type): ts.Type[] {
  return type.isUnion() ? type.types : [type];
}

export function isUndefinedOrNull(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const typ = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
  return (
    (typ.getFlags() & ts.TypeFlags.Undefined) !== 0 || (typ.getFlags() & ts.TypeFlags.Null) !== 0
  );
}

export function isThenable(node: estree.Node, services: RequiredParserServices) {
  const mapped = services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node);
  const tp = services.program.getTypeChecker().getTypeAtLocation(mapped);
  const thenProperty = tp.getProperty('then');
  return Boolean(thenProperty && thenProperty.flags & ts.SymbolFlags.Method);
}

export function isAny(type: ts.Type) {
  return type.flags === ts.TypeFlags.Any;
}

/**
 * Checks if a node has a generic type like:
 *
 * function foo<T> (bar: T) {
 *    bar // is generic
 * }
 *
 * @param node TSESTree.Node
 * @param services RuleContext.parserServices
 * @returns
 */
export function isGenericType(node: TSESTree.Node, services: RequiredParserServices) {
  const type = getTypeFromTreeNode(node as estree.Node, services);
  return type.isTypeParameter();
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
    services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node) as ts.CallLikeExpression,
  );
}

/**
 * This function checks if a type may correspond to an array type. Beyond simple array types, it will also
 * consider the union of array types and generic types extending an array type.
 * @param type A type to check
 * @param services The services used to get access to the TypeScript type checker
 */
export function isArrayLikeType(type: ts.Type, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const constrained = checker.getBaseConstraintOfType(type);
  return isArrayOrUnionOfArrayType(constrained ?? type, services);
}

function isArrayOrUnionOfArrayType(type: ts.Type, services: RequiredParserServices): boolean {
  for (const part of getUnionTypes(type)) {
    if (!isArrayType(part, services)) {
      return false;
    }
  }

  return true;
}

/**
 * Test if the provided type is an array of strings.
 * @param type A TypeScript type.
 * @param services The services used to get access to the TypeScript type checker
 */
export function isStringArray(type: ts.Type, services: RequiredParserServices) {
  return isArrayElementTypeMatching(type, services, isStringType);
}

/**
 * Test if the provided type is an array of numbers.
 * @param type A TypeScript type.
 * @param services The services used to get access to the TypeScript type checker
 */
export function isNumberArray(type: ts.Type, services: RequiredParserServices) {
  return isArrayElementTypeMatching(type, services, isNumberType);
}

/**
 * Test if the provided type is an array of big integers.
 * @param type A TypeScript type.
 * @param services The services used to get access to the TypeScript type checker
 */
export function isBigIntArray(type: ts.Type, services: RequiredParserServices) {
  return isArrayElementTypeMatching(type, services, isBigIntType);
}

function isArrayElementTypeMatching(
  type: ts.Type,
  services: RequiredParserServices,
  predicate: (type: ts.Type) => boolean,
) {
  const checker = services.program.getTypeChecker();
  if (!isArrayType(type, services)) {
    return false;
  }
  const [elementType] = checker.getTypeArguments(type);
  return elementType && predicate(elementType);
}

// Internal TS API
function isArrayType(type: ts.Type, services: RequiredParserServices): type is ts.TypeReference {
  const checker = services.program.getTypeChecker();
  return (
    'isArrayType' in checker &&
    typeof checker.isArrayType === 'function' &&
    checker.isArrayType(type)
  );
}

/**
 * Checks whether a TypeScript type node denotes a type alias.
 * @param node a type node to check
 * @param context the rule context
 */
export function isTypeAlias(node: TSESTree.TypeNode, context: Rule.RuleContext) {
  if (
    node.type !== 'TSTypeReference' ||
    node.typeName.type !== 'Identifier' ||
    node.typeParameters
  ) {
    return false;
  }
  const scope = context.getScope();
  const variable = getVariableFromScope(scope, node.typeName.name);
  return variable?.defs.some(def => def.node.type === 'TSTypeAliasDeclaration');
}
