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
import { getRole } from '../../helpers/accessibility.js';
import { isCustomCompositeWidget, isGroupedListboxSubgroup } from './composite-widgets.js';
import { isDecorativeSvg, isSemanticSvgImg } from './svg.js';
import {
  isCustomCombobox,
  isCustomRadio,
  isCustomSlider,
  isImgRoleWithValidPattern,
  isLiveRegionStatus,
  isSeparatorWithChildren,
} from './widget-patterns.js';

/**
 * Checks if the element uses a valid ARIA pattern where suggesting a semantic
 * element would be inappropriate.
 */
export function isFalsePositive(node: TSESTree.JSXOpeningElement): boolean {
  const role = getRole(node);
  if (role === null) {
    return false;
  }

  const attributes = (node as JSXOpeningElement).attributes;
  const elementName = node.name.type === 'JSXIdentifier' ? node.name.name.toLowerCase() : null;

  return (
    isDecorativeSvg(elementName, role, attributes) ||
    isSemanticSvgImg(elementName, role, attributes, node) ||
    isLiveRegionStatus(role, attributes) ||
    isCustomSlider(role, attributes) ||
    isCustomRadio(role, attributes) ||
    isCustomCombobox(role, attributes) ||
    isSeparatorWithChildren(role, node) ||
    isImgRoleWithValidPattern(elementName, role, attributes, node) ||
    isGroupedListboxSubgroup(role, node) ||
    isCustomCompositeWidget(role, node)
  );
}
