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

type MessageArgs = NonNullable<stylelint.Problem['messageArgs']>;

/** Collect upstream warnings without applying rule settings or changing shared reporting state. */
function isolatedResult(
  result: PostcssResult,
  upstreamRule: string,
  capturedArgs: MessageArgs[],
): PostcssResult {
  const scopedResult = Object.create(result) as PostcssResult;
  scopedResult.stylelint = {
    ...result.stylelint,
    // checkAgainstRule returns formatted warnings without messageArgs. The
    // severity callback receives those arguments before each warning is built.
    ruleSeverities: {
      [upstreamRule]: (...args: MessageArgs) => {
        capturedArgs.push(args);
        return 'error';
      },
    },
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
    config: { ...result.stylelint.config, fix: false, computeEditInfo: false },
  };
  return scopedResult;
}

/**
 * Run an upstream rule in isolation, then report accepted warnings under the Sonar rule.
 * CSS autofixes are not supported: collection disables fixes and edit info, and
 * publishing does not forward upstream fix information.
 */
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
      const capturedArgs: MessageArgs[] = [];
      let warningIndex = 0;
      await stylelint.utils.checkAgainstRule(
        {
          ruleName: upstreamRule,
          ruleSettings: [primary, secondaryOptions],
          root,
          result: isolatedResult(result, upstreamRule, capturedArgs),
          context: { ...context, fix: false },
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
          // Filtered warnings still consume their arguments.
          const messageArgs = capturedArgs[warningIndex++];
          const rewritten = rewriteMessage(message, factory.messages, root, result);
          if (rewritten !== undefined) {
            stylelint.utils.report({
              ruleName: sonarRule,
              result,
              // The rewrite is already formatted; only a configured custom
              // message should interpolate the original arguments again.
              message: () => rewritten,
              messageArgs,
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
