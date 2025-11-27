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
// https://sonarsource.github.io/rspec/#/rspec/S4084/javascript

import type { Rule } from 'eslint';
import type { Node } from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, interceptReport } from '../helpers/index.js';
import * as meta from './generated-meta.js';

/**
 * Checks if a component name suggests it provides track-related content
 */
function isTrackRelatedComponentName(componentName: string): boolean {
  const lowerName = componentName.toLowerCase();
  return (
    lowerName.includes('track') || lowerName.includes('subtitle') || lowerName.includes('caption')
  );
}

/**
 * Checks if an identifier name suggests track-related data
 */
function isTrackRelatedIdentifier(name: string): boolean {
  const lowerName = name.toLowerCase();
  return (
    lowerName.includes('track') ||
    lowerName.includes('subtitle') ||
    lowerName.includes('caption') ||
    lowerName.includes('cc') ||
    lowerName.includes('vtt')
  );
}

/**
 * Checks if a JSX element is a React component (starts with uppercase)
 */
function isReactComponent(elementName: string): boolean {
  return elementName.length > 0 && /^[A-Z]/.test(elementName);
}

/**
 * Checks if a node is a valid type node (object with type property)
 */
function isValidTypeNode(value: unknown): value is TSESTree.Node {
  return typeof value === 'object' && value !== null && 'type' in value;
}

/**
 * Checks if a member expression has a track-related identifier
 */
function checkMemberExpression(node: TSESTree.MemberExpression): boolean {
  const hasTrackProperty =
    node.property.type === 'Identifier' && isTrackRelatedIdentifier(node.property.name);
  const hasTrackObject = isValidTypeNode(node.object) && hasTrackRelatedIdentifier(node.object);
  return hasTrackProperty || hasTrackObject;
}

/**
 * Checks if a call expression has track-related identifiers
 */
function checkCallExpression(node: TSESTree.CallExpression): boolean {
  const hasTrackCallee = isValidTypeNode(node.callee) && hasTrackRelatedIdentifier(node.callee);
  const hasTrackArgs = node.arguments.some(
    arg => isValidTypeNode(arg) && hasTrackRelatedIdentifier(arg),
  );
  return hasTrackCallee || hasTrackArgs;
}

/**
 * Checks if an array expression has track-related identifiers
 */
function checkArrayExpression(node: TSESTree.ArrayExpression): boolean {
  return node.elements.some(
    element => element !== null && isValidTypeNode(element) && hasTrackRelatedIdentifier(element),
  );
}

/**
 * Checks if a logical expression has track-related identifiers
 */
function checkLogicalExpression(node: TSESTree.LogicalExpression): boolean {
  return (
    (isValidTypeNode(node.left) && hasTrackRelatedIdentifier(node.left)) ||
    (isValidTypeNode(node.right) && hasTrackRelatedIdentifier(node.right))
  );
}

/**
 * Checks if a conditional expression has track-related identifiers
 */
function checkConditionalExpression(node: TSESTree.ConditionalExpression): boolean {
  return (
    (isValidTypeNode(node.consequent) && hasTrackRelatedIdentifier(node.consequent)) ||
    (isValidTypeNode(node.alternate) && hasTrackRelatedIdentifier(node.alternate))
  );
}

/**
 * Recursively checks if a node contains track-related identifiers or member expressions
 * (e.g., subtitles, file?.subtitles, tracks, captions, etc.)
 */
function hasTrackRelatedIdentifier(node: TSESTree.Node): boolean {
  switch (node.type) {
    case 'Identifier':
      return isTrackRelatedIdentifier(node.name);
    case 'MemberExpression':
      return checkMemberExpression(node);
    case 'ChainExpression':
      return isValidTypeNode(node.expression) && hasTrackRelatedIdentifier(node.expression);
    case 'CallExpression':
      return checkCallExpression(node);
    case 'ArrayExpression':
      return checkArrayExpression(node);
    case 'LogicalExpression':
      return checkLogicalExpression(node);
    case 'ConditionalExpression':
      return checkConditionalExpression(node);
    default:
      return false;
  }
}

/**
 * Checks a JSX element for track-related components
 */
function checkJSXElement(
  node: TSESTree.JSXElement,
  insideExpression: boolean,
  expressionContainsTrackData: boolean,
): boolean {
  const elementName = getJSXElementName(node);

  // Direct <track> elements: acceptable if not inside expressions OR if the expression contains track-related data
  if (elementName === 'track') {
    return !insideExpression || expressionContainsTrackData;
  }

  // React components with track-related names are always acceptable
  if (isReactComponent(elementName) && isTrackRelatedComponentName(elementName)) {
    return true;
  }

  // Check children
  return (
    node.children?.some(child =>
      checkNodeForTrackComponent(child, insideExpression, expressionContainsTrackData),
    ) ?? false
  );
}

/**
 * Checks either side of a binary expression (conditional or logical)
 */
function checkBinaryExpressionSide(
  value: unknown,
  insideExpression: boolean,
  expressionContainsTrackData: boolean,
): boolean {
  return (
    isValidTypeNode(value) &&
    checkNodeForTrackComponent(value, insideExpression, expressionContainsTrackData)
  );
}

/**
 * Checks if a node contains children with track components
 */
function checkNodeChildren(
  children: TSESTree.Node[],
  insideExpression: boolean,
  expressionContainsTrackData: boolean,
): boolean {
  return children.some(child =>
    checkNodeForTrackComponent(child, insideExpression, expressionContainsTrackData),
  );
}

/**
 * Recursively checks if a node contains track-related components or actual track elements.
 * Returns true only for:
 * 1. Direct <track> elements (not inside expressions/conditionals)
 * 2. <track> elements inside expressions that reference track-related data (e.g., file?.subtitles?.map())
 * 3. React components with track-related names
 *
 * @param node - The node to check
 * @param insideExpression - Whether we're currently inside a JSXExpressionContainer
 * @param expressionContainsTrackData - Whether the current expression contains track-related identifiers
 */
function checkNodeForTrackComponent(
  node: TSESTree.Node,
  insideExpression = false,
  expressionContainsTrackData = false,
): boolean {
  switch (node.type) {
    case 'JSXElement':
      return checkJSXElement(node, insideExpression, expressionContainsTrackData);
    case 'JSXFragment':
      return node.children
        ? checkNodeChildren(node.children, insideExpression, expressionContainsTrackData)
        : false;
    case 'JSXExpressionContainer':
      if (!isValidTypeNode(node.expression)) return false;
      return checkNodeForTrackComponent(
        node.expression,
        true,
        hasTrackRelatedIdentifier(node.expression),
      );
    case 'ConditionalExpression':
      return (
        checkBinaryExpressionSide(node.consequent, insideExpression, expressionContainsTrackData) ||
        checkBinaryExpressionSide(node.alternate, insideExpression, expressionContainsTrackData)
      );
    case 'LogicalExpression':
      return (
        checkBinaryExpressionSide(node.left, insideExpression, expressionContainsTrackData) ||
        checkBinaryExpressionSide(node.right, insideExpression, expressionContainsTrackData)
      );
    case 'ChainExpression':
      return isValidTypeNode(node.expression)
        ? checkNodeForTrackComponent(node.expression, insideExpression, expressionContainsTrackData)
        : false;
    default:
      // Handle function bodies
      if ('body' in node && isValidTypeNode(node.body)) {
        return checkNodeForTrackComponent(node.body, insideExpression, expressionContainsTrackData);
      }
      // Handle call expression arguments
      if ('arguments' in node && Array.isArray(node.arguments)) {
        return (node.arguments as TSESTree.Node[]).some(arg =>
          checkNodeForTrackComponent(arg, insideExpression, expressionContainsTrackData),
        );
      }
      return false;
  }
}

/**
 * Checks if a JSX element contains components or elements that might provide track-related content
 * This handles React component composition patterns where track elements are provided
 * through custom components like <CAVVideoSubtitles /> or <Subtitles />, or through
 * direct <track> elements (not conditional ones in expressions).
 *
 * We check for:
 * 1. React components with track/subtitle/caption in the name (even if conditional)
 * 2. Direct <track> elements that are not inside expressions/conditionals
 * 3. Conditional <track> elements inside expressions that reference track-related data
 *    (e.g., file?.subtitles?.map(() => <track />))
 *
 * We intentionally do NOT suppress issues for conditional tracks in expressions
 * that don't reference track-related data. For example:
 * - {file?.subtitles?.map(() => <track />)} - Not reported (has subtitle data reference)
 * - {arr.map(() => <track />)} - Still reported (no track data reference, array might be empty)
 * - <track kind="captions" /> - Not reported (direct track element)
 * - <TrackComponent /> - Not reported (component encapsulates track logic)
 */
function hasTrackRelatedComponent(jsxElement: TSESTree.JSXElement): boolean {
  return (
    jsxElement.children?.some(child => checkNodeForTrackComponent(child, false, false)) ?? false
  );
}

/**
 * Gets the name of a JSX element as a string
 */
function getJSXElementName(element: TSESTree.JSXElement): string {
  const name = element.openingElement.name;
  if (name.type === 'JSXIdentifier') {
    return name.name;
  }
  if (name.type === 'JSXMemberExpression') {
    // Handle cases like <Foo.Bar>
    return getJSXMemberExpressionName(name);
  }
  return '';
}

/**
 * Gets the full name of a JSX member expression (e.g., "Foo.Bar.Baz")
 */
function getJSXMemberExpressionName(expr: TSESTree.JSXMemberExpression): string {
  const property = expr.property.name;
  const objectName =
    expr.object.type === 'JSXIdentifier'
      ? expr.object.name
      : expr.object.type === 'JSXMemberExpression'
        ? getJSXMemberExpressionName(expr.object)
        : null;
  return objectName ? `${objectName}.${property}` : property;
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, descriptor) => {
      const { node } = descriptor as unknown as { node: TSESTree.JSXOpeningElement };
      const name = node.name as unknown as Node;

      // Get the parent JSXElement to check for children (JS-631)
      // Don't report if the media element has track-related components
      // This handles React component composition patterns where track elements
      // are provided through components like <CAVVideoSubtitles />
      const sourceCode = context.sourceCode;
      const ancestors = sourceCode.getAncestors?.(node as unknown as Node) ?? [];

      // The parent of JSXOpeningElement should be JSXElement
      const jsxElement = ancestors.at(-1) as TSESTree.JSXElement | undefined;

      // Only report if the media element does NOT have track-related components
      // (still report for conditional tracks in expressions, but not for track-related React components)
      const shouldReport =
        jsxElement?.type !== 'JSXElement' || !hasTrackRelatedComponent(jsxElement);

      if (shouldReport) {
        context.report({ ...descriptor, node: name });
      }
    },
  );
}
