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
import type { Rule } from 'eslint';
import {
  generateMeta,
  interceptReport,
  getValueOfExpression,
  getProperty,
} from '../helpers/index.js';
import pkg from 'jsx-ast-utils-x';
const { hasAnyProp } = pkg;
import type { JSXOpeningElement, JSXSpreadAttribute } from 'estree-jsx';
import type estree from 'estree';
import * as meta from './generated-meta.js';

/**
 * This fix was introduced in eslint-plugin-jsx-a11y e6bfd5cb7c,
 * but the last release is almost a year old, so it doesn't include this.
 * When we update the dependency, we can remove this decorator.
 *
 * This will include the removal of:
 * - the `jsx-ast-utils` dependency
 * - all files in the `rules/S6827/` directory
 */

const ACCESSIBLE_PROPS = ['title', 'aria-label'];

/**
 * Returns true if the spread attribute might provide accessible content,
 * meaning we should suppress the report to avoid a false positive.
 *
 * - If the spread expression cannot be resolved to an object literal,
 *   we conservatively suppress (we can't determine what it provides).
 * - If it resolves to an object literal, we suppress only if it contains
 *   at least one accessible prop (title, aria-label).
 */
function spreadMightHaveAccessibleContent(
  attr: JSXSpreadAttribute,
  context: Rule.RuleContext,
): boolean {
  const resolvedObject = getValueOfExpression(
    context,
    attr.argument as unknown as estree.Node,
    'ObjectExpression',
  );
  if (!resolvedObject) {
    // Can't resolve to an object literal - assume it might provide accessible content
    return true;
  }
  // Object resolved - suppress only if an accessible prop is present
  return ACCESSIBLE_PROPS.some(prop => getProperty(resolvedObject, prop, context) !== null);
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, {
        ...rule.meta!,
      }),
    },
    (context, reportDescriptor) => {
      const node = (reportDescriptor as any).node as JSXOpeningElement;

      // Suppress if any spread attribute might provide accessible content.
      const spreadAttrs = node.attributes.filter(
        (attr): attr is JSXSpreadAttribute => attr.type === 'JSXSpreadAttribute',
      );
      if (spreadAttrs.some(attr => spreadMightHaveAccessibleContent(attr, context))) {
        return;
      }

      if (hasAnyProp(node.attributes, ['title', 'aria-label'])) {
        return;
      }
      context.report({ ...reportDescriptor });
    },
  );
}
