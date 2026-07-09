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
import type { SourceCode } from 'eslint';
import {
  getJSXElementRole,
  hasAncestorWithRole,
  hasDescendantWithOneOfRoles,
  hasDescendantWithRoleBeforeBoundary,
} from '../helpers.js';
import { findFirstMatchingAncestor } from '../../helpers/ancestor.js';

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

export function isGroupedListboxSubgroup(
  role: string,
  node: TSESTree.JSXOpeningElement,
  sourceCode: SourceCode,
): boolean {
  return (
    role === 'group' &&
    hasAncestorWithRole(node, 'listbox') &&
    hasDescendantWithRoleBeforeBoundary(node, 'option', 'listbox', sourceCode)
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
export function isCustomCompositeWidget(
  role: string,
  node: TSESTree.JSXOpeningElement,
  sourceCode: SourceCode,
): boolean {
  if (COMPOSITE_CONTAINER_ROLES.has(role)) {
    return hasDescendantWithOneOfRoles(node, COMPOSITE_CHILD_ROLES, sourceCode);
  }

  if (COMPOSITE_CHILD_ROLES.has(role)) {
    return hasAncestorCompositeContainerRole(node);
  }

  return false;
}

function hasAncestorCompositeContainerRole(node: TSESTree.JSXOpeningElement): boolean {
  const ancestor = findFirstMatchingAncestor(node, n => {
    if (n.type !== 'JSXElement') {
      return false;
    }
    const role = getJSXElementRole(n);
    return role !== null && COMPOSITE_CONTAINER_ROLES.has(role);
  });
  return ancestor !== undefined;
}
