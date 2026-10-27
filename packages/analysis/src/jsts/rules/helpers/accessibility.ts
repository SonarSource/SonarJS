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
import { roles } from 'aria-query';
import type { JSXAttribute, JSXOpeningElement } from 'estree-jsx';
import type { Rule } from 'eslint';
import type estree from 'estree';
import pkg from 'jsx-ast-utils-x';
import { getProperty, getValueOfExpression } from './ast.js';
import { isJsxElementNamed } from './jsx.js';
const { getProp, getLiteralPropValue, getPropValue, elementType } = pkg;

const DISPLAY_NONE_PATTERN = /display\s*:\s*none/i;

const CONCRETE_ROLES = new Set<string>(
  roles
    .entries()
    .filter(([, definition]) => !definition.abstract)
    .map(([name]) => name),
);

/** Returns the first recognized, non-abstract role in an ordered fallback list. */
export function getFirstConcreteRole(roleValue: string): string | undefined {
  return roleValue
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .find(name => CONCRETE_ROLES.has(name));
}

export function isPresentationTable(context: Rule.RuleContext, node: TSESTree.JSXOpeningElement) {
  const DISALLOWED_VALUES = ['presentation', 'none'];
  const type = getElementType(context)(node);
  if (type.toLowerCase() !== 'table') {
    return false;
  }
  const role = getProp((node as JSXOpeningElement).attributes, 'role');
  if (!role) {
    return false;
  }
  const roleValue = String(getLiteralPropValue(role));

  return DISALLOWED_VALUES.includes(roleValue?.toLowerCase());
}

export function getRole(node: TSESTree.JSXOpeningElement): string | undefined {
  const roleProp = getProp((node as JSXOpeningElement).attributes, 'role');
  if (!roleProp) {
    return undefined;
  }
  const roleValue = getLiteralPropValue(roleProp);
  if (typeof roleValue !== 'string') {
    return undefined;
  }
  return roleValue.toLowerCase();
}

/**
 * Checks whether an accessible-name attribute has a statically non-empty or dynamic value.
 */
export function hasAccessibleNameAttribute(
  attributes: JSXOpeningElement['attributes'],
  name: string,
): boolean {
  const attribute = getProp(attributes, name);
  if (!attribute) {
    return false;
  }
  if (
    isNonEmptyStringAttribute(attribute) ||
    isPotentiallyNonEmptyTemplateLiteralAttribute(attribute)
  ) {
    return true;
  }

  // Dynamic expressions are unknown statically, but nullish values should not suppress.
  return getLiteralPropValue(attribute) === null && getPropValue(attribute) != null;
}

function isNonEmptyStringAttribute(attribute: JSXAttribute): boolean {
  if (attribute.value?.type === 'Literal') {
    return typeof attribute.value.value === 'string' && attribute.value.value.trim() !== '';
  }

  if (
    attribute.value?.type === 'JSXExpressionContainer' &&
    attribute.value.expression.type === 'Literal'
  ) {
    return (
      typeof attribute.value.expression.value === 'string' &&
      attribute.value.expression.value.trim() !== ''
    );
  }

  return false;
}

function isPotentiallyNonEmptyTemplateLiteralAttribute(attribute: JSXAttribute): boolean {
  if (
    attribute.value?.type !== 'JSXExpressionContainer' ||
    attribute.value.expression.type !== 'TemplateLiteral'
  ) {
    return false;
  }

  return (
    attribute.value.expression.expressions.length > 0 ||
    attribute.value.expression.quasis.some(quasi => quasi.value.cooked?.trim() !== '')
  );
}

/**
 * Checks whether an element has a direct-child <title> element with non-empty content.
 * Independent of whitespace and of the title's position among its siblings. Not specific
 * to SVG: the caller decides which elements this check applies to.
 */
function hasTitleChild(node: TSESTree.JSXOpeningElement): boolean {
  const parent = node.parent;
  if (parent?.type !== 'JSXElement') {
    return false;
  }
  return parent.children.some(
    child =>
      isJsxElementNamed(child, 'title') &&
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

/**
 * Checks whether an element has an accessible name via aria-labelledby, aria-label, or a
 * direct-child <title> element (in that precedence order). Id references in aria-labelledby
 * are not resolved to their target's text, treated purely as a presence check like aria-label.
 * Not specific to SVG: the caller decides which elements this check applies to.
 */
export function hasAccessibleName(node: TSESTree.JSXOpeningElement): boolean {
  const attributes = (node as JSXOpeningElement).attributes;
  return (
    hasAccessibleNameAttribute(attributes, 'aria-labelledby') ||
    hasAccessibleNameAttribute(attributes, 'aria-label') ||
    hasTitleChild(node)
  );
}

export const getElementType = (
  context: Rule.RuleContext,
): ((node: TSESTree.JSXOpeningElement) => string) => {
  const { settings } = context;
  const jsxa11ySettings = settings['jsx-a11y'] as Record<string, unknown>;
  const polymorphicPropName = jsxa11ySettings?.polymorphicPropName;
  const polymorphicAllowList = jsxa11ySettings?.polymorphicAllowList;

  const componentMap = jsxa11ySettings?.components;

  return (node: TSESTree.JSXOpeningElement): string => {
    const prop = polymorphicPropName
      ? getProp((node as JSXOpeningElement).attributes, polymorphicPropName as string)
      : undefined;
    const polymorphicProp = prop ? getLiteralPropValue(prop) : undefined;

    let rawType = elementType(node as JSXOpeningElement);
    if (
      polymorphicProp &&
      (!polymorphicAllowList || (polymorphicAllowList as string[]).includes(rawType))
    ) {
      rawType = `${polymorphicProp}`;
    }

    if (!componentMap) {
      return rawType;
    }

    return componentMap.hasOwnProperty(rawType)
      ? (componentMap as Record<string, string>)[rawType]
      : rawType;
  };
};

/**
 * Whether the element or an ancestor is hidden via `aria-hidden`, `hidden`, or `display: none`.
 * Unresolvable values count as hidden.
 */
export function isHiddenFromEveryone(
  node: TSESTree.JSXOpeningElement,
  context: Rule.RuleContext,
): boolean {
  let ancestor: TSESTree.Node | undefined = node.parent;
  while (ancestor) {
    if (ancestor.type === 'JSXElement') {
      const attributes = (ancestor.openingElement as JSXOpeningElement).attributes;
      if (getOwnHiddenState(attributes, context) !== false) {
        return true;
      }
    }
    ancestor = ancestor.parent;
  }
  return false;
}

/**
 * Like {@link isHiddenFromEveryone}, but for the element's own attributes only. Returns
 * `undefined` for an unresolvable `aria-hidden` or `hidden`; an unresolvable `style` never hides.
 */
export function getOwnHiddenState(
  attributes: JSXOpeningElement['attributes'],
  context: Rule.RuleContext,
): boolean | undefined {
  const states = [
    resolveHiddenAttribute(attributes, 'aria-hidden', context, isAriaHiddenValue),
    // React renders boolean attributes for any truthy value, e.g. `hidden="false"` still hides.
    resolveHiddenAttribute(attributes, 'hidden', context, Boolean),
    isDisplayNone(attributes, context),
  ];
  if (states.includes(true)) {
    return true;
  }
  return states.includes(undefined) ? undefined : false;
}

function isAriaHiddenValue(value: unknown): boolean {
  return String(value).trim().toLowerCase() === 'true';
}

/** `false` when the attribute is absent, `undefined` when its value can't be resolved. */
function resolveHiddenAttribute(
  attributes: JSXOpeningElement['attributes'],
  name: string,
  context: Rule.RuleContext,
  isHidden: (value: unknown) => boolean,
): boolean | undefined {
  const attribute = getProp(attributes, name) as JSXAttribute | undefined;
  if (!attribute) {
    return false;
  }
  const { value } = attribute;
  if (value === null) {
    return isHidden(true);
  }
  if (value.type === 'Literal') {
    return isHidden(value.value);
  }
  if (value.type === 'JSXExpressionContainer') {
    const literal = getValueOfExpression(
      context,
      value.expression as unknown as estree.Node,
      'Literal',
    );
    if (literal) {
      return isHidden(literal.value);
    }
  }
  return undefined;
}

function isDisplayNone(
  attributes: JSXOpeningElement['attributes'],
  context: Rule.RuleContext,
): boolean {
  const value = (getProp(attributes, 'style') as JSXAttribute | undefined)?.value;
  if (!value) {
    return false;
  }
  if (value.type === 'Literal') {
    return typeof value.value === 'string' && DISPLAY_NONE_PATTERN.test(value.value);
  }
  if (value.type !== 'JSXExpressionContainer') {
    return false;
  }
  const resolvedStyle = getValueOfExpression(
    context,
    value.expression as unknown as estree.Node,
    'ObjectExpression',
  );
  const displayProperty = resolvedStyle && getProperty(resolvedStyle, 'display', context);
  const displayValue =
    displayProperty && getValueOfExpression(context, displayProperty.value, 'Literal');
  return (
    typeof displayValue?.value === 'string' && displayValue.value.trim().toLowerCase() === 'none'
  );
}
