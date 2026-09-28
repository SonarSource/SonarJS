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
import stylelint, { type PostcssResult } from 'stylelint';
import type PostCSS from 'postcss';

const SONAR_RULE = 'sonar/declaration-no-important';
const UPSTREAM_RULE = 'declaration-no-important';
// S4655 already reports "!important" inside keyframes
const KEYFRAMES_RULE = 'keyframe-declaration-no-important';
const KEYFRAMES_NAME = /^(-(o|moz|ms|webkit)-)?keyframes$/i;

export const messages = {
  important: 'Remove this "!important" and resolve the specificity conflict instead.',
};

type ReportedMessage = {
  text: string;
  rule?: string;
  node?: PostCSS.Node;
  stylelintType?: string;
};

function isKeyframesRuleEnabled(result: PostcssResult): boolean {
  const setting = result.stylelint.config?.rules?.[KEYFRAMES_RULE];
  return setting !== undefined && setting !== null;
}

function isInKeyframes(node: PostCSS.Node | undefined): boolean {
  for (let parent = node?.parent; parent; parent = parent.parent) {
    if (parent.type === 'atrule' && KEYFRAMES_NAME.test((parent as PostCSS.AtRule).name)) {
      return true;
    }
  }
  return false;
}

const ruleImpl: stylelint.RuleBase = (
  primary: unknown,
  secondaryOptions: unknown,
  context: stylelint.RuleContext,
): ReturnType<stylelint.RuleBase> => {
  return async (root: PostCSS.Root, result: PostcssResult): Promise<void> => {
    const factory = (await stylelint.rules[UPSTREAM_RULE]) as stylelint.Rule;
    const reported = (result as unknown as { messages: ReportedMessage[] }).messages;
    const from = reported.length;
    await factory(primary, secondaryOptions, context)(root, result);

    const skipKeyframes = isKeyframesRuleEnabled(result);
    for (let i = reported.length - 1; i >= from; i--) {
      const message = reported[i];
      if (message.stylelintType !== undefined) {
        continue;
      }
      if (skipKeyframes && isInKeyframes(message.node)) {
        reported.splice(i, 1);
        continue;
      }
      message.text = `${messages.important} (${SONAR_RULE})`;
      message.rule = SONAR_RULE;
    }
  };
};

export const rule = stylelint.createPlugin(SONAR_RULE, ruleImpl as stylelint.Rule) as {
  ruleName: string;
  rule: stylelint.Rule;
};
