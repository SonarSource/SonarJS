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
import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import type { JSXOpeningElement } from 'estree-jsx';
import pkg from 'jsx-ast-utils-x';
const { getProp, getLiteralPropValue, getPropValue } = pkg;
import { interceptReportForReact, generateMeta } from '../helpers/index.js';
import { isHtmlElement } from '../helpers/isHtmlElement.js';
import { findFirstMatchingAncestor } from '../helpers/ancestor.js';
import * as meta from './generated-meta.js';

// ARIA table container roles that indicate a custom table widget
const TABLE_CONTAINER_ROLES = new Set(['table', 'grid']);
// ARIA table child roles that must be inside a container role
const TABLE_CHILD_ROLES = new Set([
  'row',
  'rowgroup',
  'cell',
  'gridcell',
  'columnheader',
  'rowheader',
]);

/**
 * Decorates the prefer-tag-over-role rule to fix false positives.
 *
 * Suppresses reports for:
 * 1. Custom components (not standard HTML elements)
 * 2. Valid ARIA patterns where semantic equivalents would lose functionality:
 *    - SVG with role="presentation"/"img" and aria-hidden="true" (decorative icons)
 *    - role="status" with aria-live (live region pattern)
 *    - role="slider" with complete aria-value* attributes
 *    - role="radio" with aria-checked
 *    - role="separator" with children (since <hr> is void)
 *    - role="img" on div/span with children or CSS backgroundImage (since <img> is void)
 *    - ARIA table roles (table, grid, row, etc.) when forming complete custom widget patterns
 *
 * Note: SVG internal elements like <g> are not in HTML_TAG_NAMES, so they're
 * already filtered out by isHtmlElement. HTML elements with role="group" remain
 * as true positives since semantic alternatives exist.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if (!('node' in reportDescriptor)) {
        return;
      }
      const { node } = reportDescriptor as Rule.ReportDescriptor & {
        node: TSESTree.JSXOpeningElement;
      };

      // Wrap the opening element in a JSXElement structure for isHtmlElement
      const jsxElement = {
        type: 'JSXElement' as const,
        openingElement: node,
      } as TSESTree.JSXElement;

      if (!isHtmlElement(jsxElement)) {
        // Suppress for custom components (not standard HTML elements)
        return;
      }

      if (isValidAriaPattern(node)) {
        // Suppress for valid ARIA patterns
        return;
      }

      context.report(reportDescriptor);
    },
  );
}

/**
 * Checks if the element uses a valid ARIA pattern where suggesting a semantic
 * element would be inappropriate.
 */
function isValidAriaPattern(node: TSESTree.JSXOpeningElement): boolean {
  const attributes = (node as JSXOpeningElement).attributes;
  const roleProp = getProp(attributes, 'role');
  if (!roleProp) {
    return false;
  }

  const roleValue = getLiteralPropValue(roleProp);
  if (typeof roleValue !== 'string') {
    return false;
  }

  const role = roleValue.toLowerCase();
  const elementName = getElementName(node);

  return (
    isDecorativeSvg(elementName, role, attributes) ||
    isLiveRegionStatus(role, attributes) ||
    isCustomSlider(role, attributes) ||
    isCustomRadio(role, attributes) ||
    isSeparatorWithChildren(role, node) ||
    isImgRoleWithValidPattern(elementName, role, attributes, node) ||
    isCustomTableWidget(elementName, role, node)
  );
}

function isDecorativeSvg(
  elementName: string | null,
  role: string,
  attributes: JSXOpeningElement['attributes'],
): boolean {
  if (elementName !== 'svg' || (role !== 'presentation' && role !== 'img')) {
    return false;
  }
  const ariaHiddenProp = getProp(attributes, 'aria-hidden');
  if (!ariaHiddenProp) {
    return false;
  }
  const ariaHiddenValue = getLiteralPropValue(ariaHiddenProp);
  return ariaHiddenValue === true || ariaHiddenValue === 'true';
}

function isLiveRegionStatus(role: string, attributes: JSXOpeningElement['attributes']): boolean {
  return role === 'status' && Boolean(getProp(attributes, 'aria-live'));
}

function isCustomSlider(role: string, attributes: JSXOpeningElement['attributes']): boolean {
  return (
    role === 'slider' &&
    Boolean(getProp(attributes, 'aria-valuemin')) &&
    Boolean(getProp(attributes, 'aria-valuemax')) &&
    Boolean(getProp(attributes, 'aria-valuenow'))
  );
}

function isCustomRadio(role: string, attributes: JSXOpeningElement['attributes']): boolean {
  return role === 'radio' && Boolean(getProp(attributes, 'aria-checked'));
}

function isSeparatorWithChildren(role: string, node: TSESTree.JSXOpeningElement): boolean {
  return role === 'separator' && hasChildren(node);
}

/**
 * Checks if the element has role="img" in a valid pattern.
 *
 * <img> is a void element that cannot contain children and uses src attribute (not CSS).
 * Therefore, role="img" is valid on div/span when:
 * - The element has children (emoji, icons, fallback content)
 * - The element uses CSS backgroundImage for image display
 */
function isImgRoleWithValidPattern(
  elementName: string | null,
  role: string,
  attributes: JSXOpeningElement['attributes'],
  node: TSESTree.JSXOpeningElement,
): boolean {
  if (role !== 'img' || (elementName !== 'div' && elementName !== 'span')) {
    return false;
  }

  // Check for children (emoji, icons, fallback content)
  if (hasChildren(node)) {
    return true;
  }

  // Check for CSS backgroundImage in style prop
  return hasBackgroundImageStyle(attributes);
}

/**
 * Checks if the element has a style prop containing backgroundImage.
 */
function hasBackgroundImageStyle(attributes: JSXOpeningElement['attributes']): boolean {
  const styleProp = getProp(attributes, 'style');
  if (!styleProp) {
    return false;
  }
  // Use getPropValue to extract object expressions (getLiteralPropValue returns null for objects)
  const styleValue = getPropValue(styleProp);
  // Check object-style prop (style={{ backgroundImage: ... }})
  if (styleValue && typeof styleValue === 'object' && 'backgroundImage' in styleValue) {
    return true;
  }
  return false;
}

/**
 * Gets the element name from a JSX opening element.
 */
function getElementName(node: TSESTree.JSXOpeningElement): string | null {
  if (node.name.type === 'JSXIdentifier') {
    return node.name.name.toLowerCase();
  }
  return null;
}

/**
 * Checks if the JSX element has children.
 */
function hasChildren(node: TSESTree.JSXOpeningElement): boolean {
  const parent = node.parent;
  if (parent?.type === 'JSXElement') {
    return parent.children.length > 0;
  }
  return false;
}

/**
 * Checks if the element is part of a custom table widget pattern.
 *
 * Custom table widgets use div/span elements with ARIA table roles because
 * native table elements (<table>, <tr>, <td>) only work within <table> structures,
 * but virtualized tables need div-based layouts for performance.
 *
 * A valid custom table widget requires both:
 * - Container roles (table, grid) must have descendant child roles
 * - Child roles (row, rowgroup, cell, etc.) must have ancestor container roles
 */
function isCustomTableWidget(
  elementName: string | null,
  role: string,
  node: TSESTree.JSXOpeningElement,
): boolean {
  // Only applies to div/span elements
  if (elementName !== 'div' && elementName !== 'span') {
    return false;
  }

  // Check if this is a container role (table, grid)
  if (TABLE_CONTAINER_ROLES.has(role)) {
    return hasDescendantTableChildRole(node);
  }

  // Check if this is a child role (row, rowgroup, cell, etc.)
  if (TABLE_CHILD_ROLES.has(role)) {
    return hasAncestorTableContainerRole(node);
  }

  return false;
}

/**
 * Checks if the element has any descendant with a TABLE_CHILD_ROLE.
 */
function hasDescendantTableChildRole(node: TSESTree.JSXOpeningElement): boolean {
  const jsxElement = node.parent;
  if (jsxElement?.type !== 'JSXElement') {
    return false;
  }
  return hasTableChildRoleInSubtree(jsxElement);
}

/**
 * Recursively searches the JSX subtree for elements with TABLE_CHILD_ROLES.
 */
function hasTableChildRoleInSubtree(node: TSESTree.JSXElement): boolean {
  for (const child of node.children) {
    if (child.type === 'JSXElement') {
      const childRole = getJSXElementRole(child);
      if (childRole && TABLE_CHILD_ROLES.has(childRole)) {
        return true;
      }
      // Recursively search nested elements
      if (hasTableChildRoleInSubtree(child)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Gets the role attribute value from a JSXElement.
 */
function getJSXElementRole(element: TSESTree.JSXElement): string | null {
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

/**
 * Checks if any ancestor div/span has a TABLE_CONTAINER_ROLE.
 */
function hasAncestorTableContainerRole(node: TSESTree.JSXOpeningElement): boolean {
  const ancestor = findFirstMatchingAncestor(node, (n): boolean => {
    if (n.type !== 'JSXElement') {
      return false;
    }
    const jsxElement = n as TSESTree.JSXElement;
    const elementName = getJSXElementName(jsxElement);
    // Only consider div/span as valid container elements
    if (elementName !== 'div' && elementName !== 'span') {
      return false;
    }
    const role = getJSXElementRole(jsxElement);
    return role !== null && TABLE_CONTAINER_ROLES.has(role);
  });
  return ancestor !== undefined;
}

/**
 * Gets the element name from a JSXElement.
 */
function getJSXElementName(element: TSESTree.JSXElement): string | null {
  const name = element.openingElement.name;
  if (name.type === 'JSXIdentifier') {
    return name.name.toLowerCase();
  }
  return null;
}
