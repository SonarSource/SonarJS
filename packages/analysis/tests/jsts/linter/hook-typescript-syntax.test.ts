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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { describe, it } from 'node:test';
import { expect } from 'expect';
import ts from 'typescript';
import {
  createHookTypeScriptSyntax,
  isHookTypeScriptSyntax,
} from '../../../src/jsts/linter/hook-typescript-syntax.js';

const syntax = createHookTypeScriptSyntax(ts);

function nodesIn(sourceFile: ts.SourceFile): ts.Node[] {
  const nodes: ts.Node[] = [];
  function visit(node: ts.Node) {
    nodes.push(node);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return nodes;
}

describe('TypeScript hook predicates', () => {
  // Match exactly the listed nodes, so every other node in each snippet is also a negative case.
  const nodeCases: [string, (node: ts.Node) => boolean, string, string[]][] = [
    ['as expression', syntax.isAsExpression, 'const x = value as string;', ['value as string']],
    ['await expression', syntax.isAwaitExpression, 'await load();', ['await load()']],
    ['binding element', syntax.isBindingElement, 'const { key: name } = value;', ['key: name']],
    ['call expression', syntax.isCallExpression, 'fn(); new Fn();', ['fn()']],
    [
      'call signature',
      syntax.isCallSignatureDeclaration,
      'interface Box { (): void; }',
      ['(): void;'],
    ],
    [
      'class declaration',
      syntax.isClassDeclaration,
      'class Box {} const x = class {};',
      ['class Box {}'],
    ],
    [
      'class expression',
      syntax.isClassExpression,
      'class Box {} const x = class {};',
      ['class {}'],
    ],
    [
      'conditional expression',
      syntax.isConditionalExpression,
      'const x = b ? y : z;',
      ['b ? y : z'],
    ],
    [
      'constructor declaration',
      syntax.isConstructorDeclaration,
      'class Box { constructor() {} }',
      ['constructor() {}'],
    ],
    [
      'construct signature',
      syntax.isConstructSignatureDeclaration,
      'interface Box { new (): Box; }',
      ['new (): Box;'],
    ],
    ['element access', syntax.isElementAccessExpression, 'obj[0]; obj.key;', ['obj[0]']],
    [
      'export declaration',
      syntax.isExportDeclaration,
      'export { name } from "pkg";',
      ['export { name } from "pkg";'],
    ],
    [
      'external module reference',
      syntax.isExternalModuleReference,
      'import pkg = require("pkg");',
      ['require("pkg")'],
    ],
    [
      'function declaration',
      syntax.isFunctionDeclaration,
      'function fn() {}',
      ['function fn() {}'],
    ],
    ['function type', syntax.isFunctionTypeNode, 'type Fn = () => void;', ['() => void']],
    ['identifier', syntax.isIdentifier, 'obj.#field; obj.field;', ['obj', 'obj', 'field']],
    [
      'import declaration',
      syntax.isImportDeclaration,
      'import x from "pkg"; import y = require("pkg");',
      ['import x from "pkg";'],
    ],
    [
      'import-equals declaration',
      syntax.isImportEqualsDeclaration,
      'import x from "pkg"; import y = require("pkg");',
      ['import y = require("pkg");'],
    ],
    [
      'interface declaration',
      syntax.isInterfaceDeclaration,
      'interface Box {}',
      ['interface Box {}'],
    ],
    [
      'method declaration',
      syntax.isMethodDeclaration,
      'class Box { getValue() {} }',
      ['getValue() {}'],
    ],
    [
      'method signature',
      syntax.isMethodSignature,
      'interface Box { getValue(): string; }',
      ['getValue(): string;'],
    ],
    [
      'module declaration',
      syntax.isModuleDeclaration,
      'declare module "pkg" {}',
      ['declare module "pkg" {}'],
    ],
    ['new expression', syntax.isNewExpression, 'fn(); new Fn();', ['new Fn()']],
    ['non-null expression', syntax.isNonNullExpression, 'const x = value!;', ['value!']],
    ['numeric literal', syntax.isNumericLiteral, 'obj[0]; obj["1"];', ['0']],
    ['parenthesized expression', syntax.isParenthesizedExpression, 'fn((value));', ['(value)']],
    [
      'private identifier',
      syntax.isPrivateIdentifier,
      'class Box { #field = 1; field = 2; }',
      ['#field'],
    ],
    ['property access', syntax.isPropertyAccessExpression, 'obj[0]; obj.key;', ['obj.key']],
    [
      'property declaration',
      syntax.isPropertyDeclaration,
      'class Box { value = 1; }',
      ['value = 1;'],
    ],
    [
      'property signature',
      syntax.isPropertySignature,
      'interface Box { value: string; }',
      ['value: string;'],
    ],
    ['source file', syntax.isSourceFile, 'const x = 1;', ['const x = 1;']],
    ['string literal', syntax.isStringLiteral, '"pkg"; `pkg`; 1;', ['"pkg"']],
    [
      'string literal-like node',
      syntax.isStringLiteralLike,
      '"pkg"; `pkg`; 1;',
      ['"pkg"', '`pkg`'],
    ],
    ['tagged template', syntax.isTaggedTemplateExpression, 'tag`text`; `text`;', ['tag`text`']],
    ['type alias', syntax.isTypeAliasDeclaration, 'type Value = string;', ['type Value = string;']],
    [
      'angle-bracket assertion',
      syntax.isTypeAssertionExpression,
      '<string>value; value as string;',
      ['<string>value'],
    ],
    ['variable declaration', syntax.isVariableDeclaration, 'const x = 1;', ['x = 1']],
    [
      'dynamic import keyword',
      syntax.isImportKeyword,
      'import x from "pkg"; import("pkg");',
      ['import'],
    ],
    [
      'static members',
      syntax.hasStaticModifier,
      'class Box { field = 1; public method() {} static create() {} static count = 0; }',
      ['static create() {}', 'static count = 0;'],
    ],
  ];

  for (const [description, predicate, source, expected] of nodeCases) {
    it(`recognizes ${description} without matching neighboring nodes`, () => {
      const sourceFile = ts.createSourceFile('hook.ts', source, ts.ScriptTarget.Latest, true);
      expect(
        nodesIn(sourceFile)
          .filter(predicate)
          .map(node => node.getText(sourceFile)),
      ).toEqual(expected);
    });
  }

  const fileName = 'hook.ts';
  const sourceFile = ts.createSourceFile(
    fileName,
    `
    type BroadAny = any;
    type BroadUnknown = unknown;
    type BroadNever = never;
    type BroadObject = object;
    type ConcreteObject = { value: string };
    type ConcreteUnion = string | number;
    function identity<Type>(value: Type): Type { return value; }
    const callable = identity;
    export { identity as alias };
  `,
    ts.ScriptTarget.Latest,
    true,
  );
  const checker = ts
    .createProgram(
      [fileName],
      { noLib: true, types: [] },
      {
        ...ts.createCompilerHost({}),
        getSourceFile: name => (name === fileName ? sourceFile : undefined),
      },
    )
    .getTypeChecker();
  const nodes = nodesIn(sourceFile);

  it('distinguishes broad checker types from concrete objects and unions', () => {
    const broadTypes = nodes
      .filter(ts.isTypeAliasDeclaration)
      .filter(node => syntax.isBroadType(checker.getTypeAtLocation(node.type)))
      .map(node => node.name.text);
    expect(broadTypes).toEqual(['BroadAny', 'BroadUnknown', 'BroadNever', 'BroadObject']);
  });

  it('recognizes only the generic parameter as a type parameter', () => {
    const declarations = nodes.filter(
      node =>
        ts.isTypeParameterDeclaration(node) ||
        ts.isParameter(node) ||
        ts.isVariableDeclaration(node),
    );
    const typeParameters = declarations
      .filter(node => syntax.isTypeParameter(checker.getTypeAtLocation(node)))
      .map(node => node.name.getText());
    expect(typeParameters).toEqual(['Type', 'value']);
  });

  it('distinguishes function, alias and callable variable symbols', () => {
    const names = nodes
      .filter(
        node =>
          ts.isFunctionDeclaration(node) ||
          ts.isExportSpecifier(node) ||
          ts.isVariableDeclaration(node),
      )
      .map(node => node.name!);
    const classified = names.map(name => {
      const symbol = checker.getSymbolAtLocation(name);
      expect(symbol).toBeDefined();
      return [name.getText(), syntax.isAliasSymbol(symbol!), syntax.isFunctionSymbol(symbol!)];
    });
    expect(classified).toEqual([
      ['identity', false, true],
      ['callable', false, false],
      ['alias', true, false],
    ]);
  });

  it('rejects missing and incompatible hook settings from other hosts', () => {
    expect(isHookTypeScriptSyntax(syntax)).toBe(true);
    for (const value of [undefined, null, {}, { ...syntax, isBroadType: true }]) {
      expect(isHookTypeScriptSyntax(value)).toBe(false);
    }
  });
});
