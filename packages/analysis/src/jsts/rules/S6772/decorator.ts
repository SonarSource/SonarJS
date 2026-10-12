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
import { interceptReportForReact } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import * as meta from './generated-meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    reportIfAmbiguous,
  );
}

/**
 * Reports spacing issues unless following text starts with a dot or comma.
 * @param context The rule context.
 * @param descriptor The upstream spacing report.
 */
function reportIfAmbiguous(context: Rule.RuleContext, descriptor: Rule.ReportDescriptor): void {
  if (
    'messageId' in descriptor &&
    descriptor.messageId === 'spacingAfterPrev' &&
    'node' in descriptor
  ) {
    const node = descriptor.node as TSESTree.JSXElement;
    const parent = node.parent;
    if (parent.type === 'JSXElement' || parent.type === 'JSXFragment') {
      const followingIndex = parent.children.indexOf(node) + 1;
      const following = parent.children[followingIndex];
      if (following?.type === 'JSXText' && /^[.,]/.test(following.value.trimStart())) {
        const nextElement = parent.children[followingIndex + 1];
        // Keep this pattern and report aligned with the upstream jsx-child-element-spacing rule.
        // https://github.com/jsx-eslint/eslint-plugin-react/blob/v7.37.5/lib/rules/jsx-child-element-spacing.js
        if (
          /\S\s*\n\s*$/.test(following.value) &&
          nextElement?.type === 'JSXElement' &&
          nextElement.openingElement.name.type === 'JSXIdentifier'
        ) {
          // The upstream rule reports only one side of a JSX text node.
          context.report({
            ...descriptor,
            node: nextElement as Rule.Node,
            loc: nextElement.loc.start,
            messageId: 'spacingBeforeNext',
            data: { element: nextElement.openingElement.name.name },
          });
        }
        return;
      }
    }
  }
  context.report(descriptor);
}
