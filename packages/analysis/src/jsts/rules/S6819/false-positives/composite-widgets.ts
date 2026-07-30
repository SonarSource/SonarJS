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
import { findFirstMatchingAncestor } from '../../helpers/ancestor.js';
import { getRole } from '../../helpers/accessibility.js';
import { someRenderedJsxDescendant } from '../../helpers/jsx.js';

const COMPOSITE_CONTAINER_ROLES = new Set(['table', 'grid', 'listbox']);
const COMPOSITE_CHILD_ROLES = new Set([
  'row',
  'rowgroup',
  'cell',
  'gridcell',
  'columnheader',
  'rowheader',
  'option',
]);

/**
 * Checks if the element is a subgroup of options inside a custom listbox.
 *
 * The tags this rule suggests for role="group" are <details>, <fieldset>, <optgroup> and
 * <address>. None of them works here: <optgroup> is only valid inside <select>, so a subgroup
 * of a custom listbox has no semantic equivalent to migrate to.
 */
export function isGroupedListboxSubgroup(role: string, node: TSESTree.JSXOpeningElement): boolean {
  const element = node.parent;
  return (
    role === 'group' &&
    element?.type === 'JSXElement' &&
    hasEnclosingAncestorWithRole(element, 'listbox') &&
    hasDescendantWithRoleBeforeBoundary(element, 'option', 'listbox')
  );
}

/**
 * Checks if the element is part of a custom composite widget pattern.
 *
 * Suppresses two categories of roles:
 * - Container roles (table, grid, listbox) when they have descendant child roles
 * - Child roles (row, option, etc.) when they have an ancestor container role
 *
 * No element-name restriction: any HTML tag (div, ul, li, span, etc.) qualifies.
 */
export function isCustomCompositeWidget(role: string, node: TSESTree.JSXOpeningElement): boolean {
  const element = node.parent;

  if (COMPOSITE_CONTAINER_ROLES.has(role)) {
    // Intentionally boundary-free: a container nested in another container is malformed
    // markup, and reporting the outer one would suggest a tag that cannot hold it either.
    return (
      element?.type === 'JSXElement' &&
      someRenderedJsxDescendant(element, descendant =>
        elementHasOneOfRoles(descendant, COMPOSITE_CHILD_ROLES),
      )
    );
  }

  if (COMPOSITE_CHILD_ROLES.has(role)) {
    return hasEnclosingAncestorWithOneOfRoles(node, COMPOSITE_CONTAINER_ROLES);
  }

  return false;
}

function hasEnclosingAncestorWithRole(element: TSESTree.JSXElement, role: string): boolean {
  return Boolean(
    findFirstMatchingAncestor(
      element,
      ancestor => ancestor.type === 'JSXElement' && getRole(ancestor.openingElement) === role,
    ),
  );
}

function hasEnclosingAncestorWithOneOfRoles(
  node: TSESTree.JSXOpeningElement,
  roles: Set<string>,
): boolean {
  return Boolean(
    findFirstMatchingAncestor(
      node,
      ancestor =>
        ancestor.type === 'JSXElement' && roles.has(getRole(ancestor.openingElement) ?? ''),
    ),
  );
}

function hasDescendantWithRoleBeforeBoundary(
  element: TSESTree.JSXElement,
  role: string,
  boundaryRole: string,
): boolean {
  return someRenderedJsxDescendant(
    element,
    descendant => getRole(descendant.openingElement) === role,
    descendant => getRole(descendant.openingElement) === boundaryRole,
  );
}

function elementHasOneOfRoles(element: TSESTree.JSXElement, roles: Set<string>): boolean {
  return roles.has(getRole(element.openingElement) ?? '');
}
