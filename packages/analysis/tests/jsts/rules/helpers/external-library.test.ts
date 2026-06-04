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
import path from 'node:path';
import type { SourceCode } from 'eslint';
import { parseForESLint } from '@typescript-eslint/parser';
import type { TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';
import type estree from 'estree';
import { RequiredParserServices } from '../../../../src/jsts/rules/helpers/parser-services.js';
import { classifyTypesByOrigin } from '../../../../src/jsts/rules/helpers/external-library.js';
import { createProgramFromSingleFile } from '../../../../src/jsts/program/factory.js';
import { childrenOf } from '../../../../src/jsts/rules/helpers/ancestor.js';
import { normalizePath } from '../../../../../shared/src/helpers/files.js';

const externalLibraryFixtureDir = normalizePath(
  path.join(import.meta.dirname, 'fixtures', 'external-library'),
);

type Parsed = {
  services: RequiredParserServices;
  ast: TSESTree.Program;
  visitorKeys: SourceCode.VisitorKeys;
};

function parse(sourceCode: string): Parsed {
  const fileName = `${externalLibraryFixtureDir}/test.ts`;
  const compilerOptions: ts.CompilerOptions = {
    lib: ['esnext', 'dom'],
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ESNext,
  };
  const program = createProgramFromSingleFile(fileName, sourceCode, compilerOptions);
  const parseResult = parseForESLint(sourceCode, {
    loc: true,
    range: true,
    tokens: true,
    comment: true,
    ecmaVersion: 2020,
    sourceType: 'module',
    programs: [program],
    filePath: fileName,
    ecmaFeatures: { jsx: true },
  });
  return {
    services: parseResult.services as RequiredParserServices,
    ast: parseResult.ast,
    visitorKeys: parseResult.visitorKeys as SourceCode.VisitorKeys,
  };
}

/**
 * Listener-style traversal: walks the tree using ESLint visitor keys (so
 * `parent` and other non-AST fields are skipped automatically) and dispatches
 * to a callback keyed by node type. Mirrors how rules subscribe to nodes.
 */
function on(
  root: TSESTree.Node,
  visitorKeys: SourceCode.VisitorKeys,
  listeners: { [type: string]: (node: TSESTree.Node) => void },
): void {
  const stack: TSESTree.Node[] = [root];
  while (stack.length) {
    const node = stack.pop()!;
    listeners[node.type]?.(node);
    const children = childrenOf(node as unknown as estree.Node, visitorKeys);
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i] as unknown as TSESTree.Node);
    }
  }
}

function findAliasType({ ast, visitorKeys }: Parsed, aliasName: string): TSESTree.TypeNode {
  let found: TSESTree.TypeNode | undefined;
  on(ast, visitorKeys, {
    TSTypeAliasDeclaration(node) {
      const decl = node as TSESTree.TSTypeAliasDeclaration;
      if (decl.id.type === 'Identifier' && decl.id.name === aliasName) {
        found = decl.typeAnnotation;
      }
    },
  });
  if (!found) throw new Error(`No type alias named '${aliasName}' found`);
  return found;
}

function findPropertyType(
  { ast, visitorKeys }: Parsed,
  interfaceName: string,
  propertyName: string,
): TSESTree.TypeNode {
  let found: TSESTree.TypeNode | undefined;
  let inTarget = false;
  on(ast, visitorKeys, {
    TSInterfaceDeclaration(node) {
      const decl = node as TSESTree.TSInterfaceDeclaration;
      inTarget = decl.id.type === 'Identifier' && decl.id.name === interfaceName;
    },
    TSPropertySignature(node) {
      if (!inTarget) return;
      const prop = node as TSESTree.TSPropertySignature;
      if (prop.key.type === 'Identifier' && prop.key.name === propertyName && prop.typeAnnotation) {
        found = prop.typeAnnotation.typeAnnotation;
      }
    },
  });
  if (!found) throw new Error(`No '${interfaceName}.${propertyName}' property found`);
  return found;
}

function collectTypeReferences(
  { ast, visitorKeys }: Parsed,
  typeName: string,
): TSESTree.TSTypeReference[] {
  const refs: TSESTree.TSTypeReference[] = [];
  on(ast, visitorKeys, {
    TSTypeReference(node) {
      const ref = node as TSESTree.TSTypeReference;
      if (ref.typeName.type === 'Identifier' && ref.typeName.name === typeName) {
        refs.push(ref);
      }
    },
  });
  return refs;
}

describe('classifyTypesByOrigin', () => {
  it('classifies a default lib type as external', () => {
    const parsed = parse(`
      type Subject = Date;
    `);
    const result = classifyTypesByOrigin(findAliasType(parsed, 'Subject'), parsed.services);
    expect(result.external).toHaveLength(1);
    expect(result.internal).toHaveLength(0);
  });

  it('classifies a node_modules type alias as external', () => {
    const parsed = parse(`
      import type { FakeExternalType } from 'fake-lib';
      type Subject = FakeExternalType;
    `);
    const result = classifyTypesByOrigin(findAliasType(parsed, 'Subject'), parsed.services);
    expect(result.external).toHaveLength(1);
    expect(result.internal).toHaveLength(0);
  });

  it('classifies a qualified name from node_modules as external', () => {
    const parsed = parse(`
      import type * as FakeLib from 'fake-lib';
      type Subject = FakeLib.FakeNamespace.Nested;
    `);
    const result = classifyTypesByOrigin(findAliasType(parsed, 'Subject'), parsed.services);
    expect(result.external).toHaveLength(1);
    expect(result.internal).toHaveLength(0);
  });

  it('classifies a locally declared alias as internal', () => {
    const parsed = parse(`
      type MaybeString = string | undefined;
      type Subject = MaybeString;
    `);
    const result = classifyTypesByOrigin(findAliasType(parsed, 'Subject'), parsed.services);
    expect(result.internal).toHaveLength(1);
    expect(result.external).toHaveLength(0);
  });

  it('classifies a declaration-merged type as internal (local merge wins)', () => {
    const parsed = parse(`
      declare global {
        interface Date {
          customMethod(): void;
        }
      }
      type Subject = Date;
      export {};
    `);
    const result = classifyTypesByOrigin(findAliasType(parsed, 'Subject'), parsed.services);
    expect(result.internal).toHaveLength(1);
    expect(result.external).toHaveLength(0);
  });

  it('classifies keyword types as internal', () => {
    const parsed = parse(`
      type Subject1 = string;
      type Subject2 = undefined;
      type Subject3 = number;
      type Subject4 = boolean;
      type Subject5 = void;
      type Subject6 = never;
    `);
    for (const name of ['Subject1', 'Subject2', 'Subject3', 'Subject4', 'Subject5', 'Subject6']) {
      const result = classifyTypesByOrigin(findAliasType(parsed, name), parsed.services);
      expect(result.internal).toHaveLength(1);
      expect(result.external).toHaveLength(0);
    }
  });

  it('classifies literal types as internal', () => {
    const parsed = parse(`
      type Subject1 = 'foo';
      type Subject2 = 42;
      type Subject3 = true;
    `);
    for (const name of ['Subject1', 'Subject2', 'Subject3']) {
      const result = classifyTypesByOrigin(findAliasType(parsed, name), parsed.services);
      expect(result.internal).toHaveLength(1);
      expect(result.external).toHaveLength(0);
    }
  });

  it('classifies composite top-level types as internal without recursing', () => {
    const parsed = parse(`
      type Local = { id: string };
      type Intersection = Local & Date;
      type Array = Date[];
      type Tuple = [Date, string];
      type Literal = { value: Date };
    `);
    for (const [name, expectedType] of [
      ['Intersection', 'TSIntersectionType'],
      ['Array', 'TSArrayType'],
      ['Tuple', 'TSTupleType'],
      ['Literal', 'TSTypeLiteral'],
    ] as const) {
      const node = findAliasType(parsed, name);
      const result = classifyTypesByOrigin(node, parsed.services);
      expect(result.internal).toHaveLength(1);
      expect(result.external).toHaveLength(0);
      expect(result.internal[0].type).toBe(expectedType);
    }
  });

  it('does not follow alias chains; callers can recurse one level at a time', () => {
    const parsed = parse(`
      import type { FakeExternalType } from 'fake-lib';
      type CustomType = number | FakeExternalType;
      type Subject = string | CustomType;
    `);

    const outer = classifyTypesByOrigin(findAliasType(parsed, 'Subject'), parsed.services);
    expect(outer.internal).toHaveLength(2);
    expect(outer.external).toHaveLength(0);
    expect(outer.internal.map(n => n.type)).toEqual(['TSStringKeyword', 'TSTypeReference']);

    const inner = classifyTypesByOrigin(findAliasType(parsed, 'CustomType'), parsed.services);
    expect(inner.internal).toHaveLength(1);
    expect(inner.external).toHaveLength(1);
    expect(inner.internal[0].type).toBe('TSNumberKeyword');
    expect(inner.external[0].type).toBe('TSTypeReference');
  });

  it('classifies an interface property type the same way as a type alias', () => {
    const parsed = parse(`
      import type { FakeExternalType } from 'fake-lib';
      type CustomType = number | FakeExternalType;
      interface T {
        a: string | CustomType;
      }
    `);

    const outer = classifyTypesByOrigin(findPropertyType(parsed, 'T', 'a'), parsed.services);
    expect(outer.internal).toHaveLength(2);
    expect(outer.external).toHaveLength(0);
    expect(outer.internal.map(n => n.type)).toEqual(['TSStringKeyword', 'TSTypeReference']);

    const inner = classifyTypesByOrigin(findAliasType(parsed, 'CustomType'), parsed.services);
    expect(inner.internal).toHaveLength(1);
    expect(inner.external).toHaveLength(1);
    expect(inner.internal[0].type).toBe('TSNumberKeyword');
    expect(inner.external[0].type).toBe('TSTypeReference');
  });

  it('partitions a union by member origin', () => {
    const parsed = parse(`
      import type { FakeExternalType } from 'fake-lib';
      type LocalAlias = string;
      type Subject = FakeExternalType | LocalAlias | Date | number;
    `);
    const result = classifyTypesByOrigin(findAliasType(parsed, 'Subject'), parsed.services);
    expect(result.external).toHaveLength(2);
    expect(result.internal).toHaveLength(2);
  });

  it('works across syntactic contexts (variable, parameter, return, property)', () => {
    const parsed = parse(`
      import type { FakeExternalType } from 'fake-lib';
      const value: FakeExternalType = undefined as any;
      function withParam(p: FakeExternalType): void {}
      function withReturn(): FakeExternalType { return undefined as any; }
      interface Holder { field: FakeExternalType }
    `);

    const refs = collectTypeReferences(parsed, 'FakeExternalType');
    expect(refs).toHaveLength(4);
    for (const ref of refs) {
      const result = classifyTypesByOrigin(ref, parsed.services);
      expect(result.external).toHaveLength(1);
      expect(result.internal).toHaveLength(0);
    }
  });
});
