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
import stylelint, { type DisabledRange, type PostcssResult } from 'stylelint';
import type PostCSS from 'postcss';

export type DecoratedMessage = {
  text: string;
  rule?: string;
  node?: PostCSS.Node;
  stylelintType?: string;
};

function copyRanges(ranges: DisabledRange[]): DisabledRange[] {
  return ranges.map(range => ({
    ...range,
    rules: range.rules?.slice(),
  }));
}

/**
 * Give an upstream Stylelint rule the Sonar rule's disable ranges without
 * changing the result shared with concurrently running rules.
 */
export function withSonarDisables(
  result: PostcssResult,
  sonarRule: string,
  upstreamRule: string,
): PostcssResult {
  const disabledRanges = Object.fromEntries(
    Object.entries(result.stylelint.disabledRanges).map(([rule, ranges]) => [
      rule,
      copyRanges(ranges),
    ]),
  );
  const sonarRanges = result.stylelint.disabledRanges[sonarRule];
  if (sonarRanges) {
    disabledRanges[upstreamRule] = copyRanges(sonarRanges);
  } else {
    Reflect.deleteProperty(disabledRanges, upstreamRule);
  }
  // The proxy forwards status updates and disabled-warning tracking to the
  // shared Stylelint state, while isolating only the disabled-ranges lookup.
  const scopedStylelint = new Proxy(result.stylelint, {
    get(target, property, receiver) {
      return property === 'disabledRanges'
        ? disabledRanges
        : Reflect.get(target, property, receiver);
    },
  });
  // PostCSS's warn() appends to this.messages. Keep upstream warnings private
  // until the decorator has rewritten them, so another rule's warnings cannot
  // be mistaken for this invocation's warnings.
  const scopedResult = Object.create(result) as PostcssResult;
  scopedResult.stylelint = scopedStylelint;
  scopedResult.messages = [];
  return scopedResult;
}

/** Run an upstream rule with isolated warnings, then publish its rewritten results. */
export function createDecoratedRule(
  sonarRule: string,
  upstreamRule: keyof typeof stylelint.rules,
  rewriteMessage: (message: DecoratedMessage) => string | undefined,
): stylelint.RuleBase {
  return (primary: unknown, secondaryOptions: unknown, context: stylelint.RuleContext) => {
    return async (root: PostCSS.Root, result: PostcssResult): Promise<void> => {
      const factory = (await stylelint.rules[upstreamRule]) as stylelint.Rule;
      const upstream = factory(primary, secondaryOptions, context);
      const scopedResult = withSonarDisables(result, sonarRule, upstreamRule);
      await upstream(root, scopedResult);

      const reported = (result as unknown as { messages: DecoratedMessage[] }).messages;
      for (const message of scopedResult.messages as unknown as DecoratedMessage[]) {
        if (message.stylelintType !== undefined) {
          reported.push(message);
          continue;
        }
        const rewritten = rewriteMessage(message);
        if (rewritten === undefined) {
          continue;
        }
        message.text = `${rewritten} (${sonarRule})`;
        message.rule = sonarRule;
        reported.push(message);
      }
    };
  };
}
