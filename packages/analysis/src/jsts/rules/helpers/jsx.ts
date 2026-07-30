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
import type { TSESTree } from '@typescript-eslint/utils';
import { unwrapTypeScriptExpression } from './ast.js';

type ArrayElement = NonNullable<TSESTree.ArrayExpression['elements'][number]>;

export function getJsxShortCircuitNodes(logicalExpression: TSESTree.LogicalExpression) {
  if (logicalExpression.parent?.type === 'JSXExpressionContainer') {
    return flattenJsxShortCircuitNodes(logicalExpression, logicalExpression);
  } else {
    return null;
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
  } else if (node.type === 'LogicalExpression') {
    const leftNodes = flattenJsxShortCircuitNodes(root, node.left);
    const rightNodes = flattenJsxShortCircuitNodes(root, node.right);
    if (leftNodes == null || rightNodes == null) {
      return null;
    }
    return [...leftNodes, node, ...rightNodes];
  } else {
    return [];
  }
}

export function someRenderedJsxDescendant(
  element: TSESTree.JSXElement,
  predicate: (element: TSESTree.JSXElement) => boolean,
  shouldPrune: (element: TSESTree.JSXElement) => boolean = () => false,
): boolean {
  // Grows while iterating: every visited position appends its own rendered positions.
  const pending = renderedChildPositions(element);
  for (const current of pending) {
    if (current.type === 'JSXElement') {
      if (predicate(current)) {
        return true;
      }
      if (shouldPrune(current)) {
        continue;
      }
    }
    pending.push(...renderedChildPositions(current));
  }
  return false;
}

function renderedChildPositions(node: TSESTree.Node): TSESTree.Node[] {
  const unwrapped = unwrapTypeScriptExpression(node);
  if (unwrapped !== node) {
    return [unwrapped];
  }

  switch (node.type) {
    case 'JSXElement':
    case 'JSXFragment':
      return [...node.children];
    case 'JSXExpressionContainer':
      return node.expression.type === 'JSXEmptyExpression' ? [] : [node.expression];
    case 'ConditionalExpression':
      return [node.consequent, node.alternate];
    case 'LogicalExpression':
      if (node.operator === '&&') {
        return [node.right];
      }
      if (node.operator === '||' || node.operator === '??') {
        return [node.left, node.right];
      }
      return [];
    case 'ArrayExpression':
      return node.elements.filter(isArrayElement);
    case 'ChainExpression':
      return [node.expression];
    case 'CallExpression':
      return isRenderingArrayMappingCall(node) ? node.arguments.filter(isRenderingCallback) : [];
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
      // Only a function that something invokes renders; a bare `{() => <B />}` does not.
      return isArgumentOfRenderingCall(node) ? [node.body] : [];
    case 'BlockStatement':
      return [...node.body];
    case 'ReturnStatement':
      return node.argument === null ? [] : [node.argument];
    case 'IfStatement':
      return node.alternate === null ? [node.consequent] : [node.consequent, node.alternate];
    default:
      return [];
  }
}

function isArrayElement(
  element: TSESTree.ArrayExpression['elements'][number],
): element is ArrayElement {
  return element !== null;
}

function isRenderingCallback(
  node: TSESTree.CallExpressionArgument,
): node is TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression {
  return node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
}

function isArgumentOfRenderingCall(
  node: TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression,
): boolean {
  const parent = node.parent;
  return (
    parent?.type === 'CallExpression' &&
    parent.arguments.includes(node) &&
    isRenderingArrayMappingCall(parent)
  );
}

function isRenderingArrayMappingCall(node: TSESTree.CallExpression): boolean {
  return (
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    (node.callee.property.name === 'map' || node.callee.property.name === 'flatMap')
  );
}
