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
 *   property and inspects its declarations. When no named property matches,
 *   the access goes through an index signature and the signature's own
 *   declaration is used instead (falling back to the declaration of the
 *   indexed type itself for signatures the checker synthesizes, such as
 *   `Record<K, V>`).
 * - Any other composite constructor (TSIntersectionType, TSArrayType,
 *   TSTypeLiteral, TSConditionalType, ...) -> internal at the top level. We
 *   do not recurse; callers can if they need to.
 *
 * A member is external only when ALL of the declarations found for it live in
 * files that satisfy `isSourceFileFromExternalLibrary` or
 * `isSourceFileDefaultLibrary`. Any local declaration (declaration-merging
 * escape hatch) makes the member internal, and so does a member whose
 * declarations cannot be resolved at all — being reportable is the safe
 * default, since callers use this to decide whether a fix is applicable.
 *
 * Known limitations:
 * - Alias chains are not followed. If the user re-aliases an external type
 *   locally (e.g. `type Inner = ReactNode`), the local alias is internal
 *   because the user has a place to edit.
 * - An indexed access with a non-literal index (`Ext[Key]`) is internal: the
 *   property cannot be pinned down syntactically.
 * - A property inherited from an external base is external even though the
 *   local type could redeclare it, because the declaration the user would
 *   have to change is the external one.
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
  let declarations: readonly ts.Declaration[] | undefined;
  if (member.type === 'TSTypeReference' && ts.isTypeReferenceNode(tsNode)) {
    declarations = declarationsOfSymbol(checker.getSymbolAtLocation(tsNode.typeName), checker);
  } else if (member.type === 'TSIndexedAccessType' && ts.isIndexedAccessTypeNode(tsNode)) {
    declarations = indexedAccessDeclarations(tsNode, checker);
  } else {
    return false;
  }
  if (!declarations?.length) {
    return false;
  }
  const program = services.program;
  return declarations.every(decl => {
    const sourceFile = decl.getSourceFile();
    return (
      program.isSourceFileFromExternalLibrary(sourceFile) ||
      program.isSourceFileDefaultLibrary(sourceFile)
    );
  });
}

function declarationsOfSymbol(
  symbol: ts.Symbol | undefined,
  checker: ts.TypeChecker,
): readonly ts.Declaration[] | undefined {
  // Imported names resolve to a local alias symbol pointing at the import
  // statement; without following the alias, external imports would look local.
  if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
    symbol = checker.getAliasedSymbol(symbol);
  }
  return symbol?.declarations;
}

function indexedAccessDeclarations(
  node: ts.IndexedAccessTypeNode,
  checker: ts.TypeChecker,
): readonly ts.Declaration[] | undefined {
  if (!ts.isLiteralTypeNode(node.indexType)) {
    return undefined;
  }
  const { literal } = node.indexType;
  if (!ts.isStringLiteral(literal) && !ts.isNumericLiteral(literal)) {
    return undefined;
  }
  const objectType = checker.getTypeAtLocation(node.objectType);
  const property = checker.getPropertyOfType(objectType, literal.text);
  if (property) {
    return declarationsOfSymbol(property, checker);
  }
  return indexSignatureDeclarations(objectType, literal, checker);
}

/**
 * Declarations backing an access that resolves through an index signature
 * rather than a named property, e.g. `ExternalRecord['anyKey']`. A numeric
 * literal can also hit a string signature, hence the two lookups.
 *
 * Mapped types (`Record<K, V>` and friends) have an index signature the
 * checker synthesizes, with no declaration node to attribute. There we fall
 * back to whatever declares the indexed type itself, which is the file the
 * user would have to edit anyway.
 */
function indexSignatureDeclarations(
  objectType: ts.Type,
  literal: ts.StringLiteral | ts.NumericLiteral,
  checker: ts.TypeChecker,
): readonly ts.Declaration[] | undefined {
  const kinds = ts.isNumericLiteral(literal)
    ? [ts.IndexKind.Number, ts.IndexKind.String]
    : [ts.IndexKind.String];
  for (const kind of kinds) {
    const indexInfo = checker.getIndexInfoOfType(objectType, kind);
    if (indexInfo) {
      return indexInfo.declaration
        ? [indexInfo.declaration]
        : (objectType.aliasSymbol ?? objectType.getSymbol())?.declarations;
    }
  }
  return undefined;
}
