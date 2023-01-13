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
import { TSESTree, TSESLint } from '@typescript-eslint/experimental-utils';
import { RequiredParserServices } from 'eslint-plugin-sonarjs/lib/utils/parser-services';

export type RuleContext = TSESLint.RuleContext<string, string[]>;

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
