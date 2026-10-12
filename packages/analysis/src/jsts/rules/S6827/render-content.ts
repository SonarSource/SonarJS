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
import { parseDocument } from 'htmlparser2';
import { getFullyQualifiedName } from '../helpers/module.js';
import {
  getUniqueWriteReference,
  getVariableFromName,
  getStaticExpressionValue,
  unwrapTypeScriptExpression,
} from '../helpers/ast.js';
import { hasAccessibleNameAttribute } from '../helpers/accessibility.js';

const SHADCN_COMPONENTS: Record<string, readonly string[]> = {
  button: ['Button'],
  badge: ['Badge'],
  sidebar: ['SidebarMenuButton', 'SidebarMenuSubButton'],
};

/**
 * Checks whether a render-element anchor receives content from a supported consumer.
 * @param opening the reported anchor
 * @param context the rule context
 * @return whether the consumer supplies accessible content
 */
export function hasRenderContent(
  opening: TSESTree.JSXOpeningElement,
  context: Rule.RuleContext,
): boolean {
  const anchor = opening.parent;
  if (anchor.children.length > 0) {
    return false;
  }
  let current: TSESTree.Node = anchor;
  while (
    (current.parent?.type === 'ConditionalExpression' &&
      (current.parent.consequent === current || current.parent.alternate === current)) ||
    (current.parent && unwrapTypeScriptExpression(current.parent) === current)
  ) {
    current = current.parent;
  }
  const container = current.parent;
  const attribute = container?.parent;
  if (
    container?.type !== 'JSXExpressionContainer' ||
    attribute?.type !== 'JSXAttribute' ||
    attribute.name.type !== 'JSXIdentifier' ||
    attribute.name.name !== 'render'
  ) {
    return false;
  }
  const consumer = attribute.parent.parent;
  const anchorAttributes = (opening as JSXOpeningElement).attributes;
  const attributes = [
    ...(consumer.openingElement as JSXOpeningElement).attributes,
    ...anchorAttributes,
  ];
  const children = getEffectiveAttribute(anchorAttributes, 'children', context);
  return (
    isCompositionComponent(consumer.openingElement, context) &&
    !isHidden(attributes, context) &&
    hasContentProps(attributes, children === null ? consumer.children : [], context, new Set())
  );
}

/**
 * Converts a JSX component name to an expression for import resolution.
 * @param name the JSX tag name
 * @return the corresponding expression, when supported
 */
function componentExpression(name: TSESTree.JSXTagNameExpression): estree.Expression | undefined {
  if (name.type === 'JSXIdentifier') {
    return { type: 'Identifier', name: name.name };
  }
  if (name.type === 'JSXMemberExpression') {
    const object = componentExpression(name.object);
    if (object) {
      return {
        type: 'MemberExpression',
        object,
        computed: false,
        optional: false,
        property: { type: 'Identifier', name: name.property.name },
      };
    }
  }
  return undefined;
}

/**
 * Checks the imported Base UI or conventional local shadcn composition contract.
 * @param opening the consumer opening element
 * @param context the rule context
 * @return whether this component forwards content to its render element
 */
function isCompositionComponent(
  opening: TSESTree.JSXOpeningElement,
  context: Rule.RuleContext,
): boolean {
  const expression = componentExpression(opening.name);
  const name =
    expression &&
    getFullyQualifiedName(
      context,
      expression,
      [],
      context.sourceCode.getScope(opening as unknown as estree.Node),
    );
  if (!name) {
    return false;
  }
  if (/^@base-ui(?:-components)?\.react\.(?:button\.)?Button$/.test(name)) {
    return true;
  }
  // shadcn ships these wrappers as application source rather than as an npm package.
  const local = /^(?:\.|[@~#]\.|components\.|src\.|registry\.|@workspace\.)/.test(name);
  const match =
    /(?:^|\.)ui\.(?:components\.)?(button|badge|sidebar)(?:\.(?:jsx?|tsx?))?\.([^.]+)$/.exec(name);
  return local && !!match && SHADCN_COMPONENTS[match[1]].includes(match[2]);
}

/**
 * Checks an element's effective explicit content, excluding hidden subtrees.
 * @param element the JSX element
 * @param context the rule context
 * @param seen expressions already visited
 * @return whether the element can supply accessible content
 */
function hasElementContent(
  element: TSESTree.JSXElement,
  context: Rule.RuleContext,
  seen: Set<TSESTree.Node>,
): boolean {
  const attributes = (element.openingElement as JSXOpeningElement).attributes;
  if (isHidden(attributes, context)) {
    return false;
  }
  const name = element.openingElement.name;
  if (
    name.type === 'JSXMemberExpression' ||
    (name.type === 'JSXIdentifier' && /^[A-Z]/.test(name.name))
  ) {
    return true;
  }
  if (
    element.openingElement.name.type === 'JSXIdentifier' &&
    element.openingElement.name.name === 'img' &&
    hasAttributeContent(attributes, 'alt', context)
  ) {
    return true;
  }
  return hasContentProps(attributes, element.children, context, seen);
}

function hasContentProps(
  attributes: JSXOpeningElement['attributes'],
  children: TSESTree.JSXElement['children'],
  context: Rule.RuleContext,
  seen: Set<TSESTree.Node>,
): boolean {
  if (
    ['title', 'aria-label', 'aria-labelledby'].some(name =>
      hasAttributeContent(attributes, name, context),
    )
  ) {
    return true;
  }
  const innerHtml = getEffectiveAttribute(attributes, 'dangerouslySetInnerHTML', context);
  if (innerHtml === undefined) {
    return true;
  }
  if (innerHtml?.value) {
    const expression =
      innerHtml.value.type === 'JSXExpressionContainer'
        ? innerHtml.value.expression
        : innerHtml.value;
    const html = getSpreadValue(expression as TSESTree.Node, '__html', context, new Set());
    if (html === undefined || (html !== null && hasHtmlContent(html, context, seen))) {
      return true;
    }
  }
  if (children.length > 0) {
    return children.some(child => hasContent(child, context, seen));
  }
  const childrenAttribute = getEffectiveAttribute(attributes, 'children', context);
  return (
    childrenAttribute === undefined ||
    (!!childrenAttribute?.value &&
      hasContent(childrenAttribute.value as TSESTree.Node, context, seen))
  );
}

function hasHtmlContent(
  node: TSESTree.Node,
  context: Rule.RuleContext,
  seen: Set<TSESTree.Node>,
): boolean {
  const value = resolveContentValue(node, context);
  if (value.type !== 'Literal' || typeof value.value !== 'string') {
    return hasContent(value, context, seen);
  }
  const pending = [...parseDocument(value.value).children];
  for (const child of pending) {
    if (child.type === 'text' && child.data.trim() !== '') {
      return true;
    }
    if ('attribs' in child) {
      if (
        'hidden' in child.attribs ||
        child.attribs['aria-hidden'] === 'true' ||
        ['script', 'style'].includes(child.name)
      ) {
        continue;
      }
      if (
        ['title', 'aria-label', 'aria-labelledby', ...(child.name === 'img' ? ['alt'] : [])].some(
          name => child.attribs[name]?.trim(),
        )
      ) {
        return true;
      }
    }
    if ('children' in child) {
      pending.push(...child.children);
    }
  }
  return false;
}

function isHidden(attributes: JSXOpeningElement['attributes'], context: Rule.RuleContext): boolean {
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
  const resolved = resolveContentValue(value as TSESTree.Node, context);
  return resolved.type === 'Literal'
    ? resolved.value
    : resolved.type === 'TemplateLiteral'
      ? getStaticExpressionValue(resolved as unknown as estree.Expression)
      : undefined;
}

function hasAttributeContent(
  attributes: JSXOpeningElement['attributes'],
  name: string,
  context: Rule.RuleContext,
): boolean {
  const attribute = getEffectiveAttribute(attributes, name, context);
  return attribute === undefined || (!!attribute && hasAccessibleNameAttribute([attribute], name));
}

// null means absent; undefined means an unresolved spread may supply or override the property.
function getEffectiveAttribute(
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

function getSpreadValue(
  argument: TSESTree.Node,
  name: string,
  context: Rule.RuleContext,
  seen: Set<TSESTree.Node>,
): TSESTree.Node | null | undefined {
  const value = resolveContentValue(argument, context);
  if (['Literal', 'TemplateLiteral', 'ArrayExpression'].includes(value.type)) {
    return null;
  }
  if (value.type !== 'ObjectExpression' || seen.has(value)) {
    return undefined;
  }
  seen.add(value);
  for (let i = value.properties.length - 1; i >= 0; i--) {
    const property = value.properties[i];
    if (property.type === 'SpreadElement') {
      const spread = getSpreadValue(property.argument, name, context, seen);
      if (spread !== null) {
        return spread;
      }
    } else {
      const key = property.computed ? resolveContentValue(property.key, context) : property.key;
      if (
        key.type === 'Literal'
          ? key.value === name
          : !property.computed && key.type === 'Identifier' && key.name === name
      ) {
        return property.kind === 'init' && !property.method ? property.value : undefined;
      }
      if (property.computed && key.type !== 'Literal') {
        return undefined;
      }
    }
  }
  seen.delete(value);
  return null;
}

/**
 * Resolves single-write variable aliases without assuming parameter defaults.
 * @param node the content expression
 * @param context the rule context
 * @return the resolved expression, or the original unresolved value
 */
function resolveContentValue(node: TSESTree.Node, context: Rule.RuleContext): TSESTree.Node {
  const seen = new Set<TSESTree.Node>();
  let value = unwrapTypeScriptExpression(node);
  while (value.type === 'Identifier' && !seen.has(value)) {
    seen.add(value);
    const variable = getVariableFromName(context, value.name, value as unknown as estree.Node);
    const definition = variable?.defs[0];
    const write =
      variable?.defs.length === 1 &&
      definition?.type === 'Variable' &&
      definition.node.id.type === 'Identifier'
        ? getUniqueWriteReference(variable)
        : undefined;
    if (!write) {
      break;
    }
    value = unwrapTypeScriptExpression(write as TSESTree.Node);
  }
  return value;
}

/**
 * Checks whether a content expression can render accessible text or elements.
 * @param node the content node
 * @param context the rule context
 * @param seen expressions already visited
 * @return whether the node can provide content
 */
function hasContent(
  node: TSESTree.Node,
  context: Rule.RuleContext,
  seen: Set<TSESTree.Node>,
): boolean {
  const value = resolveContentValue(node, context);
  if (seen.has(value)) {
    return false;
  }
  seen.add(value);
  switch (value.type) {
    case 'JSXText':
      return value.value.trim() !== '';
    case 'Literal':
      return (
        typeof value.value === 'number' ||
        (typeof value.value === 'string' && value.value.trim() !== '')
      );
    case 'JSXElement':
      return hasElementContent(value, context, seen);
    case 'JSXFragment':
      return value.children.some(child => hasContent(child, context, seen));
    case 'JSXExpressionContainer':
      return hasContent(value.expression, context, seen);
    case 'JSXEmptyExpression':
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
    case 'ObjectExpression':
      return false;
    case 'Identifier':
      return value.name !== 'undefined';
    case 'ArrayExpression':
      return value.elements.some(child => child && hasContent(child, context, seen));
    case 'ConditionalExpression': {
      const test = resolveContentValue(value.test, context);
      if (test.type === 'Literal') {
        return hasContent(test.value ? value.consequent : value.alternate, context, seen);
      }
      return (
        hasContent(value.consequent, context, seen) || hasContent(value.alternate, context, seen)
      );
    }
    case 'LogicalExpression': {
      const left = resolveContentValue(value.left, context);
      if (left.type === 'Literal') {
        const useLeft =
          value.operator === '??'
            ? left.value != null
            : value.operator === '&&'
              ? !left.value
              : !!left.value;
        return hasContent(useLeft ? left : value.right, context, seen);
      }
      return (
        (value.operator !== '&&' && hasContent(value.left, context, seen)) ||
        hasContent(value.right, context, seen)
      );
    }
    case 'TemplateLiteral':
      return value.quasis.some(quasi => quasi.value.cooked?.trim()) || value.expressions.length > 0;
    case 'UnaryExpression':
      return !['void', '!', 'delete'].includes(value.operator);
    case 'BinaryExpression':
      return !['in', 'instanceof', '<', '>', '<=', '>=', '==', '!=', '===', '!=='].includes(
        value.operator,
      );
    case 'SequenceExpression':
      return hasContent(value.expressions[value.expressions.length - 1], context, seen);
    default:
      return true;
  }
}
