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
// Pinned tsc-ts source details stay private to this provider.
export * from 'tsc-ts-source/packages/tsc-ts/src/library/index.ts';
import * as api from 'tsc-ts-source/packages/tsc-ts/src/library/index.ts';
import * as nav from 'tsc-ts-source/packages/tsc-ts/src/compiler/astnav.ts';
import { diagnosticOf } from 'tsc-ts-source/packages/tsc-ts/src/library/diagnostics.ts';
import { CheckFlags } from 'tsc-ts-source/packages/tsc-ts/src/compiler/symbol.ts';
import * as members from 'tsc-ts-source/packages/tsc-ts/src/compiler/checker-members.ts';
import * as services from 'tsc-ts-source/packages/tsc-ts/src/compiler/checker-services.ts';
import * as symbols from 'tsc-ts-source/packages/tsc-ts/src/compiler/checker-symbols.ts';
import * as symbolTypes from 'tsc-ts-source/packages/tsc-ts/src/compiler/checker-symbol-types.ts';
import * as declared from 'tsc-ts-source/packages/tsc-ts/src/compiler/checker-declared-types.ts';
import * as iteration from 'tsc-ts-source/packages/tsc-ts/src/compiler/checker-iteration.ts';
import * as contextual from 'tsc-ts-source/packages/tsc-ts/src/compiler/checker-contextual.ts';
import * as operators from 'tsc-ts-source/packages/tsc-ts/src/compiler/checker-type-operators.ts';
import * as builder from 'tsc-ts-source/packages/tsc-ts/src/compiler/node-builder.ts';
import { scanTokens } from 'tsc-ts-source/packages/tsc-ts/src/compiler/astnav.ts';
export { CheckFlags, diagnosticOf };
export const getFirstToken = nav.getFirstToken;
export const getLastToken = nav.getLastToken;

export function nativeChildren(node) {
  if (node.kind <= api.SyntaxKind.LastToken) return [];
  const file = api.getSourceFileOfNode(node);
  const children = nav
    .getVisitedChildren(node, file)
    .filter(child => child.kind !== api.SyntaxKind.JSDoc);
  const result = [];
  let position = node.pos;
  for (const child of children) {
    if (child.pos > position)
      result.push(
        ...scanTokens(node, position, child.pos, file).filter(token => token.end <= child.pos),
      );
    result.push(child);
    position = Math.max(position, child.end);
  }
  if (position < node.end)
    result.push(
      ...scanTokens(node, position, node.end, file).filter(token => token.end <= node.end),
    );
  return result;
}
export const getJSDocTags = node => api.getJSDoc(node).flatMap(doc => doc.tags?.nodes ?? []);
export const getTextOfJSDocComment = comment =>
  typeof comment === 'string' ? comment : comment?.nodes?.map(node => node.text ?? '').join('');

// Supplement the public query API with pinned compiler operations, without a second checker.
export function completeChecker(checker) {
  const c = checker.c;
  const result = Object.create(checker);
  for (const [module, names] of [
    [members, ['getApparentType', 'getBaseConstraintOfType', 'getTypeOfPropertyOfType']],
    [symbolTypes, ['getNonMissingTypeOfSymbol', 'getWidenedType']],
    [services, ['getExportSpecifierLocalTargetSymbol', 'getImmediateAliasedSymbol']],
    [symbols, ['getFullyQualifiedName']],
    [declared, ['getDefaultFromTypeParameter']],
    [operators, ['getModifiersTypeFromMappedType']],
    [iteration, ['getAwaitedType']],
    [contextual, ['getContextualTypeForArgumentAtIndex']],
    [builder, ['typeToTypeNode', 'signatureToSignatureDeclaration']],
  ])
    for (const name of names) result[name] = (...args) => module[name](c, ...args);
  Object.assign(result, {
    getIndexInfoOfType: (type, kind) =>
      members.getIndexInfoOfType(c, type, kind === 0 ? c.stringType : c.numberType),
    getIndexTypeOfType: (type, kind) =>
      members.getIndexTypeOfType(c, type, kind === 0 ? c.stringType : c.numberType),
    getExportsOfModule: symbol => services.getExportsOfModuleAsArray(c, symbol),
    getExportSymbolOfSymbol: symbol => symbol.getExportSymbol(),
    getMemberInModuleExports: (symbol, name) =>
      services.tryGetMemberInModuleExports(c, name, symbol),
    getUndefinedType: () => c.undefinedType,
    getNullType: () => c.nullType,
    getVoidType: () => c.voidType,
    getESSymbolType: () => c.esSymbolType,
    getNonPrimitiveType: () => c.nonPrimitiveType,
    isArgumentsSymbol: symbol => symbol === c.argumentsSymbol,
    isUndefinedSymbol: symbol => symbol === c.undefinedSymbol,
    isUnknownSymbol: symbol => symbol === c.unknownSymbol,
    getJsDocTags: symbol =>
      symbol.declarations.flatMap(node =>
        getJSDocTags(node).map(tag => ({
          name: tag.tagName.text,
          text: getTextOfJSDocComment(tag.comment),
        })),
      ),
    getDocumentationComment: () => '',
  });
  return result;
}
