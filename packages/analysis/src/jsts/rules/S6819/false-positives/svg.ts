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
import type { Rule } from 'eslint';
import { hasAccessibleName, isHiddenFromEveryone } from '../../helpers/accessibility.js';

export function isDecorativeSvg(
  elementName: string | null,
  role: string,
  node: TSESTree.JSXOpeningElement,
  context: Rule.RuleContext,
): boolean {
  if (elementName !== 'svg' || (role !== 'presentation' && role !== 'img')) {
    return false;
  }
  return isHiddenFromEveryone(node, context);
}

/**
 * Checks if the element is a semantic SVG icon with role="img" and a proper accessible name.
 *
 * Inline SVG with role="img" is a WCAG-compliant pattern for icon components that need
 * CSS class control, animation, or programmatic styling. It is not replaceable by <img>
 * when the SVG provides an accessible name via <title>, aria-label, or aria-labelledby.
 */
export function isSemanticSvgImg(
  elementName: string | null,
  role: string,
  node: TSESTree.JSXOpeningElement,
): boolean {
  if (elementName !== 'svg' || role !== 'img') {
    return false;
  }
  return hasAccessibleName(node);
}
