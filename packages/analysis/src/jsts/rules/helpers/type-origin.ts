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
import ts from 'typescript';
import type { TSESTree } from '@typescript-eslint/utils';
import type { RequiredParserServices } from './parser-services.js';

export type TypeOrigin = {
  internal: TSESTree.TypeNode[];
  external: TSESTree.TypeNode[];
};

/**
 * Partitions the syntactic members of a type annotation into "internal"
 * (user-writable in this project) and "external" (declared in node_modules
 * or in the TypeScript default lib).
 *
 * Operates on the syntactic AST node, not on a resolved `ts.Type`. Returning
 * the original AST nodes lets callers produce locations, suggestions, or
 * fixes targeting exactly what the user wrote.
 *
 * Classification rules per top-level member:
 * - Keyword / literal types -> internal (the user wrote them directly).
 * - TSTypeReference -> resolves the type name to a symbol and inspects its
 *   declarations.
 * - TSIndexedAccessType with a literal property name -> resolves the accessed
 *   property symbol and inspects its declarations.
 *   Both forms are external only when ALL declarations live in files that
 *   satisfy `isSourceFileFromExternalLibrary` or `isSourceFileDefaultLibrary`.
 *   Any local declaration (declaration-merging escape hatch) makes the member
 *   internal.
 * - Any other composite constructor (TSIntersectionType, TSArrayType,
 *   TSTypeLiteral, TSConditionalType, ...) -> internal at the top level. We
 *   do not recurse; callers can if they need to.
 *
 * Known limitation: alias chains are not followed. If the user re-aliases an
 * external type locally (e.g. `type Inner = ReactNode`), the local alias is
 * internal because the user has a place to edit.
 */
export function classifyTypesByOrigin(
  typeNode: TSESTree.TypeNode,
  services: RequiredParserServices,
): TypeOrigin {
  const members = typeNode.type === 'TSUnionType' ? typeNode.types : [typeNode];
  const result: TypeOrigin = { internal: [], external: [] };
  for (const member of members) {
    if (isExternalMember(member, services)) {
      result.external.push(member);
    } else {
      result.internal.push(member);
    }
  }
  return result;
}

function isExternalMember(member: TSESTree.TypeNode, services: RequiredParserServices): boolean {
  const checker = services.program.getTypeChecker();
  const tsNode = services.esTreeNodeToTSNodeMap.get(member);
  let symbol: ts.Symbol | undefined;
  if (member.type === 'TSTypeReference' && ts.isTypeReferenceNode(tsNode)) {
    symbol = checker.getSymbolAtLocation(tsNode.typeName);
  } else if (member.type === 'TSIndexedAccessType' && ts.isIndexedAccessTypeNode(tsNode)) {
    symbol = getIndexedPropertySymbol(tsNode, checker);
  } else {
    return false;
  }
  // Imported names resolve to a local alias symbol pointing at the import
  // statement; without following the alias, external imports would look local.
  if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
    symbol = checker.getAliasedSymbol(symbol);
  }
  if (!symbol?.declarations?.length) {
    return false;
  }
  const program = services.program;
  return symbol.declarations.every(decl => {
    const sourceFile = decl.getSourceFile();
    return (
      program.isSourceFileFromExternalLibrary(sourceFile) ||
      program.isSourceFileDefaultLibrary(sourceFile)
    );
  });
}

function getIndexedPropertySymbol(
  node: ts.IndexedAccessTypeNode,
  checker: ts.TypeChecker,
): ts.Symbol | undefined {
  if (!ts.isLiteralTypeNode(node.indexType)) {
    return undefined;
  }
  const { literal } = node.indexType;
  if (!ts.isStringLiteral(literal) && !ts.isNumericLiteral(literal)) {
    return undefined;
  }
  const objectType = checker.getTypeAtLocation(node.objectType);
  return checker.getPropertyOfType(objectType, literal.text);
}
