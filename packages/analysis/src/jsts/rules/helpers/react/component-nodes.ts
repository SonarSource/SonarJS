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
import type estree from 'estree';

const COMPONENT_NODE_TYPES = new Set([
  'ClassDeclaration',
  'ClassExpression',
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

export type ComponentNode =
  | estree.ClassDeclaration
  | estree.ClassExpression
  | estree.FunctionDeclaration
  | estree.FunctionExpression
  | estree.ArrowFunctionExpression;

export type ClassComponentNode = estree.ClassDeclaration | estree.ClassExpression;

export type FunctionComponentNode =
  | estree.FunctionDeclaration
  | estree.FunctionExpression
  | estree.ArrowFunctionExpression;

export function isComponentNode(node: estree.Node): node is ComponentNode {
  return COMPONENT_NODE_TYPES.has(node.type);
}

export function isClassComponentNode(node: estree.Node): node is ClassComponentNode {
  return node.type === 'ClassDeclaration' || node.type === 'ClassExpression';
}

export function isFunctionComponentNode(node: estree.Node): node is FunctionComponentNode {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
}
