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
import type { TSESTree } from '@typescript-eslint/utils';
import { interceptReportForReact, generateMeta } from '../helpers/index.js';
import { isHtmlElement } from '../helpers/isHtmlElement.js';
import * as meta from './generated-meta.js';

/**
 * Decorates the prefer-tag-over-role rule to fix false positives where
 * the rule suggests replacing custom components (like Angular Material)
 * with standard HTML elements.
 *
 * For example: <mat-card role="region"> should NOT be flagged to use <section>
 * because mat-card is a custom component with specific functionality.
 *
 * The decorator only allows the rule to suggest changes when the current
 * element is a standard HTML element.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      const node = (reportDescriptor as any).node as TSESTree.JSXOpeningElement;

      // Only report if the current element is a standard HTML element
      // Custom components (like mat-card, my-component, etc.) should not be flagged
      // We need to wrap the opening element in a JSXElement structure for isHtmlElement
      const jsxElement = {
        type: 'JSXElement' as const,
        openingElement: node,
      } as TSESTree.JSXElement;

      if (isHtmlElement(jsxElement)) {
        context.report(reportDescriptor);
      }
      // Otherwise suppress the report (false positive for custom components)
    },
  );
}
