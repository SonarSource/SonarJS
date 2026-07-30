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
import type { JSXAttribute, JSXOpeningElement } from 'estree-jsx';
import type { Rule } from 'eslint';
import pkg from 'jsx-ast-utils-x';
const { getProp, getLiteralPropValue, getPropValue, elementType } = pkg;

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

export function getRole(node: TSESTree.JSXOpeningElement): string | null {
  const roleProp = getProp((node as JSXOpeningElement).attributes, 'role');
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
