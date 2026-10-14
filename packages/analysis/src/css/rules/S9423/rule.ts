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
// https://sonarsource.github.io/rspec/#/rspec/S9423/css
import stylelint from 'stylelint';
import type PostCSS from 'postcss';
import { createDecoratedRule, type DecoratedMessage } from '../helpers/decorated-result.js';

const SONAR_RULE = 'sonar/declaration-no-important';
const UPSTREAM_RULE = 'declaration-no-important';
// "!important" inside keyframes is left to S4655
const KEYFRAMES_NAME = /^(-(o|moz|ms|webkit)-)?keyframes$/i;

export const messages = {
  important: 'Remove this "!important" and resolve the specificity conflict instead.',
};

function isInKeyframes(node: PostCSS.Node | undefined): boolean {
  for (let parent = node?.parent; parent; parent = parent.parent) {
    if (parent.type === 'atrule' && KEYFRAMES_NAME.test((parent as PostCSS.AtRule).name)) {
      return true;
    }
  }
  return false;
}

const ruleImpl = createDecoratedRule(
  SONAR_RULE,
  UPSTREAM_RULE,
  (message: DecoratedMessage): string | undefined =>
    isInKeyframes(message.node) ? undefined : messages.important,
);

export const rule = stylelint.createPlugin(SONAR_RULE, ruleImpl as stylelint.Rule) as {
  ruleName: string;
  rule: stylelint.Rule;
};
