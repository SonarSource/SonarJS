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
// https://sonarsource.github.io/rspec/#/rspec/S9442/css
import stylelint from 'stylelint';
import { meta } from './meta.js';
import type PostCSS from 'postcss';
import valueParser from 'postcss-value-parser';
import { createDecoratedRule, type DecoratedMessage } from '../helpers/decorated-result.js';

const SONAR_RULE = meta.bindings[0].stylelintKey;
const UPSTREAM_RULE = meta.bindings[0].upstreamRule;
// Matching against the upstream messages keeps the rewrite in sync with Stylelint's wording.
type UpstreamMessages = {
  expectedToken: () => string;
  expectedSameNumber: () => string;
  expectedRectangle: (name: string) => string;
};
const NAME_PLACEHOLDER = '\0';
// Stylelint splits area strings on whitespace only, while CSS decodes escapes
// and allows a null cell next to a named one without whitespace ("a.b").
const UNSUPPORTED_AREA_SYNTAX = /\\|[^\s.]\.|\.[^\s.]/;

export const messages = {
  emptyString: 'Add at least one cell token to this string.',
  cellCount: 'Make this row have the same number of cells as the first row.',
  rectangle: (name: string): string => `Make the "${name}" area a single filled-in rectangle.`,
};

function rectangleName(text: string, upstream: UpstreamMessages): string | undefined {
  const [prefix, suffix] = upstream.expectedRectangle(NAME_PLACEHOLDER).split(NAME_PLACEHOLDER);
  if (
    text.length > prefix.length + suffix.length &&
    text.startsWith(prefix) &&
    text.endsWith(suffix)
  ) {
    return text.slice(prefix.length, text.length - suffix.length);
  }
  return undefined;
}

function hasUnsupportedAreaSyntax(node: PostCSS.Node | undefined): boolean {
  if (node?.type !== 'decl') {
    return false;
  }
  let unsupported = false;
  valueParser((node as PostCSS.Declaration).value).walk(valueNode => {
    if (valueNode.type === 'string' && UNSUPPORTED_AREA_SYNTAX.test(valueNode.value)) {
      unsupported = true;
    }
  });
  return unsupported;
}

function rewriteMessage(
  message: DecoratedMessage,
  upstreamMessages: stylelint.RuleMessages,
): string | undefined {
  if (hasUnsupportedAreaSyntax(message.node)) {
    return undefined;
  }
  const upstream = upstreamMessages as UpstreamMessages;
  const { text } = message;
  if (text === upstream.expectedToken()) {
    return messages.emptyString;
  }
  if (text === upstream.expectedSameNumber()) {
    return messages.cellCount;
  }

  const name = rectangleName(text, upstream);
  if (name !== undefined) {
    // CSS treats a run of periods as one unnamed cell, not as a named area.
    return /^\.+$/.test(name) ? undefined : messages.rectangle(name);
  }
  return text.replace(` (${UPSTREAM_RULE})`, '');
}

const ruleImpl = createDecoratedRule(SONAR_RULE, UPSTREAM_RULE, rewriteMessage);

export const rule = stylelint.createPlugin(SONAR_RULE, ruleImpl as stylelint.Rule) as {
  ruleName: string;
  rule: stylelint.Rule;
};
