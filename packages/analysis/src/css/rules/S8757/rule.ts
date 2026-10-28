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
import { meta } from './meta.js';
import type PostCSS from 'postcss';
import { createDecoratedRule } from '../helpers/decorated-result.js';

const SONAR_RULE = meta.bindings[0].stylelintKey;
const UPSTREAM_RULE = meta.bindings[0].upstreamRule;

// Sass-specific value annotations that are only valid in .scss / .sass files
const SASS_ANNOTATIONS = new Set(['!default', '!global']);
const SASS_LANGS = new Set(['scss', 'sass']);

function isSassBlock(root: PostCSS.Root, result: PostcssResult): boolean {
  // postcss-html sets source.lang on each embedded block inside HTML/Vue
  const lang = (
    root.source as (PostCSS.Source & { lang?: string }) | undefined
  )?.lang?.toLowerCase();
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

const ruleImpl = createDecoratedRule(
  SONAR_RULE,
  UPSTREAM_RULE,
  (message, _upstreamMessages, root, result) => {
    if (isSassBlock(root, result) && isSassAnnotationWarning(message.text)) {
      return undefined;
    }
    return message.text.replace(` (${UPSTREAM_RULE})`, '');
  },
);

export const rule = stylelint.createPlugin(SONAR_RULE, ruleImpl as stylelint.Rule) as {
  ruleName: string;
  rule: stylelint.Rule;
};
