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
// https://sonarsource.github.io/rspec/#/rspec/S8757/css
import stylelint, { type PostcssResult } from 'stylelint';
import type PostCSS from 'postcss';

const SONAR_RULE = 'sonar/annotation-no-unknown';
const UPSTREAM_RULE = 'annotation-no-unknown';

// Sass-specific value annotations that are only valid in .scss / .sass files
const SASS_ANNOTATIONS = new Set(['!default', '!global']);
const SASS_LANGS = new Set(['scss', 'sass']);

function isSassBlock(root: PostCSS.Root, result: PostcssResult): boolean {
  // postcss-html sets source.lang on each embedded block inside HTML/Vue
  const lang = root.source?.lang?.toLowerCase();
  if (lang !== undefined) {
    return SASS_LANGS.has(lang);
  }
  // postcss-scss/postcss-sass do not set source.lang; fall back to file extension
  const from = result.opts.from?.toLowerCase() ?? '';
  return from.endsWith('.scss') || from.endsWith('.sass');
}

function isSassAnnotationWarning(text: string): boolean {
  const match = /"([^"]+)"/.exec(text);
  return match !== null && SASS_ANNOTATIONS.has(match[1]);
}

function relabelWarnings(result: PostcssResult, from: number): void {
  for (const w of result.warnings().slice(from)) {
    w.text = w.text.replace(` (${UPSTREAM_RULE})`, ` (${SONAR_RULE})`);
    (w as unknown as { rule: string }).rule = SONAR_RULE;
  }
}

function removeSassAnnotationWarnings(result: PostcssResult, from: number): void {
  const messages = (result as unknown as { messages: { stylelintType?: string; text: string }[] })
    .messages;
  for (let i = messages.length - 1; i >= from; i--) {
    const w = messages[i];
    if (w.stylelintType !== 'invalidOption' && isSassAnnotationWarning(w.text)) {
      messages.splice(i, 1);
    }
  }
}

const ruleImpl: stylelint.RuleBase = (primary, secondaryOptions, context) => {
  let upstream: ReturnType<stylelint.RuleBase> | undefined;

  const getUpstream = async () => {
    if (!upstream) {
      const factory = (await stylelint.rules[UPSTREAM_RULE]) as stylelint.Rule;
      upstream = factory(primary, secondaryOptions, context);
    }
    return upstream;
  };

  const runOnBlock = async (
    block: PostCSS.Root,
    result: PostcssResult,
    sass: boolean,
  ): Promise<void> => {
    const delegated = await getUpstream();
    const messages = (result as unknown as { messages: object[] }).messages;
    const msgCount = messages.length;
    const warnCount = result.warnings().length;
    await (delegated as (root: PostCSS.Root, result: PostcssResult) => Promise<void>)(
      block,
      result,
    );
    if (sass) {
      removeSassAnnotationWarnings(result, msgCount);
    }
    relabelWarnings(result, warnCount);
  };

  return async (root: PostCSS.Root | PostCSS.Document, result) => {
    if ((root as PostCSS.Node).type === 'document') {
      for (const child of (root as PostCSS.Document).nodes) {
        if ((child as PostCSS.Node).type !== 'root') {
          continue;
        }
        await runOnBlock(child, result, isSassBlock(child, result));
      }
      return;
    }
    await runOnBlock(root as PostCSS.Root, result, isSassBlock(root as PostCSS.Root, result));
  };
};

export const rule = stylelint.createPlugin(SONAR_RULE, ruleImpl as stylelint.Rule) as {
  ruleName: string;
  rule: stylelint.Rule;
};
