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
import * as estree from 'estree';
import ts from 'typescript';
import {TSESTree} from '@typescript-eslint/experimental-utils';
import {RequiredParserServices} from 'eslint-plugin-sonarjs/lib/utils/parser-services';

export function isArray(node: estree.Node, services: RequiredParserServices) {
  const type = getTypeFromTreeNode(node, services);
  return type.symbol && type.symbol.name === 'Array';
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

export function isStringType(type: ts.Type) {
  return (type.flags & ts.TypeFlags.StringLike) > 0 || type.symbol?.name === 'String';
}

export function isFunction(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const type = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
  return type.symbol && (type.symbol.flags & ts.SymbolFlags.Function) !== 0;
}

export function isUndefinedOrNull(node: estree.Node, services: RequiredParserServices) {
  const checker = services.program.getTypeChecker();
  const typ = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
  return (
    (typ.getFlags() & ts.TypeFlags.Undefined) !== 0 || (typ.getFlags() & ts.TypeFlags.Null) !== 0
  );
}

export function isAny(type: ts.Type) {
  return type.flags === ts.TypeFlags.Any;
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

function isSameSymbol(s: ts.Type, t: ts.Type) {
  return s.symbol && t.symbol && s.symbol.name === t.symbol.name;
}

function isSubType(s: ts.Type, t: ts.Type): boolean {
  return (
    (s.flags & t.flags) !== 0 || (t.isUnionOrIntersection() && t.types.some(tp => isSubType(s, tp)))
  );
}

function isThis(node: estree.Node) {
  return node.type === 'ThisExpression';
}

export function haveDissimilarTypes(
  lhs: estree.Node,
  rhs: estree.Node,
  services: RequiredParserServices,
) {
  const { getBaseTypeOfLiteralType } = services.program.getTypeChecker();
  const lhsType = getBaseTypeOfLiteralType(getTypeFromTreeNode(lhs, services));
  const rhsType = getBaseTypeOfLiteralType(getTypeFromTreeNode(rhs, services));
  return (
    !isSameSymbol(lhsType, rhsType) &&
    !isSubType(lhsType, rhsType) &&
    !isSubType(rhsType, lhsType) &&
    !isAny(lhsType) &&
    !isAny(rhsType) &&
    !isUndefinedOrNull(lhs, services) &&
    !isUndefinedOrNull(rhs, services) &&
    !isThis(lhs) &&
    !isThis(rhs)
  );
}
