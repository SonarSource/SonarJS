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
import type { TSESTree } from '@typescript-eslint/utils';
import { interceptReportForReact } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isHtmlElement } from '../helpers/isHtmlElement.js';
import * as fp from './false-positives/index.js';
import * as meta from './generated-meta.js';

/**
 * Decorates the prefer-tag-over-role rule to fix false positives.
 *
 * Suppresses reports for:
 * 1. Custom components (not standard HTML elements)
 * 2. Valid ARIA patterns where semantic equivalents would lose functionality:
 *    - SVG with role="presentation"/"img" and aria-hidden="true" (decorative icons)
 *    - SVG with role="img" and a <title> child, aria-label, or aria-labelledby (semantic icons)
 *    - role="status" with aria-live (live region pattern)
 *    - role="slider" with complete aria-value* attributes
 *    - role="radio" with aria-checked
 *    - role="combobox" popup widgets with ARIA disclosure state
 *    - role="separator" with children (since <hr> is void)
 *    - role="img" on div/span with children or CSS backgroundImage (since <img> is void)
 *    - role="presentation"/"none" on structural layout containers
 *    - role="group" subgroups containing options inside role="listbox"
 *    - ARIA composite widget roles (table, grid, listbox, row, option, etc.) when forming
 *      complete custom widget patterns
 *
 * Note: SVG internal elements like <g> are not in HTML_TAG_NAMES, so they're
 * already filtered out by isHtmlElement. HTML elements with role="group" remain
 * true positives unless they form a listbox subgroup with option descendants.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if (!('node' in reportDescriptor)) {
        return;
      }
      const { node } = reportDescriptor as Rule.ReportDescriptor & {
        node: TSESTree.JSXOpeningElement;
      };

      // Wrap the opening element in a JSXElement structure for isHtmlElement
      const jsxElement = {
        type: 'JSXElement' as const,
        openingElement: node,
      } as TSESTree.JSXElement;

      if (!isHtmlElement(jsxElement)) {
        // Suppress for custom components (not standard HTML elements)
        return;
      }

      if (fp.isFalsePositive(node, context.sourceCode)) {
        // Suppress for valid ARIA patterns
        return;
      }

      context.report(reportDescriptor);
    },
  );
}
