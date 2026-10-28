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
// https://sonarsource.github.io/rspec/#/rspec/S9450/css
import stylelint from 'stylelint';
import type PostCSS from 'postcss';
import { meta } from './meta.js';
import { createDecoratedRule, type DecoratedMessage } from '../helpers/decorated-result.js';

const { stylelintKey: SONAR_RULE, upstreamRule: UPSTREAM_RULE } = meta.bindings[0];
const KEYFRAMES_NAME = /^(-(o|moz|ms|webkit)-)?keyframes$/i;

export const messages = {
  duplicate: (property: string): string =>
    `Remove or correct this duplicate "${property}" declaration to avoid competing values in the same block.`,
};

function effectiveDuplicates(block: PostCSS.Rule): Set<PostCSS.Declaration> {
  const seen = new Set<string>();
  const duplicates = new Set<PostCSS.Declaration>();
  for (const node of block.nodes) {
    if (node.type !== 'decl' || node.important) {
      continue;
    }
    if (seen.has(node.prop)) {
      duplicates.add(node);
    }
    seen.add(node.prop);
  }
  return duplicates;
}

const ruleImpl = (
  primary: unknown,
  secondaryOptions: unknown,
  context: stylelint.RuleContext,
): ReturnType<stylelint.RuleBase> => {
  const duplicatesByBlock = new WeakMap<PostCSS.Rule, Set<PostCSS.Declaration>>();
  return createDecoratedRule(
    SONAR_RULE,
    UPSTREAM_RULE,
    (message: DecoratedMessage): string | undefined => {
      // The upstream rule reports only declarations, retaining their raw property names.
      const declaration = message.node as PostCSS.Declaration;
      const block = declaration.parent;
      const keyframes = block?.parent;
      if (
        block?.type === 'rule' &&
        keyframes?.type === 'atrule' &&
        KEYFRAMES_NAME.test(keyframes.name)
      ) {
        // Browsers ignore !important in keyframes; S4655 reports those declarations.
        // Compute the effective duplicates once per block, without changing the shared AST.
        let duplicates = duplicatesByBlock.get(block);
        if (!duplicates) {
          duplicates = effectiveDuplicates(block);
          duplicatesByBlock.set(block, duplicates);
        }
        if (!duplicates.has(declaration)) {
          return undefined;
        }
      }
      return messages.duplicate(declaration.prop);
    },
  )(primary, secondaryOptions, context);
};

export const rule = stylelint.createPlugin(SONAR_RULE, ruleImpl as stylelint.Rule) as {
  ruleName: string;
  rule: stylelint.Rule;
};
