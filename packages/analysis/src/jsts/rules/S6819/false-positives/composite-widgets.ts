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
import {
  hasDescendantWithOneOfRoles,
  hasDescendantWithRoleBeforeBoundary,
  hasRenderedAncestorWithOneOfRoles,
  hasRenderedAncestorWithRole,
} from '../helpers.js';

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

export function isGroupedListboxSubgroup(role: string, node: TSESTree.JSXOpeningElement): boolean {
  return (
    role === 'group' &&
    hasRenderedAncestorWithRole(node, 'listbox') &&
    hasDescendantWithRoleBeforeBoundary(node, 'option', 'listbox')
  );
}

/**
 * Checks if the element is part of a custom composite widget pattern.
 *
 * Suppresses two categories of roles:
 * - Container roles (table, grid, listbox) when they have descendant child roles
 * - Child roles (row, option, etc.) when they have an ancestor container role
 *
 * Both directions require the relationship to be rendered, so a container and its
 * children agree on whether they form a widget.
 *
 * No element-name restriction: any HTML tag (div, ul, li, span, etc.) qualifies.
 */
export function isCustomCompositeWidget(role: string, node: TSESTree.JSXOpeningElement): boolean {
  if (COMPOSITE_CONTAINER_ROLES.has(role)) {
    return hasDescendantWithOneOfRoles(node, COMPOSITE_CHILD_ROLES);
  }

  if (COMPOSITE_CHILD_ROLES.has(role)) {
    return hasRenderedAncestorWithOneOfRoles(node, COMPOSITE_CONTAINER_ROLES);
  }

  return false;
}
