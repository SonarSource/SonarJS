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
import type estree from 'estree';
import type { JSXAttribute, JSXOpeningElement } from 'estree-jsx';
import pkg from 'jsx-ast-utils-x';
const { getProp, getLiteralPropValue, getPropValue } = pkg;
import { interceptReportForReact } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isHtmlElement } from '../helpers/isHtmlElement.js';
import { childrenOf, findFirstMatchingAncestor } from '../helpers/ancestor.js';
import * as meta from './generated-meta.js';

// ARIA composite container roles that indicate a custom composite widget
const COMPOSITE_CONTAINER_ROLES = new Set(['table', 'grid', 'listbox']);
// ARIA composite child roles that must be inside a container role
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
 * Decorates the prefer-tag-over-role rule to fix false positives.
 *
 * Suppresses reports for:
 * 1. Custom components (not standard HTML elements)
 * 2. Valid ARIA patterns where semantic equivalents would lose functionality:
 *    - SVG with role="presentation"/"img" and aria-hidden="true" (decorative icons)
 *    - SVG with role="img" and a <title> child, aria-label, or aria-labelledby (semantic icons)
 *    - role="status" with aria-live (live region pattern)
 *    - role="slider" with complete aria-value* attributes
 *    - role="radio" with aria-checked
 *    - role="combobox" popup widgets with ARIA disclosure state
 *    - role="separator" with children (since <hr> is void)
 *    - role="img" on div/span with children or CSS backgroundImage (since <img> is void)
 *    - role="group" subgroups containing options inside role="listbox"
 *    - ARIA composite widget roles (table, grid, listbox, row, option, etc.) when forming
 *      complete custom widget patterns
 *
 * Note: SVG internal elements like <g> are not in HTML_TAG_NAMES, so they're
 * already filtered out by isHtmlElement. HTML elements with role="group" remain
 * true positives unless they form a listbox subgroup with option descendants.
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

      if (isValidAriaPattern(node, context)) {
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
function isValidAriaPattern(node: TSESTree.JSXOpeningElement, context: Rule.RuleContext): boolean {
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
    isSemanticSvgImg(elementName, role, attributes, node) ||
    isLiveRegionStatus(role, attributes) ||
    isCustomSlider(role, attributes) ||
    isCustomRadio(role, attributes) ||
    isCustomCombobox(role, attributes) ||
    isSeparatorWithChildren(role, node) ||
    isImgRoleWithValidPattern(elementName, role, attributes, node) ||
    isGroupedListboxSubgroup(role, node, context) ||
    isCustomCompositeWidget(role, node, context)
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

/**
 * Checks if the element is a semantic SVG icon with role="img" and a proper accessible name.
 *
 * Inline SVG with role="img" is a WCAG-compliant pattern for icon components that need
 * CSS class control, animation, or programmatic styling. It is not replaceable by <img>
 * when the SVG provides an accessible name via <title>, aria-label, or aria-labelledby.
 */
function isSemanticSvgImg(
  elementName: string | null,
  role: string,
  attributes: JSXOpeningElement['attributes'],
  node: TSESTree.JSXOpeningElement,
): boolean {
  if (elementName !== 'svg' || role !== 'img') {
    return false;
  }
  if (hasAccessibleNameAttribute(attributes, 'aria-label')) {
    return true;
  }
  if (hasAccessibleNameAttribute(attributes, 'aria-labelledby')) {
    return true;
  }
  return hasTitleChild(node);
}

function hasAccessibleNameAttribute(
  attributes: JSXOpeningElement['attributes'],
  name: 'aria-label' | 'aria-labelledby',
): boolean {
  const prop = getProp(attributes, name);
  if (!prop) {
    return false;
  }

  if (isNonEmptyStringAttribute(prop)) {
    return true;
  }

  // Dynamic expressions are unknown statically, but nullish values should not suppress.
  return getLiteralPropValue(prop) === null && getPropValue(prop) != null;
}

function isNonEmptyStringAttribute(prop: JSXAttribute): boolean {
  if (prop.value?.type === 'Literal') {
    return typeof prop.value.value === 'string' && prop.value.value.trim() !== '';
  }

  if (prop.value?.type === 'JSXExpressionContainer' && prop.value.expression.type === 'Literal') {
    return (
      typeof prop.value.expression.value === 'string' && prop.value.expression.value.trim() !== ''
    );
  }

  return false;
}

/**
 * Checks if the JSX element has a direct <title> child element with non-empty content.
 */
function hasTitleChild(node: TSESTree.JSXOpeningElement): boolean {
  const parent = node.parent;
  if (parent?.type !== 'JSXElement') {
    return false;
  }
  return parent.children.some(
    child =>
      child.type === 'JSXElement' &&
      child.openingElement.name.type === 'JSXIdentifier' &&
      child.openingElement.name.name === 'title' &&
      child.children.some(
        c =>
          (c.type === 'JSXText' && c.value.trim() !== '') ||
          (c.type === 'JSXExpressionContainer' &&
            c.expression.type !== 'JSXEmptyExpression' &&
            !(c.expression.type === 'Literal' && !c.expression.value) &&
            !(c.expression.type === 'Identifier' && c.expression.name === 'undefined')),
      ),
  );
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

/**
 * Checks if the element is a custom combobox that manages its own popup state.
 *
 * The popup-state attributes alone identify an intentional custom combobox: a
 * native <input>/<select> cannot manually manage aria-expanded disclosure over
 * custom popup content. This covers select-only comboboxes that have no text
 * input descendant.
 *
 * @param {string} role the normalized role attribute
 * @param {JSXOpeningElement['attributes']} attributes the opening element attributes
 * @return {boolean} true when the element matches a custom combobox pattern
 */
function isCustomCombobox(role: string, attributes: JSXOpeningElement['attributes']): boolean {
  return role === 'combobox' && hasComboboxPopupState(attributes);
}

/**
 * Checks if the element declares popup state for a combobox widget.
 *
 * @param {JSXOpeningElement['attributes']} attributes the opening element attributes
 * @return {boolean} true when the element exposes combobox popup state
 */
function hasComboboxPopupState(attributes: JSXOpeningElement['attributes']): boolean {
  return (
    Boolean(getProp(attributes, 'aria-expanded')) &&
    hasAnyProp(attributes, ['aria-controls', 'aria-owns', 'aria-haspopup'])
  );
}

/**
 * Checks if any of the provided attributes exists on the element.
 *
 * @param {JSXOpeningElement['attributes']} attributes the opening element attributes
 * @param {string[]} names the attribute names to look for
 * @return {boolean} true when at least one attribute is present
 */
function hasAnyProp(attributes: JSXOpeningElement['attributes'], names: string[]): boolean {
  return names.some(name => Boolean(getProp(attributes, name)));
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

function isGroupedListboxSubgroup(
  role: string,
  node: TSESTree.JSXOpeningElement,
  context: Rule.RuleContext,
): boolean {
  return (
    role === 'group' &&
    hasAncestorWithRole(node, 'listbox') &&
    hasDescendantWithRole(node, 'option', context)
  );
}

function hasAncestorWithRole(node: TSESTree.JSXOpeningElement, role: string): boolean {
  return (
    findFirstMatchingAncestor(
      node,
      ancestor => ancestor.type === 'JSXElement' && getJSXElementRole(ancestor) === role,
    ) !== undefined
  );
}

function hasDescendantWithRole(
  node: TSESTree.JSXOpeningElement,
  role: string,
  context: Rule.RuleContext,
): boolean {
  return hasDescendantMatchingRole(node, descendantRole => descendantRole === role, context);
}

function hasDescendantMatchingRole(
  node: TSESTree.JSXOpeningElement,
  predicate: (role: string) => boolean,
  context: Rule.RuleContext,
): boolean {
  const jsxElement = node.parent;
  if (jsxElement?.type !== 'JSXElement') {
    return false;
  }

  const root = jsxElement as unknown as estree.Node;
  const stack = [...childrenOf(root, context.sourceCode.visitorKeys)];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    if (
      current.type === 'JSXElement' &&
      current !== root &&
      roleMatches(current as unknown as TSESTree.JSXElement, predicate)
    ) {
      return true;
    }
    stack.push(...childrenOf(current, context.sourceCode.visitorKeys));
  }
  return false;
}

function roleMatches(element: TSESTree.JSXElement, predicate: (role: string) => boolean): boolean {
  const role = getJSXElementRole(element);
  return role !== null && predicate(role);
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
function isCustomCompositeWidget(
  role: string,
  node: TSESTree.JSXOpeningElement,
  context: Rule.RuleContext,
): boolean {
  if (COMPOSITE_CONTAINER_ROLES.has(role)) {
    return hasDescendantCompositeChildRole(node, context);
  }

  if (COMPOSITE_CHILD_ROLES.has(role)) {
    return hasAncestorCompositeContainerRole(node);
  }

  return false;
}

/**
 * Checks if the element has any descendant with a COMPOSITE_CHILD_ROLE.
 */
function hasDescendantCompositeChildRole(
  node: TSESTree.JSXOpeningElement,
  context: Rule.RuleContext,
): boolean {
  return hasDescendantWithOneOfRoles(node, COMPOSITE_CHILD_ROLES, context);
}

/**
 * Searches the JSX subtree for elements with one of the target roles, including
 * JSX returned through expression containers.
 */
function hasDescendantWithOneOfRoles(
  node: TSESTree.JSXOpeningElement,
  roles: Set<string>,
  context: Rule.RuleContext,
): boolean {
  return hasDescendantMatchingRole(node, role => roles.has(role), context);
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
 * Checks if any ancestor JSX element has a COMPOSITE_CONTAINER_ROLE.
 */
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
