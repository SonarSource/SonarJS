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

export function hasEnclosingAncestorWithRole(
  node: TSESTree.JSXOpeningElement,
  role: string,
): boolean {
  return hasEnclosingAncestorMatchingRole(node, ancestorRole => ancestorRole === role);
}

export function hasEnclosingAncestorWithOneOfRoles(
  node: TSESTree.JSXOpeningElement,
  roles: Set<string>,
): boolean {
  return hasEnclosingAncestorMatchingRole(node, role => roles.has(role));
}

/**
 * Walks up the enclosing JSX and reports whether an ancestor carries a matching role.
 *
 * Lexical nesting is deliberate, unlike the rendered-position descendant search below. The
 * two directions answer different questions. Downwards, a container claims to own its
 * children, and a wrong claim suppresses a report that was actionable. Upwards, a child role
 * asks whether a report is actionable at all, and the tags this rule suggests for those roles
 * are invalid outside their container: `<Widget renderOption={() => <div role="option"/>}/>`
 * inside a listbox is the standard virtualized-list shape, and "use <option> instead" is not
 * a fix anyone can apply there, so the JSX attribute holding it must not end the walk.
 */
function hasEnclosingAncestorMatchingRole(
  node: TSESTree.JSXOpeningElement,
  predicate: (role: string) => boolean,
): boolean {
  let current: TSESTree.Node | undefined = node.parent?.parent;
  while (current) {
    if (current.type === 'JSXElement' && roleMatches(current, predicate)) {
      return true;
    }
    current = current.parent;
  }

  return false;
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

  // Grows while iterating: every visited position appends its own rendered positions.
  const pending = renderedChildPositions(jsxElement);
  for (const current of pending) {
    if (current.type === 'JSXElement') {
      const role = getJSXElementRole(current);
      if (role !== null && predicate(role)) {
        return true;
      }
      if (role !== null && isBoundary(role)) {
        // A nested container owns everything below it, so stop descending here.
        continue;
      }
    }
    pending.push(...renderedChildPositions(current));
  }
  return false;
}

/**
 * Lists the direct child positions of `node` whose contents React renders.
 *
 * This is the single description of JSX rendering positions used by this rule. Only the
 * descendant search reads it: deciding that a container owns a child role is a claim about
 * structure, so it is made from positions React actually renders. The ancestor walk above
 * deliberately does not, see its comment.
 *
 * Accepted: `<A><B /></A>`, `{cond && <B />}`, `{cond ? <B /> : null}`, `{[<B />]}`,
 * `{items.map(i => <B />)}`, and `{items.flatMap(i => <B />)}`.
 * Rejected: JSX in attributes (render props), callbacks passed to methods that do not render
 * their return values, and bare `{() => <B />}` children.
 */
function renderedChildPositions(node: TSESTree.Node): TSESTree.Node[] {
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
    case 'TSAsExpression':
    case 'TSTypeAssertion':
    case 'TSNonNullExpression':
    case 'TSSatisfiesExpression':
      return [node.expression];
    case 'CallExpression':
      return isRenderingArrayMappingCall(node) ? node.arguments.filter(isInvokedFunction) : [];
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

function isInvokedFunction(
  node: TSESTree.Node,
): node is TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression {
  return node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression';
}

/**
 * Checks that the function is passed as an argument to a call that renders what it returns.
 *
 * Stated in full rather than relying on the `CallExpression` case to only ever hand over
 * mapping-call arguments, so extending that case cannot silently widen this one.
 */
function isArgumentOfRenderingCall(
  node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
): boolean {
  const parent = node.parent;
  return (
    parent?.type === 'CallExpression' &&
    parent.arguments.includes(node) &&
    isRenderingArrayMappingCall(parent)
  );
}

function isRenderingArrayMappingCall(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;
  if (
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    callee.property.type !== 'Identifier'
  ) {
    return false;
  }
  return callee.property.name === 'map' || callee.property.name === 'flatMap';
}

function roleMatches(element: TSESTree.JSXElement, predicate: (role: string) => boolean): boolean {
  const role = getJSXElementRole(element);
  return role !== null && predicate(role);
}

/**
 * Gets the literal role attribute value, or null when absent or not a literal string.
 */
export function getRole(node: TSESTree.JSXOpeningElement): string | null {
  const attributes = (node as JSXOpeningElement).attributes;
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

function getJSXElementRole(element: TSESTree.JSXElement): string | null {
  return getRole(element.openingElement);
}
