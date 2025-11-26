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
 * Checks if a JSXElement has any child JSX elements (components or HTML elements)
 * Ignores text, expressions, and other non-JSX children
 */
function hasJSXElementChildren(jsxElement: TSESTree.JSXElement): boolean {
  return Boolean(jsxElement.children?.some(child => child.type === 'JSXElement'));
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
      // Don't report if the media element has child JSX elements, as they may contain track elements
      // This handles React component composition patterns
      const sourceCode = context.sourceCode;
      const ancestors = sourceCode.getAncestors?.(node as unknown as Node) ?? [];

      // The parent of JSXOpeningElement should be JSXElement
      const jsxElement = ancestors.at(-1) as TSESTree.JSXElement | undefined;

      if (jsxElement?.type !== 'JSXElement') {
        context.report({ ...descriptor, node: name });
        return;
      }

      if (hasJSXElementChildren(jsxElement)) {
        // Prefer not raising an issue when child components are present
        // Better to miss some true positives than to raise false positives
        return;
      }

      context.report({ ...descriptor, node: name });
    },
  );
}
