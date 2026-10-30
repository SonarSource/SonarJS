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
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import type { JSXAttribute, JSXOpeningElement } from 'estree-jsx';
import { getStaticExpressionValue, resolveSingleWriteExpression } from '../helpers/ast.js';
import { hasAccessibleNameAttribute } from '../helpers/accessibility.js';

export function isHidden(
  attributes: JSXOpeningElement['attributes'],
  context: Rule.RuleContext,
): boolean {
  const hidden = getAttributeValue(getEffectiveAttribute(attributes, 'hidden', context), context);
  const ariaHidden = getAttributeValue(
    getEffectiveAttribute(attributes, 'aria-hidden', context),
    context,
  );
  return !!hidden || ariaHidden === true || ariaHidden === 'true';
}

function getAttributeValue(
  attribute: JSXAttribute | null | undefined,
  context: Rule.RuleContext,
): unknown {
  if (!attribute) {
    return undefined;
  }
  if (attribute.value === null) {
    return true;
  }
  const value =
    attribute.value.type === 'JSXExpressionContainer'
      ? attribute.value.expression
      : attribute.value;
  return getStaticValue(resolveSingleWriteExpression(context, value as TSESTree.Node));
}

export function getStaticValue(value: TSESTree.Node): unknown {
  if (value.type === 'Literal') {
    return value.value;
  }
  if (value.type === 'TemplateLiteral') {
    return getStaticExpressionValue(value as unknown as estree.Expression);
  }
  return undefined;
}

export function hasAttributeContent(
  attributes: JSXOpeningElement['attributes'],
  name: string,
  context: Rule.RuleContext,
): boolean {
  const attribute = getEffectiveAttribute(attributes, name, context);
  if (attribute === undefined) {
    return true;
  }
  if (!attribute) {
    return false;
  }
  if (attribute.value?.type !== 'JSXExpressionContainer') {
    return hasAccessibleNameAttribute([attribute], name);
  }
  const resolved = resolveSingleWriteExpression(
    context,
    attribute.value.expression as TSESTree.Node,
  );
  const resolvedAttribute = {
    ...attribute,
    value: { ...attribute.value, expression: resolved },
  } as unknown as JSXAttribute;
  return hasAccessibleNameAttribute([resolvedAttribute], name);
}

// null means absent; undefined means an unresolved spread may supply or override the property.
export function getEffectiveAttribute(
  attributes: JSXOpeningElement['attributes'],
  name: string,
  context: Rule.RuleContext,
): JSXAttribute | null | undefined {
  for (let i = attributes.length - 1; i >= 0; i--) {
    const attribute = attributes[i];
    if (attribute.type === 'JSXAttribute') {
      if (attribute.name.type === 'JSXIdentifier' && attribute.name.name === name) {
        return attribute;
      }
    } else {
      const value = getSpreadValue(attribute.argument as TSESTree.Node, name, context, new Set());
      if (value === undefined) {
        return undefined;
      }
      if (value !== null) {
        return {
          type: 'JSXAttribute',
          name: { type: 'JSXIdentifier', name },
          value: { type: 'JSXExpressionContainer', expression: value },
        } as unknown as JSXAttribute;
      }
    }
  }
  return null;
}

export function getSpreadValue(
  argument: TSESTree.Node,
  name: string,
  context: Rule.RuleContext,
  seen: Set<TSESTree.Node>,
): TSESTree.Node | null | undefined {
  const value = resolveSingleWriteExpression(context, argument);
  if (['Literal', 'TemplateLiteral', 'ArrayExpression'].includes(value.type)) {
    return null;
  }
  if (value.type !== 'ObjectExpression' || seen.has(value)) {
    return undefined;
  }
  seen.add(value);
  for (let i = value.properties.length - 1; i >= 0; i--) {
    const property = value.properties[i];
    const result =
      property.type === 'SpreadElement'
        ? getSpreadValue(property.argument, name, context, seen)
        : getPropertyValue(property, name, context);
    if (result !== null) {
      return result;
    }
  }
  seen.delete(value);
  return null;
}

function getPropertyValue(
  property: TSESTree.Property,
  name: string,
  context: Rule.RuleContext,
): TSESTree.Node | null | undefined {
  const key = property.computed
    ? resolveSingleWriteExpression(context, property.key)
    : property.key;
  const matchesName =
    key.type === 'Literal'
      ? key.value === name
      : !property.computed && key.type === 'Identifier' && key.name === name;
  if (matchesName) {
    return property.kind === 'init' && !property.method ? property.value : undefined;
  }
  if (property.computed && key.type !== 'Literal') {
    return undefined;
  }
  return null;
}
