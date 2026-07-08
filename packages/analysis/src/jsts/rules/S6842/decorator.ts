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
import type { JSXOpeningElement } from 'estree-jsx';
import pkg from 'jsx-ast-utils-x';
const { getProp, getLiteralPropValue } = pkg;
import { interceptReportForReact } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getElementType } from '../helpers/accessibility.js';
import * as meta from './generated-meta.js';

// Elements that the ARIA in HTML conformance table lets take any role.
const ANY_ROLE_ELEMENTS = new Set([
  'abbr',
  'address',
  'blockquote',
  'code',
  'del',
  'dfn',
  'em',
  'ins',
  'mark',
  'output',
  'p',
  'pre',
  'ruby',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'tfoot',
  'thead',
  'time',
]);

// Interactive roles allowed on an <img> that exposes an accessible name.
const IMG_ROLES = new Set([
  'button',
  'checkbox',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'progressbar',
  'radio',
  'scrollbar',
  'slider',
  'switch',
  'tab',
  'treeitem',
]);

const LIST_CONTAINER_ELEMENTS = new Set(['ul', 'ol', 'menu']);

const LABELABLE_CONTROLS = new Set([
  'button',
  'input',
  'meter',
  'output',
  'progress',
  'select',
  'textarea',
]);

/**
 * Decorates the jsx-a11y `no-noninteractive-element-to-interactive-role` rule so that
 * the element/role combinations the ARIA in HTML conformance table permits are not
 * reported. config.ts keeps the flat, spec-derived allowlists; this decorator handles
 * what the allowlist cannot express: elements that accept any role, the context-sensitive
 * elements (li, img, figure, label) and the `toolbar` structure role.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      const opening = openingElementOf(reportDescriptor);
      if (opening === undefined) {
        context.report(reportDescriptor);
        return;
      }
      const tag = getElementType(context)(opening).toLowerCase();
      const roleValue = getLiteralPropValue(getProp(attributesOf(opening), 'role'));
      const role = typeof roleValue === 'string' ? roleValue.toLowerCase() : '';
      if (isRoleAllowedBySpec(context, opening, tag, role)) {
        return;
      }
      context.report(reportDescriptor);
    },
  );
}

function attributesOf(opening: TSESTree.JSXOpeningElement): JSXOpeningElement['attributes'] {
  return (opening as unknown as JSXOpeningElement).attributes;
}

function openingElementOf(
  reportDescriptor: Rule.ReportDescriptor,
): TSESTree.JSXOpeningElement | undefined {
  if (!('node' in reportDescriptor) || !reportDescriptor.node) {
    return undefined;
  }
  const node = reportDescriptor.node as TSESTree.Node;
  if (node.type === 'JSXAttribute') {
    return node.parent as TSESTree.JSXOpeningElement;
  }
  if (node.type === 'JSXOpeningElement') {
    return node;
  }
  return undefined;
}

function isRoleAllowedBySpec(
  context: Rule.RuleContext,
  opening: TSESTree.JSXOpeningElement,
  tag: string,
  role: string,
): boolean {
  // `toolbar` is a structure role, not a widget role.
  if (role === 'toolbar') {
    return true;
  }
  if (ANY_ROLE_ELEMENTS.has(tag)) {
    return true;
  }
  switch (tag) {
    case 'li':
      return !parentExposesListRole(context, opening);
    case 'img':
      return hasAccessibleName(opening) && IMG_ROLES.has(role);
    case 'figure':
      return !hasFigcaptionChild(context, opening);
    case 'label':
      return !isAssociatedLabel(context, opening);
    default:
      return false;
  }
}

// A list item is restricted to listitem only when its parent still exposes the list role.
function parentExposesListRole(
  context: Rule.RuleContext,
  opening: TSESTree.JSXOpeningElement,
): boolean {
  const parent = opening.parent?.parent;
  if (parent?.type !== 'JSXElement') {
    return false;
  }
  const parentOpening = parent.openingElement;
  const parentRole = getLiteralPropValue(getProp(attributesOf(parentOpening), 'role'));
  if (typeof parentRole === 'string' && parentRole !== '') {
    return parentRole.toLowerCase() === 'list';
  }
  return LIST_CONTAINER_ELEMENTS.has(getElementType(context)(parentOpening).toLowerCase());
}

// An img exposes an accessible name via non-empty alt, aria-label or aria-labelledby.
function hasAccessibleName(opening: TSESTree.JSXOpeningElement): boolean {
  return (
    hasNonEmptyAttribute(opening, 'alt') ||
    hasNonEmptyAttribute(opening, 'aria-label') ||
    hasNonEmptyAttribute(opening, 'aria-labelledby')
  );
}

function hasNonEmptyAttribute(opening: TSESTree.JSXOpeningElement, name: string): boolean {
  const value = getLiteralPropValue(getProp(attributesOf(opening), name));
  return typeof value === 'string' && value.length > 0;
}

// A figure caption must be the first or last child of the figure per the HTML content model.
function hasFigcaptionChild(
  context: Rule.RuleContext,
  opening: TSESTree.JSXOpeningElement,
): boolean {
  const element = opening.parent;
  if (element?.type !== 'JSXElement') {
    return false;
  }
  const elementChildren = element.children.filter(
    (child): child is TSESTree.JSXElement => child.type === 'JSXElement',
  );
  if (elementChildren.length === 0) {
    return false;
  }
  const first = elementChildren[0];
  const last = elementChildren[elementChildren.length - 1];
  return isFigcaption(context, first) || isFigcaption(context, last);
}

function isFigcaption(context: Rule.RuleContext, element: TSESTree.JSXElement): boolean {
  return getElementType(context)(element.openingElement).toLowerCase() === 'figcaption';
}

// A label is associated when it references a control via for/htmlFor or wraps a labelable control.
function isAssociatedLabel(
  context: Rule.RuleContext,
  opening: TSESTree.JSXOpeningElement,
): boolean {
  if (getProp(attributesOf(opening), 'for') || getProp(attributesOf(opening), 'htmlFor')) {
    return true;
  }
  const element = opening.parent;
  return element?.type === 'JSXElement' && containsLabelableControl(context, element);
}

function containsLabelableControl(
  context: Rule.RuleContext,
  element: TSESTree.JSXElement,
): boolean {
  return element.children.some(child => {
    if (child.type !== 'JSXElement') {
      return false;
    }
    const tag = getElementType(context)(child.openingElement).toLowerCase();
    return LABELABLE_CONTROLS.has(tag) || containsLabelableControl(context, child);
  });
}
