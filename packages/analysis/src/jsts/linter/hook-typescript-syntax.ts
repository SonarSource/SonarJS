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

// Use explicit names: TypeScript's reverse enum lookup can return aliases such as FirstLiteralToken.
const nodeKinds = [
  'AsExpression',
  'AwaitExpression',
  'BindingElement',
  'CallExpression',
  'CallSignature',
  'ClassDeclaration',
  'ClassExpression',
  'ConditionalExpression',
  'Constructor',
  'ConstructSignature',
  'ElementAccessExpression',
  'ExportDeclaration',
  'ExternalModuleReference',
  'FunctionDeclaration',
  'FunctionType',
  'Identifier',
  'ImportDeclaration',
  'ImportEqualsDeclaration',
  'ImportKeyword',
  'InterfaceDeclaration',
  'MethodDeclaration',
  'MethodSignature',
  'ModuleDeclaration',
  'NewExpression',
  'NoSubstitutionTemplateLiteral',
  'NonNullExpression',
  'NumericLiteral',
  'ParenthesizedExpression',
  'PrivateIdentifier',
  'PropertyAccessExpression',
  'PropertyDeclaration',
  'PropertySignature',
  'SourceFile',
  'StringLiteral',
  'TaggedTemplateExpression',
  'TypeAliasDeclaration',
  'TypeAssertionExpression',
  'VariableDeclaration',
] as const satisfies readonly (keyof Compiler['SyntaxKind'])[];

export type HookNodeKind = (typeof nodeKinds)[number];

// A newer host may advertise kind names unknown to this copy of the contract.
const supportedKinds: readonly string[] = Object.freeze(nodeKinds);

// Binding is lazy so the same definition can supply compatibility keys without a compiler.
function bindSyntax(getCompiler: () => Compiler) {
  let kinds: ReadonlyMap<ts.SyntaxKind, HookNodeKind> | undefined;
  return Object.freeze({
    supportedKinds,
    /** Returns a supported kind name for a node owned by the host compiler. */
    kindOf: Object.freeze((node: ts.Node): HookNodeKind | undefined => {
      kinds ??= new Map(nodeKinds.map(name => [getCompiler().SyntaxKind[name], name]));
      return kinds.get(node.kind);
    }),
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

const requiredHelpers = Object.entries(
  bindSyntax(() => {
    throw new Error('No compiler bound to the hook contract');
  }),
)
  .filter(([, helper]) => typeof helper === 'function')
  .map(([name]) => name);

/** By default the host must recognize every kind in the bundled contract. */
export function isHookTypeScriptSyntax(
  value: unknown,
  requiredKinds: readonly HookNodeKind[] = nodeKinds,
): value is ReturnType<typeof createHookTypeScriptSyntax> {
  if (typeof value !== 'object' || value === null) return false;
  const settings = value as Record<string, unknown>;
  const advertised = settings.supportedKinds;
  if (!Array.isArray(advertised)) return false;
  for (const name of advertised) {
    if (typeof name !== 'string') return false;
  }
  return (
    requiredKinds.every(name => advertised.includes(name)) &&
    requiredHelpers.every(name => typeof settings[name] === 'function')
  );
}
