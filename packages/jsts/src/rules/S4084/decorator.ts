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
 * Checks a JSX element for track-related components
 */
function checkJSXElement(node: TSESTree.JSXElement, insideExpression: boolean): boolean {
  const elementName = getJSXElementName(node);

  // Direct <track> elements are only acceptable when not inside expressions
  if (elementName === 'track') {
    return !insideExpression;
  }

  // React components with track-related names are always acceptable
  if (isReactComponent(elementName) && isTrackRelatedComponentName(elementName)) {
    return true;
  }

  // Check children
  return node.children?.some(child => checkNodeForTrackComponent(child, insideExpression)) ?? false;
}

/**
 * Checks either side of a binary expression (conditional or logical)
 */
function checkBinaryExpressionSide(value: unknown, insideExpression: boolean): boolean {
  return isValidTypeNode(value) && checkNodeForTrackComponent(value, insideExpression);
}

/**
 * Recursively checks if a node contains track-related components or actual track elements.
 * Returns true only for:
 * 1. Direct <track> elements (not inside expressions/conditionals)
 * 2. React components with track-related names
 *
 * @param node - The node to check
 * @param insideExpression - Whether we're currently inside a JSXExpressionContainer
 */
function checkNodeForTrackComponent(node: TSESTree.Node, insideExpression = false): boolean {
  // Handle JSX elements
  if (node.type === 'JSXElement') {
    return checkJSXElement(node, insideExpression);
  }

  // Handle JSX fragments
  if (node.type === 'JSXFragment') {
    return (
      node.children?.some(child => checkNodeForTrackComponent(child, insideExpression)) ?? false
    );
  }

  // Handle JSX expressions
  if (node.type === 'JSXExpressionContainer' && isValidTypeNode(node.expression)) {
    return checkNodeForTrackComponent(node.expression, true);
  }

  // Handle conditional expressions
  if (node.type === 'ConditionalExpression') {
    return (
      checkBinaryExpressionSide(node.consequent, insideExpression) ||
      checkBinaryExpressionSide(node.alternate, insideExpression)
    );
  }

  // Handle logical expressions
  if (node.type === 'LogicalExpression') {
    return (
      checkBinaryExpressionSide(node.left, insideExpression) ||
      checkBinaryExpressionSide(node.right, insideExpression)
    );
  }

  // Handle function bodies
  if ('body' in node && isValidTypeNode(node.body)) {
    return checkNodeForTrackComponent(node.body, insideExpression);
  }

  // Handle call expression arguments
  if ('arguments' in node && Array.isArray(node.arguments)) {
    return (node.arguments as TSESTree.Node[]).some(arg =>
      checkNodeForTrackComponent(arg, insideExpression),
    );
  }

  return false;
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
 *
 * We intentionally do NOT suppress issues for conditional tracks in expressions,
 * as those may not render and represent true accessibility issues. For example:
 * - {arr.map(() => <track />)} - Still reported (array might be empty)
 * - <track kind="captions" /> - Not reported (direct track element)
 * - <TrackComponent /> - Not reported (component encapsulates track logic)
 */
function hasTrackRelatedComponent(jsxElement: TSESTree.JSXElement): boolean {
  return jsxElement.children?.some(child => checkNodeForTrackComponent(child, false)) ?? false;
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
  if (expr.object.type === 'JSXIdentifier') {
    return `${expr.object.name}.${property}`;
  }
  if (expr.object.type === 'JSXMemberExpression') {
    return `${getJSXMemberExpressionName(expr.object)}.${property}`;
  }
  return property;
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
        !jsxElement || jsxElement.type !== 'JSXElement' || !hasTrackRelatedComponent(jsxElement);

      if (shouldReport) {
        context.report({ ...descriptor, node: name });
      }
    },
  );
}
