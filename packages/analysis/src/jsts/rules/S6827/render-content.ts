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
  resolveSingleWriteExpression,
  unwrapTypeScriptExpression,
} from '../helpers/ast.js';
import { hasAccessibleNameAttribute } from '../helpers/accessibility.js';
import { getConditionalBranchRoot } from '../helpers/jsx.js';

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
  return hasRenderConsumer(anchor, opening, context, new Set());
}

function hasRenderConsumer(
  node: TSESTree.Node,
  opening: TSESTree.JSXOpeningElement,
  context: Rule.RuleContext,
  seen: Set<TSESTree.Node>,
  completed = new Set<TSESTree.Node>(),
): boolean {
  if (completed.has(node)) {
    return true;
  }
  if (seen.has(node)) {
    return false;
  }
  seen.add(node);
  let current = node;
  while (
    (current.parent && getConditionalBranchRoot(current.parent, current)) ||
    (current.parent &&
      unwrapTypeScriptExpression(current.parent) === unwrapTypeScriptExpression(current))
  ) {
    current = current.parent;
  }
  const write = current.parent;
  const identifier =
    write?.type === 'VariableDeclarator' && write.init === current && write.id.type === 'Identifier'
      ? write.id
      : write?.type === 'AssignmentExpression' &&
          write.operator === '=' &&
          write.right === current &&
          write.left.type === 'Identifier'
        ? write.left
        : undefined;
  if (identifier) {
    const variable = getVariableFromName(
      context,
      identifier.name,
      identifier as unknown as estree.Node,
    );
    const definition = variable?.defs[0];
    if (
      variable?.defs.length !== 1 ||
      definition?.type !== 'Variable' ||
      definition.node.id.type !== 'Identifier' ||
      getUniqueWriteReference(variable) !== current
    ) {
      return false;
    }
    const reads = variable.references.filter(reference => reference.isRead());
    const result =
      reads.length > 0 &&
      reads.every(reference =>
        hasRenderConsumer(
          reference.identifier as TSESTree.Node,
          opening,
          context,
          new Set(seen),
          completed,
        ),
      );
    if (result) {
      completed.add(node);
    }
    return result;
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
  const result =
    isCompositionComponent(consumer.openingElement, context) &&
    !isHidden(attributes, context) &&
    hasContentProps(attributes, children === null ? consumer.children : [], context, new Set());
  if (result) {
    completed.add(node);
  }
  return result;
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
  const value = resolveSingleWriteExpression(context, node);
  if (
    value.type === 'ConditionalExpression' ||
    value.type === 'LogicalExpression' ||
    value.type === 'SequenceExpression'
  ) {
    if (seen.has(value)) {
      return false;
    }
    const branchSeen = new Set(seen);
    branchSeen.add(value);
    if (value.type === 'ConditionalExpression') {
      return hasConditionalContent(value, context, branchSeen, hasHtmlContent);
    }
    if (value.type === 'LogicalExpression') {
      return hasLogicalContent(value, context, branchSeen, hasHtmlContent);
    }
    const last = value.expressions.at(-1);
    return last !== undefined && hasHtmlContent(last, context, branchSeen);
  }
  const html = getStaticExpressionValue(value as unknown as estree.Expression);
  if (html === undefined) {
    return hasContent(value, context, seen);
  }
  return hasHtmlStringContent(html);
}

function hasHtmlStringContent(html: string): boolean {
  const pending = [...parseDocument(html).children];
  for (const child of pending) {
    if (child.type === 'text' && child.data.trim() !== '') {
      return true;
    }
    if ('attribs' in child) {
      if (isHiddenHtmlElement(child.name, child.attribs)) {
        continue;
      }
      if (hasHtmlElementName(child.name, child.attribs)) {
        return true;
      }
    }
    if ('children' in child) {
      pending.push(...child.children);
    }
  }
  return false;
}

function isHiddenHtmlElement(name: string, attributes: Record<string, string>): boolean {
  return (
    'hidden' in attributes ||
    attributes['aria-hidden'] === 'true' ||
    ['script', 'style'].includes(name)
  );
}

function hasHtmlElementName(name: string, attributes: Record<string, string>): boolean {
  const names = ['title', 'aria-label', 'aria-labelledby', ...(name === 'img' ? ['alt'] : [])];
  return names.some(attribute => attributes[attribute]?.trim());
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
  const resolved = resolveSingleWriteExpression(context, value as TSESTree.Node);
  if (resolved.type === 'Literal') {
    return resolved.value;
  }
  if (resolved.type === 'TemplateLiteral') {
    return getStaticExpressionValue(resolved as unknown as estree.Expression);
  }
  return undefined;
}

function hasAttributeContent(
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
  const value = resolveSingleWriteExpression(context, node);
  if (seen.has(value)) {
    return false;
  }
  seen.add(value);
  switch (value.type) {
    case 'JSXText':
      return value.value.trim() !== '';
    case 'Literal':
      return !!getStaticExpressionValue(value as unknown as estree.Expression)?.trim();
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
    case 'ConditionalExpression':
      return hasConditionalContent(value, context, seen);
    case 'LogicalExpression':
      return hasLogicalContent(value, context, seen);
    case 'TemplateLiteral':
      return value.quasis.some(quasi => quasi.value.cooked?.trim()) || value.expressions.length > 0;
    case 'UnaryExpression':
      return !['void', '!', 'delete'].includes(value.operator);
    case 'BinaryExpression':
      return !['in', 'instanceof', '<', '>', '<=', '>=', '==', '!=', '===', '!=='].includes(
        value.operator,
      );
    case 'SequenceExpression': {
      const last = value.expressions.at(-1);
      return last !== undefined && hasContent(last, context, seen);
    }
    default:
      return true;
  }
}

function hasConditionalContent(
  value: TSESTree.ConditionalExpression,
  context: Rule.RuleContext,
  seen: Set<TSESTree.Node>,
  checkContent = hasContent,
): boolean {
  const test = resolveSingleWriteExpression(context, value.test);
  if (test.type === 'Literal') {
    return checkContent(test.value ? value.consequent : value.alternate, context, seen);
  }
  return (
    checkContent(value.consequent, context, seen) || checkContent(value.alternate, context, seen)
  );
}

function hasLogicalContent(
  value: TSESTree.LogicalExpression,
  context: Rule.RuleContext,
  seen: Set<TSESTree.Node>,
  checkContent = hasContent,
): boolean {
  const left = resolveSingleWriteExpression(context, value.left);
  if (left.type !== 'Literal') {
    return (
      (value.operator !== '&&' && checkContent(value.left, context, seen)) ||
      checkContent(value.right, context, seen)
    );
  }
  let useLeft: boolean;
  if (value.operator === '??') {
    useLeft = left.value != null;
  } else if (value.operator === '&&') {
    useLeft = !left.value;
  } else {
    useLeft = !!left.value;
  }
  return checkContent(useLeft ? left : value.right, context, seen);
}
