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

/**
 * Given a reported AST node (e.g., a prop name inside an interface/propTypes),
 * returns the React component node that owns it.
 *
 * Uses three strategies:
 *   A. Walk ancestors for a direct component ancestor.
 *   B. Walk ancestors for a `Foo.propTypes = {...}` assignment; resolve Foo's declaration.
 *   C. Use the TypeScript type checker to match the props interface to its owning
 *      class or function component (identified by PascalCase convention).
 *      Falls back to the full file AST if unavailable or no match found.
 */
export function findReactComponentNode(node: estree.Node, context: Rule.RuleContext): estree.Node {
  const ancestors = context.sourceCode.getAncestors(node as any) as estree.Node[];

  // Strategy A: direct component ancestor
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (COMPONENT_NODE_TYPES.has(ancestors[i].type)) return ancestors[i];
  }

  // Strategy B: Foo.propTypes = {...} assignment ancestor
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const anc = ancestors[i];
    if (anc.type !== 'AssignmentExpression') continue;
    const { left } = anc as estree.AssignmentExpression;
    if (
      left.type === 'MemberExpression' &&
      isIdentifier((left as estree.MemberExpression).property, 'propTypes') &&
      (left as estree.MemberExpression).object.type === 'Identifier'
    ) {
      const name = ((left as estree.MemberExpression).object as estree.Identifier).name;
      const defNode = context.sourceCode.getScope(node as any).variables.find(v => v.name === name)
        ?.defs[0]?.node;
      if (defNode) return defNode as estree.Node;
    }
  }

  // Strategy C: TypeScript type checker — match the props interface to its owning component
  return (
    findOwnerByType(ancestors, context, context.sourceCode.visitorKeys) ?? context.sourceCode.ast
  );
}

function findOwnerByType(
  ancestors: estree.Node[],
  context: Rule.RuleContext,
  keys: SourceCode.VisitorKeys,
): estree.Node | undefined {
  const services = context.sourceCode.parserServices;
  if (!isRequiredParserServices(services)) return undefined;

  const typeDecl = [...ancestors].reverse().find(a => TS_TYPE_DECL_TYPES.has(a.type));
  if (!typeDecl) return undefined;

  const checker = services.program.getTypeChecker();
  const propsType = getTypeFromTreeNode(typeDecl, services);

  for (const componentNode of collectComponentNodes(context.sourceCode.ast, keys)) {
    const tsNode = services.esTreeNodeToTSNodeMap.get(
      componentNode as TSESTree.Node,
    ) as ts.Declaration;
    if (componentNode.type === 'ClassDeclaration' || componentNode.type === 'ClassExpression') {
      const cls = tsNode as ts.ClassLikeDeclaration;
      if (!cls.name) continue;
      const classSymbol = checker.getSymbolAtLocation(cls.name);
      if (!classSymbol) continue;
      const instanceType = checker.getDeclaredTypeOfSymbol(classSymbol);
      const propsSymbol = instanceType.getProperty('props');
      if (!propsSymbol) continue;
      // @ts-ignore — isTypeAssignableTo is a private TypeScript API
      if (checker.isTypeAssignableTo(propsType, checker.getTypeOfSymbol(propsSymbol)))
        return componentNode;
    } else {
      // Function component: skip non-PascalCase names to avoid matching helper functions
      // that happen to accept the same props type (React components use PascalCase by convention).
      const funcName = getFunctionName(componentNode);
      if (funcName !== undefined && !/^[A-Z]/.test(funcName)) continue;
      const tsFuncNode = tsNode as ts.SignatureDeclaration;
      const signature = checker.getSignatureFromDeclaration(tsFuncNode);
      const firstParam = signature?.parameters[0];
      if (firstParam) {
        // @ts-ignore — isTypeAssignableTo is a private TypeScript API
        if (checker.isTypeAssignableTo(propsType, checker.getTypeOfSymbol(firstParam)))
          return componentNode;
      }
    }
  }
  return undefined;
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
  if (COMPONENT_NODE_TYPES.has(root.type)) result.push(root);
  for (const child of childrenOf(root, keys)) {
    result.push(...collectComponentNodes(child, keys));
  }
  return result;
}
