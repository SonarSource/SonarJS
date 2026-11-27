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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import ts from 'typescript';
import {
  createHookTypeScriptSyntax,
  isHookTypeScriptSyntax,
  type HookNodeKind,
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

describe('TypeScript hook syntax', () => {
  // Every other node in each snippet is also a negative case.
  const nodeCases: [HookNodeKind, string, string[]][] = [
    ['AsExpression', 'const x = value as string;', ['value as string']],
    ['AwaitExpression', 'await load();', ['await load()']],
    ['BindingElement', 'const { key: name } = value;', ['key: name']],
    ['CallExpression', 'fn(); new Fn();', ['fn()']],
    ['CallSignature', 'interface Box { (): void; }', ['(): void;']],
    ['ClassDeclaration', 'class Box {} const x = class {};', ['class Box {}']],
    ['ClassExpression', 'class Box {} const x = class {};', ['class {}']],
    ['ConditionalExpression', 'const x = b ? y : z;', ['b ? y : z']],
    ['Constructor', 'class Box { constructor() {} }', ['constructor() {}']],
    ['ConstructSignature', 'interface Box { new (): Box; }', ['new (): Box;']],
    ['ElementAccessExpression', 'obj[0]; obj.key;', ['obj[0]']],
    ['ExportDeclaration', 'export { name } from "pkg";', ['export { name } from "pkg";']],
    ['ExternalModuleReference', 'import pkg = require("pkg");', ['require("pkg")']],
    ['FunctionDeclaration', 'function fn() {}', ['function fn() {}']],
    ['FunctionType', 'type Fn = () => void;', ['() => void']],
    ['Identifier', 'obj.#field; obj.field;', ['obj', 'obj', 'field']],
    [
      'ImportDeclaration',
      'import x from "pkg"; import y = require("pkg");',
      ['import x from "pkg";'],
    ],
    [
      'ImportEqualsDeclaration',
      'import x from "pkg"; import y = require("pkg");',
      ['import y = require("pkg");'],
    ],
    ['ImportKeyword', 'import x from "pkg"; import("pkg");', ['import']],
    ['InterfaceDeclaration', 'interface Box {}', ['interface Box {}']],
    ['MethodDeclaration', 'class Box { getValue() {} }', ['getValue() {}']],
    ['MethodSignature', 'interface Box { getValue(): string; }', ['getValue(): string;']],
    ['ModuleDeclaration', 'declare module "pkg" {}', ['declare module "pkg" {}']],
    ['NewExpression', 'fn(); new Fn();', ['new Fn()']],
    ['NoSubstitutionTemplateLiteral', '"pkg"; `pkg`; 1;', ['`pkg`']],
    ['NonNullExpression', 'const x = value!;', ['value!']],
    ['NumericLiteral', 'obj[0]; obj["1"];', ['0']],
    ['ParenthesizedExpression', 'fn((value));', ['(value)']],
    ['PrivateIdentifier', 'class Box { #field = 1; field = 2; }', ['#field']],
    ['PropertyAccessExpression', 'obj[0]; obj.key;', ['obj.key']],
    ['PropertyDeclaration', 'class Box { value = 1; }', ['value = 1;']],
    ['PropertySignature', 'interface Box { value: string; }', ['value: string;']],
    ['SourceFile', 'const x = 1;', ['const x = 1;']],
    ['StringLiteral', '"pkg"; `pkg`; 1;', ['"pkg"']],
    ['TaggedTemplateExpression', 'tag`text`; `text`;', ['tag`text`']],
    ['TypeAliasDeclaration', 'type Value = string;', ['type Value = string;']],
    ['TypeAssertionExpression', '<string>value; value as string;', ['<string>value']],
    ['VariableDeclaration', 'const x = 1;', ['x = 1']],
  ];

  for (const [kind, source, expected] of nodeCases) {
    it(`recognizes ${kind} without matching neighboring nodes`, () => {
      const sourceFile = ts.createSourceFile('hook.ts', source, ts.ScriptTarget.Latest, true);
      expect(
        nodesIn(sourceFile)
          .filter(node => syntax.kindOf(node) === kind)
          .map(node => node.getText(sourceFile)),
      ).toEqual(expected);
    });
  }

  it('returns undefined for kinds outside the hook contract', () => {
    const file = ts.createSourceFile('hook.ts', 'fn();', ts.ScriptTarget.Latest, true);
    expect(syntax.kindOf(file.statements[0])).toBeUndefined();
  });

  it('recognizes only static members', () => {
    const source =
      'class Box { field = 1; public method() {} static create() {} static count = 0; }';
    const file = ts.createSourceFile('hook.ts', source, ts.ScriptTarget.Latest, true);
    expect(
      nodesIn(file)
        .filter(syntax.hasStaticModifier)
        .map(node => node.getText(file)),
    ).toEqual(['static create() {}', 'static count = 0;']);
  });

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
    const { kindOf: _kindOf, ...oldSettings } = syntax;
    for (const value of [undefined, null, {}, oldSettings, { ...syntax, isBroadType: true }]) {
      expect(isHookTypeScriptSyntax(value)).toBe(false);
    }
  });
});
