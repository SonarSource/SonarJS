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
const { getProp, getLiteralPropValue } = pkg;
import { interceptReportForReact, generateMeta } from '../helpers/index.js';
import { isHtmlElement } from '../helpers/isHtmlElement.js';
import * as meta from './generated-meta.js';

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
      const node = (reportDescriptor as any).node as TSESTree.JSXOpeningElement;

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

  // SVG with role="presentation" or role="img" and aria-hidden="true"
  if (elementName === 'svg' && (role === 'presentation' || role === 'img')) {
    const ariaHiddenProp = getProp(attributes, 'aria-hidden');
    if (ariaHiddenProp) {
      const ariaHiddenValue = getLiteralPropValue(ariaHiddenProp);
      if (ariaHiddenValue === true || ariaHiddenValue === 'true') {
        return true;
      }
    }
  }

  // role="status" with aria-live (live region pattern)
  if (role === 'status' && getProp(attributes, 'aria-live')) {
    return true;
  }

  // role="slider" with complete aria-value* attributes
  if (role === 'slider') {
    if (
      getProp(attributes, 'aria-valuemin') &&
      getProp(attributes, 'aria-valuemax') &&
      getProp(attributes, 'aria-valuenow')
    ) {
      return true;
    }
  }

  // role="radio" with aria-checked
  if (role === 'radio' && getProp(attributes, 'aria-checked')) {
    return true;
  }

  // role="separator" with children (since <hr> is a void element)
  if (role === 'separator' && hasChildren(node)) {
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
  if (parent && parent.type === 'JSXElement') {
    return parent.children.length > 0;
  }
  return false;
}
