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
import type { TSESTree } from '@typescript-eslint/utils';

export function getJsxShortCircuitNodes(logicalExpression: TSESTree.LogicalExpression) {
  if (logicalExpression.parent?.type !== 'JSXExpressionContainer') {
    return null;
  } else {
    return flattenJsxShortCircuitNodes(logicalExpression, logicalExpression);
  }
}

function flattenJsxShortCircuitNodes(
  root: TSESTree.LogicalExpression,
  node: TSESTree.Node,
): TSESTree.LogicalExpression[] | null {
  if (
    node.type === 'ConditionalExpression' ||
    (node.type === 'LogicalExpression' && node.operator !== root.operator)
  ) {
    return null;
  } else if (node.type !== 'LogicalExpression') {
    return [];
  } else {
    const leftNodes = flattenJsxShortCircuitNodes(root, node.left);
    const rightNodes = flattenJsxShortCircuitNodes(root, node.right);
    if (leftNodes == null || rightNodes == null) {
      return null;
    }
    return [...leftNodes, node, ...rightNodes];
  }
}
