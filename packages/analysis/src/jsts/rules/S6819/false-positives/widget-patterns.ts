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
import type { JSXOpeningElement } from 'estree-jsx';
import pkg from 'jsx-ast-utils-x';
import { hasAnyProp, hasBackgroundImageStyle, hasChildren } from '../helpers.js';

const { getProp } = pkg;

export function isLiveRegionStatus(
  role: string,
  attributes: JSXOpeningElement['attributes'],
): boolean {
  return role === 'status' && Boolean(getProp(attributes, 'aria-live'));
}

export function isCustomSlider(role: string, attributes: JSXOpeningElement['attributes']): boolean {
  return (
    role === 'slider' &&
    Boolean(getProp(attributes, 'aria-valuemin')) &&
    Boolean(getProp(attributes, 'aria-valuemax')) &&
    Boolean(getProp(attributes, 'aria-valuenow'))
  );
}

export function isCustomRadio(role: string, attributes: JSXOpeningElement['attributes']): boolean {
  return role === 'radio' && Boolean(getProp(attributes, 'aria-checked'));
}

/**
 * Checks if the element is a custom combobox that manages its own popup state.
 *
 * The popup-state attributes alone identify an intentional custom combobox: a
 * native <input>/<select> cannot manually manage aria-expanded disclosure over
 * custom popup content. This covers select-only comboboxes that have no text
 * input descendant.
 */
export function isCustomCombobox(
  role: string,
  attributes: JSXOpeningElement['attributes'],
): boolean {
  return role === 'combobox' && hasComboboxPopupState(attributes);
}

/**
 * Checks if the element declares popup state for a combobox widget.
 */
function hasComboboxPopupState(attributes: JSXOpeningElement['attributes']): boolean {
  return (
    Boolean(getProp(attributes, 'aria-expanded')) &&
    hasAnyProp(attributes, ['aria-controls', 'aria-owns', 'aria-haspopup'])
  );
}

export function isSeparatorWithChildren(role: string, node: TSESTree.JSXOpeningElement): boolean {
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
export function isImgRoleWithValidPattern(
  elementName: string | null,
  role: string,
  attributes: JSXOpeningElement['attributes'],
  node: TSESTree.JSXOpeningElement,
): boolean {
  if (role !== 'img' || (elementName !== 'div' && elementName !== 'span')) {
    return false;
  }

  return hasChildren(node) || hasBackgroundImageStyle(attributes);
}
