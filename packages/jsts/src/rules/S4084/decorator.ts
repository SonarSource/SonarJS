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
 * Recursively checks if a node contains track-related components
 */
function checkNodeForTrackComponent(node: TSESTree.Node): boolean {
  if (node.type !== 'JSXElement') {
    return false;
  }

  // After the type guard, TypeScript knows node is TSESTree.JSXElement
  const elementName = getJSXElementName(node);

  if (isReactComponent(elementName) && isTrackRelatedComponentName(elementName)) {
    return true;
  }

  // Recursively check children - filter for JSXElement nodes first
  return (
    node.children?.some(
      child => child.type === 'JSXElement' && checkNodeForTrackComponent(child),
    ) ?? false
  );
}

/**
 * Checks if a JSX element contains components that might provide track-related content
 * This handles React component composition patterns where track elements are provided
 * through custom components like <CAVVideoSubtitles /> or <Subtitles />
 *
 * Note: We intentionally do NOT check for actual <track> elements here, as those
 * should be handled by the underlying rule from eslint-plugin-jsx-a11y
 */
function hasTrackRelatedComponent(jsxElement: TSESTree.JSXElement): boolean {
  return jsxElement.children?.some(checkNodeForTrackComponent) ?? false;
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

      // Skip reporting if the media element has track-related components
      // (but still report for actual <track> elements or conditional tracks)
      if (jsxElement?.type === 'JSXElement' && hasTrackRelatedComponent(jsxElement)) {
        return;
      }

      context.report({ ...descriptor, node: name });
    },
  );
}
