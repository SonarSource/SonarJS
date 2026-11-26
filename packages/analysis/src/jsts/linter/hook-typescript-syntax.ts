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
import type ts from 'typescript';

type Compiler = typeof ts;

// Binding is lazy so the same definition can supply compatibility keys without a compiler.
function bindSyntax(getCompiler: () => Compiler) {
  function predicate<Input, Output extends Input>(
    select: (compiler: Compiler) => (value: Input) => value is Output,
  ) {
    return Object.freeze((value: Input): value is Output => select(getCompiler())(value));
  }

  return Object.freeze({
    isAsExpression: predicate(ts => ts.isAsExpression),
    isAwaitExpression: predicate(ts => ts.isAwaitExpression),
    isBindingElement: predicate(ts => ts.isBindingElement),
    isCallExpression: predicate(ts => ts.isCallExpression),
    isCallSignatureDeclaration: predicate(ts => ts.isCallSignatureDeclaration),
    isClassDeclaration: predicate(ts => ts.isClassDeclaration),
    isClassExpression: predicate(ts => ts.isClassExpression),
    isConditionalExpression: Object.freeze(
      (node: ts.Node): node is ts.ConditionalExpression =>
        node.kind === getCompiler().SyntaxKind.ConditionalExpression,
    ),
    isConstructorDeclaration: predicate(ts => ts.isConstructorDeclaration),
    isConstructSignatureDeclaration: predicate(ts => ts.isConstructSignatureDeclaration),
    isElementAccessExpression: predicate(ts => ts.isElementAccessExpression),
    isExportDeclaration: predicate(ts => ts.isExportDeclaration),
    isExternalModuleReference: predicate(ts => ts.isExternalModuleReference),
    isFunctionDeclaration: predicate(ts => ts.isFunctionDeclaration),
    isFunctionTypeNode: predicate(ts => ts.isFunctionTypeNode),
    isIdentifier: predicate(ts => ts.isIdentifier),
    isImportDeclaration: predicate(ts => ts.isImportDeclaration),
    isImportEqualsDeclaration: predicate(ts => ts.isImportEqualsDeclaration),
    isInterfaceDeclaration: predicate(ts => ts.isInterfaceDeclaration),
    isMethodDeclaration: predicate(ts => ts.isMethodDeclaration),
    isMethodSignature: predicate(ts => ts.isMethodSignature),
    isModuleDeclaration: predicate(ts => ts.isModuleDeclaration),
    isNewExpression: predicate(ts => ts.isNewExpression),
    isNonNullExpression: Object.freeze(
      (node: ts.Node): node is ts.NonNullExpression =>
        node.kind === getCompiler().SyntaxKind.NonNullExpression,
    ),
    isNumericLiteral: predicate(ts => ts.isNumericLiteral),
    isParenthesizedExpression: predicate(ts => ts.isParenthesizedExpression),
    isPrivateIdentifier: predicate(ts => ts.isPrivateIdentifier),
    isPropertyAccessExpression: predicate(ts => ts.isPropertyAccessExpression),
    isPropertyDeclaration: predicate(ts => ts.isPropertyDeclaration),
    isPropertySignature: predicate(ts => ts.isPropertySignature),
    isSourceFile: predicate(ts => ts.isSourceFile),
    isStringLiteral: predicate(ts => ts.isStringLiteral),
    isStringLiteralLike: predicate(ts => ts.isStringLiteralLike),
    isTaggedTemplateExpression: predicate(ts => ts.isTaggedTemplateExpression),
    isTypeAliasDeclaration: predicate(ts => ts.isTypeAliasDeclaration),
    isTypeAssertionExpression: predicate(ts => ts.isTypeAssertionExpression),
    isVariableDeclaration: predicate(ts => ts.isVariableDeclaration),
    isImportKeyword: Object.freeze(
      (node: ts.Node) => node.kind === getCompiler().SyntaxKind.ImportKeyword,
    ),
    hasStaticModifier: Object.freeze((node: ts.Node) => {
      const ts = getCompiler();
      return (
        ts.canHaveModifiers(node) &&
        (ts.getModifiers(node)?.some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword) ??
          false)
      );
    }),
    isBroadType: Object.freeze((type: ts.Type) => {
      const { TypeFlags } = getCompiler();
      return (
        (type.flags &
          (TypeFlags.Any | TypeFlags.Unknown | TypeFlags.Never | TypeFlags.NonPrimitive)) !==
        0
      );
    }),
    isTypeParameter: Object.freeze((type: ts.Type) => type.isTypeParameter()),
    isAliasSymbol: Object.freeze(
      (symbol: ts.Symbol) => (symbol.flags & getCompiler().SymbolFlags.Alias) !== 0,
    ),
    isFunctionSymbol: Object.freeze(
      (symbol: ts.Symbol) => (symbol.flags & getCompiler().SymbolFlags.Function) !== 0,
    ),
  });
}

/** Classifies objects already available through typed ESLint parser services. */
export function createHookTypeScriptSyntax(compiler: Compiler) {
  return bindSyntax(() => compiler);
}

const requiredHelpers = Object.keys(
  bindSyntax(() => {
    throw new Error('No compiler bound to the hook contract');
  }),
);

export function isHookTypeScriptSyntax(
  value: unknown,
): value is ReturnType<typeof createHookTypeScriptSyntax> {
  return (
    typeof value === 'object' &&
    value !== null &&
    requiredHelpers.every(name => typeof (value as Record<string, unknown>)[name] === 'function')
  );
}
