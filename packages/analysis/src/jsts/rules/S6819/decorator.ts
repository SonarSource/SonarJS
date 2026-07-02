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
import type { JSXAttribute, JSXOpeningElement } from 'estree-jsx';
import pkg from 'jsx-ast-utils-x';
const { getProp, getLiteralPropValue, getPropValue } = pkg;
import { interceptReportForReact } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isHtmlElement } from '../helpers/isHtmlElement.js';
import { findFirstMatchingAncestor } from '../helpers/ancestor.js';
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
const COMPOSITE_GROUP_OWNER_ROLES = new Set([
  'tree',
  'treegrid',
  'menu',
  'menubar',
  'toolbar',
  'listbox',
  'tablist',
  'radiogroup',
]);
const FIELDSET_FORM_CONTROL_ELEMENTS = new Set(['input', 'select', 'textarea']);

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
 *    - role="separator" with children (since <hr> is void)
 *    - role="img" on div/span with children or CSS backgroundImage (since <img> is void)
 *    - role="group" in composite widgets or when the content is not fieldset-like
 *    - ARIA composite widget roles (table, grid, listbox, row, option, etc.) when forming
 *      complete custom widget patterns
 *
 * Note: SVG internal elements like <g> are not in HTML_TAG_NAMES, so they're
 * already filtered out by isHtmlElement. HTML elements with role="group" only
 * remain true positives when they approximate a <fieldset>-style control group.
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

  return (
    isDecorativeSvg(elementName, role, attributes) ||
    isSemanticSvgImg(elementName, role, attributes, node) ||
    isLiveRegionStatus(role, attributes) ||
    isCustomSlider(role, attributes) ||
    isCustomRadio(role, attributes) ||
    isSeparatorWithChildren(role, node) ||
    isImgRoleWithValidPattern(elementName, role, attributes, node) ||
    isValidGroupRolePattern(role, attributes, node) ||
    isCustomCompositeWidget(role, node)
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

function isSeparatorWithChildren(role: string, node: TSESTree.JSXOpeningElement): boolean {
  return role === 'separator' && hasChildren(node);
}

/**
 * Checks if role="group" is used in a valid pattern.
 *
 * @param role The resolved role attribute value.
 * @param attributes The JSX attributes on the current element.
 * @param node The JSX opening element being checked.
 * @return Whether the group role should be preserved.
 */
function isValidGroupRolePattern(
  role: string,
  attributes: JSXOpeningElement['attributes'],
  node: TSESTree.JSXOpeningElement,
): boolean {
  return (
    role === 'group' &&
    (isGroupWithinCompositeWidget(node) || !hasFieldsetEquivalentContent(attributes, node))
  );
}

/**
 * Checks if the group belongs to a larger composite widget structure.
 *
 * @param node The JSX opening element being checked.
 * @return Whether the group is structural to a composite widget.
 */
function isGroupWithinCompositeWidget(node: TSESTree.JSXOpeningElement): boolean {
  return hasCompositeGroupOwnerAncestor(node) || hasCompositeGroupOwnerByAriaOwns(node);
}

/**
 * Checks if the group sits below a composite widget ancestor.
 *
 * @param node The JSX opening element being checked.
 * @return Whether a composite widget ancestor exists.
 */
function hasCompositeGroupOwnerAncestor(node: TSESTree.JSXOpeningElement): boolean {
  return (
    findFirstMatchingAncestor(node, ancestor => {
      if (ancestor.type !== 'JSXElement') {
        return false;
      }

      const role = getJSXElementRole(ancestor);
      return role !== null && COMPOSITE_GROUP_OWNER_ROLES.has(role);
    }) !== undefined
  );
}

/**
 * Checks if a composite widget owns this group via aria-owns.
 *
 * @param node The JSX opening element being checked.
 * @return Whether a composite widget owns the group by id reference.
 */
function hasCompositeGroupOwnerByAriaOwns(node: TSESTree.JSXOpeningElement): boolean {
  const id = getNonEmptyStringAttributeValue((node as JSXOpeningElement).attributes, 'id');
  if (id === null) {
    return false;
  }

  const root = getContainingJsxSubtree(node);
  return root !== null && hasCompositeGroupOwnerReference(root, id, node);
}

/**
 * Checks whether the group content is close to a fieldset-like control grouping.
 *
 * @param attributes The JSX attributes on the current element.
 * @param node The JSX opening element being checked.
 * @return Whether a fieldset is still a sound replacement.
 */
function hasFieldsetEquivalentContent(
  attributes: JSXOpeningElement['attributes'],
  node: TSESTree.JSXOpeningElement,
): boolean {
  return hasGroupAccessibleName(attributes) && countDescendantFormControls(node) >= 2;
}

/**
 * Checks whether the group exposes a shared accessible name.
 *
 * @param attributes The JSX attributes on the current element.
 * @return Whether the group has an accessible name attribute.
 */
function hasGroupAccessibleName(attributes: JSXOpeningElement['attributes']): boolean {
  return (
    hasAccessibleNameAttribute(attributes, 'aria-label') ||
    hasAccessibleNameAttribute(attributes, 'aria-labelledby')
  );
}

/**
 * Counts descendant form controls that a fieldset could group.
 *
 * @param node The JSX opening element being checked.
 * @return The number of descendant form controls.
 */
function countDescendantFormControls(node: TSESTree.JSXOpeningElement): number {
  const group = node.parent;
  if (group?.type !== 'JSXElement') {
    return 0;
  }

  return countFormControlsInChildren(group.children);
}

/**
 * Counts form controls in a JSX children list.
 *
 * @param children The JSX children to inspect.
 * @return The number of descendant form controls.
 */
function countFormControlsInChildren(children: TSESTree.JSXChild[]): number {
  let count = 0;

  for (const child of children) {
    if (child.type === 'JSXElement') {
      if (isFieldsetFormControl(child)) {
        count++;
      }
      count += countFormControlsInChildren(child.children);
    } else if (child.type === 'JSXFragment') {
      count += countFormControlsInChildren(child.children);
    } else if (child.type === 'JSXExpressionContainer') {
      count += countFormControlsInChildren(getJsxFromExpression(child.expression));
    }
  }

  return count;
}

/**
 * Extracts the JSX subtrees a `{ ... }` expression container renders.
 *
 * Covers the common React render patterns: bare JSX, short-circuit (`&&`/`||`),
 * conditional (`?:`), arrays, and iteration callbacks such as `.map(...)`. JSX
 * reached through a variable or an external helper call cannot be resolved
 * statically and is intentionally left out.
 *
 * @param expression The expression wrapped in the container.
 * @return The JSX subtrees reachable from the expression.
 */
function getJsxFromExpression(
  expression: TSESTree.Expression | TSESTree.JSXEmptyExpression,
): (TSESTree.JSXElement | TSESTree.JSXFragment)[] {
  switch (expression.type) {
    case 'JSXElement':
    case 'JSXFragment':
      return [expression];
    case 'LogicalExpression':
      return [...getJsxFromExpression(expression.left), ...getJsxFromExpression(expression.right)];
    case 'ConditionalExpression':
      return [
        ...getJsxFromExpression(expression.consequent),
        ...getJsxFromExpression(expression.alternate),
      ];
    case 'ArrayExpression':
      return expression.elements.flatMap(element =>
        element === null || element.type === 'SpreadElement' ? [] : getJsxFromExpression(element),
      );
    case 'CallExpression':
      return expression.arguments.flatMap(getJsxFromCallbackArgument);
    default:
      return [];
  }
}

/**
 * Extracts JSX returned by a callback argument (e.g. the `.map` mapper).
 *
 * @param argument The call argument to inspect.
 * @return The JSX subtrees returned by the callback body.
 */
function getJsxFromCallbackArgument(
  argument: TSESTree.CallExpressionArgument,
): (TSESTree.JSXElement | TSESTree.JSXFragment)[] {
  if (argument.type !== 'ArrowFunctionExpression' && argument.type !== 'FunctionExpression') {
    return [];
  }

  if (argument.body.type === 'BlockStatement') {
    return argument.body.body.flatMap(statement =>
      statement.type === 'ReturnStatement' && statement.argument != null
        ? getJsxFromExpression(statement.argument)
        : [],
    );
  }

  return getJsxFromExpression(argument.body);
}

/**
 * Checks whether a JSX element is a form control that a fieldset can group.
 *
 * @param element The JSX element being checked.
 * @return Whether the element is a supported fieldset form control.
 */
function isFieldsetFormControl(element: TSESTree.JSXElement): boolean {
  if (!isHtmlElement(element)) {
    return false;
  }

  const elementName = getElementName(element.openingElement);
  if (elementName === null || !FIELDSET_FORM_CONTROL_ELEMENTS.has(elementName)) {
    return false;
  }

  if (elementName !== 'input') {
    return true;
  }

  return !isHiddenInput(element.openingElement);
}

/**
 * Checks whether an input element is explicitly hidden.
 *
 * @param node The JSX opening element being checked.
 * @return Whether the input type is hidden.
 */
function isHiddenInput(node: TSESTree.JSXOpeningElement): boolean {
  const type = getNonEmptyStringAttributeValue((node as JSXOpeningElement).attributes, 'type');
  return type?.toLowerCase() === 'hidden';
}

/**
 * Finds the outermost local JSX subtree containing the node.
 *
 * @param node The JSX opening element being checked.
 * @return The containing JSX subtree, if any.
 */
function getContainingJsxSubtree(
  node: TSESTree.JSXOpeningElement,
): TSESTree.JSXElement | TSESTree.JSXFragment | null {
  let current = node.parent;
  let root: TSESTree.JSXElement | TSESTree.JSXFragment | null = null;

  while (current != null) {
    if (current.type === 'JSXElement' || current.type === 'JSXFragment') {
      root = current;
    }
    current = current.parent;
  }

  return root;
}

/**
 * Checks whether a JSX subtree contains a composite owner for the given id.
 *
 * @param node The JSX subtree to inspect.
 * @param id The id owned by the composite widget.
 * @param current The current group opening element.
 * @return Whether a composite widget in the subtree owns the id.
 */
function hasCompositeGroupOwnerReference(
  node: TSESTree.JSXElement | TSESTree.JSXFragment,
  id: string,
  current: TSESTree.JSXOpeningElement,
): boolean {
  if (
    node.type === 'JSXElement' &&
    node.openingElement !== current &&
    isCompositeGroupOwnerReference(node.openingElement, id)
  ) {
    return true;
  }

  return node.children.some(child => {
    if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
      return hasCompositeGroupOwnerReference(child, id, current);
    }
    if (child.type === 'JSXExpressionContainer') {
      return getJsxFromExpression(child.expression).some(jsx =>
        hasCompositeGroupOwnerReference(jsx, id, current),
      );
    }
    return false;
  });
}

/**
 * Checks whether an element is a composite widget that owns the given id.
 *
 * @param node The JSX opening element being checked.
 * @param id The id owned by the composite widget.
 * @return Whether the element owns the id.
 */
function isCompositeGroupOwnerReference(node: TSESTree.JSXOpeningElement, id: string): boolean {
  const role = getJSXOpeningElementRole(node);
  if (role === null || !COMPOSITE_GROUP_OWNER_ROLES.has(role)) {
    return false;
  }

  return getAriaOwnsIds((node as JSXOpeningElement).attributes).includes(id);
}

/**
 * Gets the whitespace-separated aria-owns ids from a JSX attribute list.
 *
 * @param attributes The JSX attributes on the current element.
 * @return The owned ids.
 */
function getAriaOwnsIds(attributes: JSXOpeningElement['attributes']): string[] {
  const value = getNonEmptyStringAttributeValue(attributes, 'aria-owns');
  return value === null ? [] : value.split(/\s+/);
}

/**
 * Gets a non-empty static string attribute value.
 *
 * @param attributes The JSX attributes on the current element.
 * @param name The attribute name to resolve.
 * @return The static string value, if any.
 */
function getNonEmptyStringAttributeValue(
  attributes: JSXOpeningElement['attributes'],
  name: string,
): string | null {
  const prop = getProp(attributes, name);
  if (!prop) {
    return null;
  }

  const value = getLiteralPropValue(prop);
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
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

/**
 * Checks if the element is part of a custom composite widget pattern.
 *
 * Suppresses two categories of roles:
 * - Container roles (table, grid, listbox) when they have descendant child roles
 * - Child roles (row, option, etc.) when they have an ancestor container role
 *
 * No element-name restriction: any HTML tag (div, ul, li, span, etc.) qualifies.
 */
function isCustomCompositeWidget(role: string, node: TSESTree.JSXOpeningElement): boolean {
  if (COMPOSITE_CONTAINER_ROLES.has(role)) {
    return hasDescendantCompositeChildRole(node);
  }

  if (COMPOSITE_CHILD_ROLES.has(role)) {
    return hasAncestorCompositeContainerRole(node);
  }

  return false;
}

/**
 * Checks if the element has any descendant with a COMPOSITE_CHILD_ROLE.
 */
function hasDescendantCompositeChildRole(node: TSESTree.JSXOpeningElement): boolean {
  const jsxElement = node.parent;
  if (jsxElement?.type !== 'JSXElement') {
    return false;
  }
  return hasCompositeChildRoleInSubtree(jsxElement);
}

/**
 * Recursively searches the JSX subtree for elements with COMPOSITE_CHILD_ROLES.
 */
function hasCompositeChildRoleInSubtree(node: TSESTree.JSXElement): boolean {
  for (const child of node.children) {
    if (child.type === 'JSXElement') {
      const childRole = getJSXElementRole(child);
      if (childRole && COMPOSITE_CHILD_ROLES.has(childRole)) {
        return true;
      }
      if (hasCompositeChildRoleInSubtree(child)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Gets the role attribute value from a JSXElement.
 */
function getJSXElementRole(element: TSESTree.JSXElement): string | null {
  return getJSXOpeningElementRole(element.openingElement);
}

/**
 * Gets the role attribute value from a JSXOpeningElement.
 */
function getJSXOpeningElementRole(element: TSESTree.JSXOpeningElement): string | null {
  const attributes = (element as JSXOpeningElement).attributes;
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
