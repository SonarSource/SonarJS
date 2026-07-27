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
import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import elementsData from './react-three-fiber-elements.json' with { type: 'json' };

export const REACT_THREE_FIBER = '@react-three/fiber';

/**
 * React Three Fiber (R3F) intrinsic element names (e.g. `mesh`, `ambientLight`, `boxGeometry`).
 *
 * These are three.js objects, not DOM elements, so `react/no-unknown-property` has no authority over
 * their props: we suppress every one of its reports on such an element rather than maintaining a
 * per-element allow-list of valid props (the three.js prop surface is huge, version-dependent, and
 * includes unbounded dashed forms such as `rotation-x`). Names that collide with an HTML or SVG tag
 * (e.g. `audio`, `line`) are deliberately excluded so real DOM elements keep reporting.
 *
 * The list is generated from the three.js runtime by `tools/generate-S6747-elements.ts` — run
 * `npx tsx tools/generate-S6747-elements.ts` from the repository root to refresh it against the
 * latest released three.js. Do not edit `react-three-fiber-elements.json` by hand.
 */
const R3F_INTRINSIC_ELEMENTS = new Set<string>(elementsData.elements);

/**
 * Suppresses a `no-unknown-property` report when it targets a plain attribute on a recognized R3F
 * intrinsic element. Namespaced (colon) attribute names such as `position:x` are not valid R3F props
 * and keep reporting; dashed names such as `position-x` are single JSX identifiers and are suppressed.
 */
export function isReactThreeFiberIntrinsicProp(descriptor: Rule.ReportDescriptor): boolean {
  if (!('node' in descriptor)) {
    return false;
  }

  const node = descriptor.node as TSESTree.Node;
  if (node.type !== 'JSXAttribute' || node.name.type !== 'JSXIdentifier') {
    return false;
  }

  const openingElement = node.parent;
  if (openingElement?.type !== 'JSXOpeningElement') {
    return false;
  }

  const elementName = openingElement.name;
  return elementName.type === 'JSXIdentifier' && R3F_INTRINSIC_ELEMENTS.has(elementName.name);
}
