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
import stylelint, { type PostcssResult } from 'stylelint';
import type PostCSS from 'postcss';

export type DecoratedMessage = PostCSS.Warning & {
  stylelintType?: stylelint.WarningOptions['stylelintType'];
};

/** Collect upstream warnings without applying rule settings or changing shared reporting state. */
function isolatedResult(result: PostcssResult): PostcssResult {
  const scopedResult = Object.create(result) as PostcssResult;
  scopedResult.stylelint = {
    ...result.stylelint,
    ruleSeverities: {},
    customMessages: {},
    customUrls: {},
    ruleMetadata: {},
    disabledRanges: {},
    disabledWarnings: [],
    fixersData: {},
    rangesOfComputedEditInfos: [],
    stylelintError: false,
    stylelintWarning: false,
    quiet: false,
  };
  return scopedResult;
}

/** Run an upstream rule in isolation, then report accepted warnings under the Sonar rule. */
export function createDecoratedRule(
  sonarRule: string,
  upstreamRule: keyof typeof stylelint.rules,
  rewriteMessage: (
    message: DecoratedMessage,
    upstreamMessages: stylelint.RuleMessages,
    root: PostCSS.Root,
    result: PostcssResult,
  ) => string | undefined,
): stylelint.RuleBase {
  return (primary, secondaryOptions, context) => {
    return async (root: PostCSS.Root, result: PostcssResult): Promise<void> => {
      const factory = (await stylelint.rules[upstreamRule]) as stylelint.Rule;
      await stylelint.utils.checkAgainstRule(
        {
          ruleName: upstreamRule,
          ruleSettings: [primary, secondaryOptions],
          root,
          result: isolatedResult(result),
          context,
        },
        warning => {
          const message = warning as DecoratedMessage;
          if (message.stylelintType !== undefined) {
            result.messages.push(message);
            if (
              message.stylelintType === 'invalidOption' ||
              message.stylelintType === 'parseError'
            ) {
              result.stylelint.stylelintError = true;
            }
            return;
          }
          const rewritten = rewriteMessage(message, factory.messages, root, result);
          if (rewritten !== undefined) {
            stylelint.utils.report({
              ruleName: sonarRule,
              result,
              message: rewritten,
              node: message.node,
              start: { line: message.line, column: message.column },
              end: {
                line: message.endLine ?? message.line,
                column: message.endColumn ?? message.column,
              },
            });
          }
        },
      );
    };
  };
}
