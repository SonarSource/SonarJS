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

// Do not share the compiler's function objects. A hook only gets frozen boolean queries.
function predicate<Input, Output extends Input>(test: (value: Input) => value is Output) {
  return Object.freeze((value: Input): value is Output => test(value));
}

/** Classifies objects already available through typed ESLint parser services. */
export const hookTypeScriptSyntax = Object.freeze({
  isAsExpression: predicate(ts.isAsExpression),
  isAwaitExpression: predicate(ts.isAwaitExpression),
  isBindingElement: predicate(ts.isBindingElement),
  isCallExpression: predicate(ts.isCallExpression),
  isCallSignatureDeclaration: predicate(ts.isCallSignatureDeclaration),
  isClassDeclaration: predicate(ts.isClassDeclaration),
  isClassExpression: predicate(ts.isClassExpression),
  isConditionalExpression: predicate(ts.isConditionalExpression),
  isConstructorDeclaration: predicate(ts.isConstructorDeclaration),
  isConstructSignatureDeclaration: predicate(ts.isConstructSignatureDeclaration),
  isElementAccessExpression: predicate(ts.isElementAccessExpression),
  isExportDeclaration: predicate(ts.isExportDeclaration),
  isExternalModuleReference: predicate(ts.isExternalModuleReference),
  isFunctionDeclaration: predicate(ts.isFunctionDeclaration),
  isFunctionTypeNode: predicate(ts.isFunctionTypeNode),
  isIdentifier: predicate(ts.isIdentifier),
  isImportDeclaration: predicate(ts.isImportDeclaration),
  isImportEqualsDeclaration: predicate(ts.isImportEqualsDeclaration),
  isInterfaceDeclaration: predicate(ts.isInterfaceDeclaration),
  isMethodDeclaration: predicate(ts.isMethodDeclaration),
  isMethodSignature: predicate(ts.isMethodSignature),
  isModuleDeclaration: predicate(ts.isModuleDeclaration),
  isNewExpression: predicate(ts.isNewExpression),
  isNonNullExpression: predicate(ts.isNonNullExpression),
  isNumericLiteral: predicate(ts.isNumericLiteral),
  isParenthesizedExpression: predicate(ts.isParenthesizedExpression),
  isPrivateIdentifier: predicate(ts.isPrivateIdentifier),
  isPropertyAccessExpression: predicate(ts.isPropertyAccessExpression),
  isPropertyDeclaration: predicate(ts.isPropertyDeclaration),
  isPropertySignature: predicate(ts.isPropertySignature),
  isSourceFile: predicate(ts.isSourceFile),
  isStringLiteral: predicate(ts.isStringLiteral),
  isStringLiteralLike: predicate(ts.isStringLiteralLike),
  isTaggedTemplateExpression: predicate(ts.isTaggedTemplateExpression),
  isTypeAliasDeclaration: predicate(ts.isTypeAliasDeclaration),
  isTypeAssertionExpression: predicate(ts.isTypeAssertionExpression),
  isVariableDeclaration: predicate(ts.isVariableDeclaration),
  isImportKeyword: Object.freeze((node: ts.Node) => node.kind === ts.SyntaxKind.ImportKeyword),
  hasStaticModifier: Object.freeze(
    (node: ts.Node) =>
      ts.canHaveModifiers(node) &&
      (ts.getModifiers(node)?.some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword) ??
        false),
  ),
  isBroadType: Object.freeze(
    (type: ts.Type) =>
      (type.flags &
        (ts.TypeFlags.Any |
          ts.TypeFlags.Unknown |
          ts.TypeFlags.Never |
          ts.TypeFlags.NonPrimitive)) !==
      0,
  ),
  isTypeParameter: Object.freeze((type: ts.Type) => type.isTypeParameter()),
  isAliasSymbol: Object.freeze((symbol: ts.Symbol) => (symbol.flags & ts.SymbolFlags.Alias) !== 0),
  isFunctionSymbol: Object.freeze(
    (symbol: ts.Symbol) => (symbol.flags & ts.SymbolFlags.Function) !== 0,
  ),
});
