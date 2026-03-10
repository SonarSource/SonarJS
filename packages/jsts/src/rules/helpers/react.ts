/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import type ts from 'typescript';
import { childrenOf } from './ancestor.js';
import { isIdentifier } from './ast.js';
import { isRequiredParserServices } from './parser-services.js';
import { getTypeFromTreeNode } from './type.js';

const COMPONENT_NODE_TYPES = new Set([
  'ClassDeclaration',
  'ClassExpression',
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);
const TS_TYPE_DECL_TYPES = new Set(['TSInterfaceDeclaration', 'TSTypeAliasDeclaration']);
type SourceCache = {
  componentNodes: estree.Node[] | undefined;
  ownerByTypeDecl: WeakMap<estree.Node, estree.Node | null>;
};
const perSourceCache = new WeakMap<SourceCode, SourceCache>();

function getSourceCache(sourceCode: SourceCode): SourceCache {
  let cache = perSourceCache.get(sourceCode);
  if (!cache) {
    cache = {
      componentNodes: undefined,
      ownerByTypeDecl: new WeakMap<estree.Node, estree.Node | null>(),
    };
    perSourceCache.set(sourceCode, cache);
  }
  return cache;
}

/**
 * Given a reported AST node (e.g., a prop name inside an interface/propTypes),
 * returns the React component node that owns it, or `undefined` if no owner can be identified.
 *
 * Uses three strategies:
 *   A. Walk ancestors for a direct component ancestor.
 *   B. Walk ancestors for a `Foo.propTypes = {...}` assignment; resolve Foo's declaration.
 *   C. Use the TypeScript type checker to match the props interface to its owning
 *      class or function component (identified by PascalCase convention).
 *
 * Returns `undefined` if all strategies fail — callers should pass the report through
 * without suppression rather than falling back to a file-wide scan.
 */
export function findComponentNode(
  node: estree.Node,
  context: Rule.RuleContext,
): estree.Node | undefined {
  const ancestors = context.sourceCode.getAncestors(node);

  // Strategy A: direct component ancestor
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (COMPONENT_NODE_TYPES.has(ancestors[i].type)) {
      return ancestors[i];
    }
  }

  // Strategy B: Foo.propTypes = {...} assignment ancestor
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const anc = ancestors[i];
    if (anc.type !== 'AssignmentExpression') {
      continue;
    }
    const { left } = anc;
    if (
      left.type === 'MemberExpression' &&
      isIdentifier(left.property, 'propTypes') &&
      left.object.type === 'Identifier'
    ) {
      const name = left.object.name;
      const defNode = context.sourceCode.getScope(node).variables.find(v => v.name === name)
        ?.defs[0]?.node;
      if (defNode) {
        return defNode as estree.Node;
      }
    }
  }

  // Strategy C: TypeScript type checker — match the props interface to its owning component
  return findOwnerByType(ancestors, context, context.sourceCode.visitorKeys);
}

function findOwnerByType(
  ancestors: estree.Node[],
  context: Rule.RuleContext,
  keys: SourceCode.VisitorKeys,
): estree.Node | undefined {
  const services = context.sourceCode.parserServices;
  if (!isRequiredParserServices(services)) {
    return undefined;
  }

  let typeDecl: estree.Node | undefined;
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (TS_TYPE_DECL_TYPES.has(ancestors[i].type)) {
      typeDecl = ancestors[i];
      break;
    }
  }
  if (!typeDecl) {
    return undefined;
  }

  const sourceCache = getSourceCache(context.sourceCode);
  const cachedOwner = sourceCache.ownerByTypeDecl.get(typeDecl);
  if (cachedOwner !== undefined) {
    return cachedOwner ?? undefined;
  }

  const checker = services.program.getTypeChecker();
  const propsType = getTypeFromTreeNode(typeDecl, services);
  const componentNodes =
    sourceCache.componentNodes ??
    (sourceCache.componentNodes = collectComponentNodes(context.sourceCode.ast, keys));

  for (const componentNode of componentNodes) {
    const tsNode = services.esTreeNodeToTSNodeMap.get(
      componentNode as TSESTree.Node,
    ) as ts.Declaration;
    if (componentNode.type === 'ClassDeclaration' || componentNode.type === 'ClassExpression') {
      if (matchesClassProps(tsNode as ts.ClassLikeDeclaration, checker, propsType)) {
        sourceCache.ownerByTypeDecl.set(typeDecl, componentNode);
        return componentNode;
      }
    } else if (
      matchesFunctionProps(componentNode, tsNode as ts.SignatureDeclaration, checker, propsType)
    ) {
      sourceCache.ownerByTypeDecl.set(typeDecl, componentNode);
      return componentNode;
    }
  }
  sourceCache.ownerByTypeDecl.set(typeDecl, null);
  return undefined;
}

function matchesClassProps(
  cls: ts.ClassLikeDeclaration,
  checker: ts.TypeChecker,
  propsType: ts.Type,
): boolean {
  if (!cls.name) {
    return false;
  }
  const classSymbol = checker.getSymbolAtLocation(cls.name);
  if (!classSymbol) {
    return false;
  }
  const instanceType = checker.getDeclaredTypeOfSymbol(classSymbol);
  const propsSymbol = instanceType.getProperty('props');
  if (!propsSymbol) {
    return false;
  }
  const componentPropsType = checker.getTypeOfSymbol(propsSymbol);
  // @ts-ignore — isTypeAssignableTo is a private TypeScript API
  return (
    checker.isTypeAssignableTo(propsType, componentPropsType) &&
    checker.isTypeAssignableTo(componentPropsType, propsType)
  );
}

function matchesFunctionProps(
  componentNode: estree.Node,
  tsFuncNode: ts.SignatureDeclaration,
  checker: ts.TypeChecker,
  propsType: ts.Type,
): boolean {
  // Skip non-PascalCase names to avoid matching helper functions
  // that happen to accept the same props type (React components use PascalCase by convention).
  const funcName = getFunctionName(componentNode);
  if (funcName !== undefined && !/^[A-Z]/.test(funcName)) {
    return false;
  }
  const signature = checker.getSignatureFromDeclaration(tsFuncNode);
  const firstParam = signature?.parameters[0];
  if (firstParam == null) {
    return false;
  }
  const componentParamType = checker.getTypeOfSymbol(firstParam);
  // @ts-ignore — isTypeAssignableTo is a private TypeScript API
  return (
    checker.isTypeAssignableTo(propsType, componentParamType) &&
    checker.isTypeAssignableTo(componentParamType, propsType)
  );
}

function getFunctionName(node: estree.Node): string | undefined {
  if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
    return (node as estree.Function as { id?: estree.Identifier }).id?.name;
  }
  if (node.type === 'ArrowFunctionExpression') {
    const parent = (node as TSESTree.ArrowFunctionExpression).parent;
    if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
      return parent.id.name;
    }
  }
  return undefined;
}

function collectComponentNodes(root: estree.Node, keys: SourceCode.VisitorKeys): estree.Node[] {
  const result: estree.Node[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) {
      continue;
    }
    if (COMPONENT_NODE_TYPES.has(node.type)) {
      result.push(node);
      continue; // don't recurse into component bodies — nested components are an antipattern
    }
    const children = childrenOf(node, keys);
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
    }
  }
  return result;
}
