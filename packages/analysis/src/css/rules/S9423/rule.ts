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

function setDisabledRanges(
  result: PostcssResult,
  ruleName: string,
  ranges: stylelint.DisabledRange[] | undefined,
): void {
  const { disabledRanges } = result.stylelint;
  if (ranges) {
    disabledRanges[ruleName] = ranges;
  } else {
    Reflect.deleteProperty(disabledRanges, ruleName);
  }
}

// Stylelint checks disable comments against the upstream rule name when reporting,
// so the ranges of the sonar rule name must be applied to the upstream rule while it runs.
async function runWithSonarDisables(
  result: PostcssResult,
  run: () => Promise<void> | void,
): Promise<void> {
  const { disabledRanges } = result.stylelint;
  const upstreamRanges = disabledRanges[UPSTREAM_RULE];
  setDisabledRanges(result, UPSTREAM_RULE, disabledRanges[SONAR_RULE]);
  try {
    await run();
  } finally {
    setDisabledRanges(result, UPSTREAM_RULE, upstreamRanges);
  }
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
    const upstream = factory(primary, secondaryOptions, context);
    await runWithSonarDisables(result, (): Promise<void> | void => upstream(root, result));

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
