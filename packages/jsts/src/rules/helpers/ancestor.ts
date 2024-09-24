/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { TSESTree } from '@typescript-eslint/utils';
import { Rule, SourceCode } from 'eslint';
import estree, { Node } from 'estree';
import { functionLike } from './ast.ts';

export function findFirstMatchingLocalAncestor(
  node: TSESTree.Node,
  predicate: (node: TSESTree.Node) => boolean,
) {
  return localAncestorsChain(node).find(predicate);
}

export function findFirstMatchingAncestor(
  node: TSESTree.Node,
  predicate: (node: TSESTree.Node) => boolean,
) {
  return ancestorsChain(node, new Set()).find(predicate);
}

export function localAncestorsChain(node: TSESTree.Node) {
  return ancestorsChain(node, functionLike);
}

export function ancestorsChain(node: TSESTree.Node, boundaryTypes: Set<string>) {
  const chain: TSESTree.Node[] = [];

  let currentNode = node.parent;
  while (currentNode) {
    chain.push(currentNode);
    if (boundaryTypes.has(currentNode.type)) {
      break;
    }
    currentNode = currentNode.parent;
  }
  return chain;
}

export function getParent(context: Rule.RuleContext, node: estree.Node) {
  const ancestors = context.sourceCode.getAncestors(node);
  return ancestors.length > 0 ? ancestors[ancestors.length - 1] : undefined;
}

/**
 * Returns the parent of an ESLint node
 *
 * This function assumes that an ESLint node exposes a parent property,
 * which is always defined. However, it's better to use `getParent` if
 * it is possible to retrieve the parent based on the rule context.
 *
 * It should eventually disappear once we come up with a proper solution
 * against the conflicting typings between ESLint and TypeScript ESLint
 * when it comes to the parent of a node.
 *
 * @param node an ESLint node
 * @returns the parent node
 */
export function getNodeParent(node: Node) {
  return (node as TSESTree.Node).parent as Node;
}

/**
 * Returns the direct children of a node
 * @param node the node to get the children
 * @param visitorKeys the visitor keys provided by the source code
 * @returns the node children
 */
export function childrenOf(node: estree.Node, visitorKeys: SourceCode.VisitorKeys): estree.Node[] {
  const keys = visitorKeys[node.type];
  const children = [];
  if (keys) {
    for (const key of keys) {
      /**
       * A node's child may be a node or an array of nodes, e.g., `body` in `estree.Program`.
       * If it's an array, we extract all the nodes from it; if not, we just add the node.
       */
      const child = (node as any)[key];
      if (Array.isArray(child)) {
        children.push(...child);
      } else {
        children.push(child);
      }
    }
  }
  return children.filter(Boolean);
}
