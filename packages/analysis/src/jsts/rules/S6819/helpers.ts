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
import type { JSXAttribute, JSXOpeningElement } from 'estree-jsx';
import pkg from 'jsx-ast-utils-x';
import { findFirstMatchingAncestor } from '../helpers/ancestor.js';

const { getLiteralPropValue, getProp, getPropValue } = pkg;

type ArrayElement = NonNullable<TSESTree.ArrayExpression['elements'][number]>;

export function hasAccessibleNameAttribute(
  attributes: JSXOpeningElement['attributes'],
  name: 'aria-label' | 'aria-labelledby',
): boolean {
  const prop = getProp(attributes, name);
  if (!prop) {
    return false;
  }

  if (isNonEmptyStringAttribute(prop)) {
    return true;
  }

  // Dynamic expressions are unknown statically, but nullish values should not suppress.
  return getLiteralPropValue(prop) === null && getPropValue(prop) != null;
}

function isNonEmptyStringAttribute(prop: JSXAttribute): boolean {
  if (prop.value?.type === 'Literal') {
    return typeof prop.value.value === 'string' && prop.value.value.trim() !== '';
  }

  if (prop.value?.type === 'JSXExpressionContainer' && prop.value.expression.type === 'Literal') {
    return (
      typeof prop.value.expression.value === 'string' && prop.value.expression.value.trim() !== ''
    );
  }

  return false;
}

/**
 * Checks if the JSX element has a direct <title> child element with non-empty content.
 */
export function hasTitleChild(node: TSESTree.JSXOpeningElement): boolean {
  const parent = node.parent;
  if (parent?.type !== 'JSXElement') {
    return false;
  }
  return parent.children.some(
    child =>
      child.type === 'JSXElement' &&
      child.openingElement.name.type === 'JSXIdentifier' &&
      child.openingElement.name.name === 'title' &&
      child.children.some(
        c =>
          (c.type === 'JSXText' && c.value.trim() !== '') ||
          (c.type === 'JSXExpressionContainer' &&
            c.expression.type !== 'JSXEmptyExpression' &&
            !(c.expression.type === 'Literal' && !c.expression.value) &&
            !(c.expression.type === 'Identifier' && c.expression.name === 'undefined')),
      ),
  );
}

export function hasAnyProp(attributes: JSXOpeningElement['attributes'], names: string[]): boolean {
  return names.some(name => Boolean(getProp(attributes, name)));
}

/**
 * Checks if the element has a style prop containing backgroundImage.
 */
export function hasBackgroundImageStyle(attributes: JSXOpeningElement['attributes']): boolean {
  const styleProp = getProp(attributes, 'style');
  if (!styleProp) {
    return false;
  }
  const styleValue = getPropValue(styleProp);
  return Boolean(styleValue && typeof styleValue === 'object' && 'backgroundImage' in styleValue);
}

/**
 * Gets the element name from a JSX opening element.
 */
export function getElementName(node: TSESTree.JSXOpeningElement): string | null {
  if (node.name.type === 'JSXIdentifier') {
    return node.name.name.toLowerCase();
  }
  return null;
}

/**
 * Checks if the JSX element has children.
 */
export function hasChildren(node: TSESTree.JSXOpeningElement): boolean {
  const parent = node.parent;
  if (parent?.type === 'JSXElement') {
    return parent.children.length > 0;
  }
  return false;
}

export function hasAncestorWithRole(node: TSESTree.JSXOpeningElement, role: string): boolean {
  return (
    findFirstMatchingAncestor(
      node,
      ancestor => ancestor.type === 'JSXElement' && getJSXElementRole(ancestor) === role,
    ) !== undefined
  );
}

export function hasDescendantWithRoleBeforeBoundary(
  node: TSESTree.JSXOpeningElement,
  role: string,
  boundaryRole: string,
): boolean {
  return hasDescendantMatchingRole(
    node,
    descendantRole => descendantRole === role,
    descendantRole => descendantRole === boundaryRole,
  );
}

/**
 * Searches rendered JSX children for elements with one of the target roles.
 */
export function hasDescendantWithOneOfRoles(
  node: TSESTree.JSXOpeningElement,
  roles: Set<string>,
): boolean {
  return hasDescendantMatchingRole(node, role => roles.has(role));
}

function hasDescendantMatchingRole(
  node: TSESTree.JSXOpeningElement,
  predicate: (role: string) => boolean,
  isBoundary: (role: string) => boolean = () => false,
): boolean {
  const jsxElement = node.parent;
  if (jsxElement?.type !== 'JSXElement') {
    return false;
  }

  const root = jsxElement;
  const stack = [...renderedChildrenOf(root)];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    if (current.type === 'JSXElement' && current !== root && roleMatches(current, predicate)) {
      return true;
    }
    if (current.type === 'JSXElement' && current !== root && roleMatches(current, isBoundary)) {
      continue;
    }
    stack.push(...renderedChildrenOf(current));
  }
  return false;
}

function renderedChildrenOf(node: TSESTree.Node): TSESTree.Node[] {
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
    return node.children;
  }

  if (node.type === 'JSXExpressionContainer' && node.expression.type !== 'JSXEmptyExpression') {
    return renderedExpressionChildrenOf(node.expression);
  }

  return [];
}

function renderedExpressionChildrenOf(node: TSESTree.Node): TSESTree.Node[] {
  switch (node.type) {
    case 'JSXElement':
    case 'JSXFragment':
      return [node];
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
    case 'TSAsExpression':
    case 'TSTypeAssertion':
    case 'TSNonNullExpression':
      return [node.expression];
    default:
      return [];
  }
}

function isArrayElement(element: TSESTree.ArrayExpression['elements'][number]): element is ArrayElement {
  return element !== null;
}

function roleMatches(element: TSESTree.JSXElement, predicate: (role: string) => boolean): boolean {
  const role = getJSXElementRole(element);
  return role !== null && predicate(role);
}

/**
 * Gets the role attribute value from a JSXElement.
 */
export function getJSXElementRole(element: TSESTree.JSXElement): string | null {
  const openingElement = element.openingElement;
  const attributes = (openingElement as JSXOpeningElement).attributes;
  const roleProp = getProp(attributes, 'role');
  if (!roleProp) {
    return null;
  }
  const roleValue = getLiteralPropValue(roleProp);
  if (typeof roleValue !== 'string') {
    return null;
  }
  return roleValue.toLowerCase();
}
