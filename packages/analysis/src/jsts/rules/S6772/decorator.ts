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
  const punctuation = getFollowingPunctuation(descriptor);
  if (!punctuation) {
    context.report(descriptor);
    return;
  }

  const { text, nextElement } = punctuation;
  const trailingWhitespace = text.slice(text.trimEnd().length);
  // Preserve the trailing-newline check and report from the upstream jsx-child-element-spacing rule.
  // https://github.com/jsx-eslint/eslint-plugin-react/blob/v7.37.5/lib/rules/jsx-child-element-spacing.js
  if (
    trailingWhitespace.includes('\n') &&
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
}

function getFollowingPunctuation(descriptor: Rule.ReportDescriptor) {
  if (
    !('messageId' in descriptor) ||
    descriptor.messageId !== 'spacingAfterPrev' ||
    !('node' in descriptor)
  ) {
    return undefined;
  }
  const node = descriptor.node as TSESTree.JSXElement;
  const parent = node.parent;
  if (parent.type !== 'JSXElement' && parent.type !== 'JSXFragment') {
    return undefined;
  }
  const followingIndex = parent.children.indexOf(node) + 1;
  const following = parent.children[followingIndex];
  if (following?.type === 'JSXText' && /^[.,]/.test(following.value.trimStart())) {
    return { text: following.value, nextElement: parent.children[followingIndex + 1] };
  }
  return undefined;
}
