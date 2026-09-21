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
import type { Node } from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import type { JSXOpeningElement } from 'estree-jsx';
import pkg from 'jsx-ast-utils-x';
import { hasSvgAccessibleName } from '../helpers/accessibility.js';

const { getProp, getLiteralPropValue } = pkg;

const DECORATIVE_ROLES = new Set(['presentation', 'none']);

const MESSAGE =
  'This <svg> lacks an accessible name; add a "title" child, "aria-label", or "aria-labelledby", or mark it as decorative (e.g. aria-hidden or role="presentation").';

/**
 * Reports inline SVGs that convey meaning but have no accessible name (WCAG 1.1.1).
 *
 * Unlike <img>/<object>/<area>, upstream jsx-a11y/alt-text never visits <svg> at all, so this
 * is original analysis rather than a false-positive filter on an upstream report.
 */
export function checkSvgAccessibleName(
  context: Rule.RuleContext,
  node: TSESTree.JSXOpeningElement,
) {
  if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'svg') {
    return;
  }

  const attributes = (node as JSXOpeningElement).attributes;

  if (attributes.some(attribute => attribute.type === 'JSXSpreadAttribute')) {
    // A spread could supply the name, hide the element, or change its role; not statically knowable.
    return;
  }

  if (isRoleDynamic(attributes)) {
    return;
  }

  if (isHiddenFromAssistiveTech(node, attributes)) {
    return;
  }

  if (isDecorativeRole(attributes)) {
    return;
  }

  // Known limitation: only emptiness is checked, not content quality - a punctuation-only
  // name (e.g. aria-label="." or <title>-</title>) is treated as accessible, matching
  // upstream jsx-a11y/alt-text and Biome's no-svg-without-title.
  if (hasSvgAccessibleName(node)) {
    return;
  }

  context.report({ node: node.name as unknown as Node, message: MESSAGE });
}

function isRoleDynamic(attributes: JSXOpeningElement['attributes']): boolean {
  const roleProp = getProp(attributes, 'role');
  if (!roleProp) {
    return false;
  }
  return typeof getLiteralPropValue(roleProp) !== 'string';
}

/**
 * The role attribute is an ordered fallback list; per the WAI-ARIA spec, the first
 * non-abstract token is the effective role, the rest are pure fallback for less-capable ATs.
 */
function isDecorativeRole(attributes: JSXOpeningElement['attributes']): boolean {
  const roleProp = getProp(attributes, 'role');
  if (!roleProp) {
    return false;
  }
  const roleValue = getLiteralPropValue(roleProp);
  if (typeof roleValue !== 'string') {
    return false;
  }
  const firstToken = roleValue.trim().split(/\s+/)[0]?.toLowerCase();
  return DECORATIVE_ROLES.has(firstToken);
}

function isHiddenFromAssistiveTech(
  node: TSESTree.JSXOpeningElement,
  attributes: JSXOpeningElement['attributes'],
): boolean {
  const own = getAriaHiddenState(attributes);
  if (own !== undefined) {
    return own;
  }

  let ancestor: TSESTree.Node | undefined = node.parent?.parent;
  while (ancestor) {
    if (ancestor.type === 'JSXElement') {
      const state = getAriaHiddenState(
        (ancestor.openingElement as unknown as JSXOpeningElement).attributes,
      );
      if (state !== undefined) {
        return state;
      }
    }
    ancestor = ancestor.parent;
  }

  return false;
}

function getAriaHiddenState(attributes: JSXOpeningElement['attributes']): boolean | undefined {
  const prop = getProp(attributes, 'aria-hidden');
  if (!prop) {
    return undefined;
  }
  const value = getLiteralPropValue(prop);
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  // Dynamic/unresolvable value: conservatively treat as hidden and stop climbing (nearest wins).
  return true;
}
