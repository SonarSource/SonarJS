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
// https://sonarsource.github.io/rspec/#/rspec/S9452/css
import stylelint from 'stylelint';
import { lexer, type Lexer } from 'css-tree';
import { isTokenDimension, isTokenFunction, tokenize } from '@csstools/css-tokenizer';
import { createDecoratedRule, type DecoratedMessage } from '../helpers/decorated-result.js';
import { meta } from './meta.js';

const { stylelintKey, upstreamRule } = meta.bindings[0];
// Matching against the upstream message keeps the rewrite in sync with Stylelint's wording.
type UpstreamMessages = { rejected: (name: string, value: string) => string };
type SecondaryOptions = { ignoreMediaFeatureNameValues?: Record<string, unknown[]> };
const NAME_PLACEHOLDER = '\0';
const VALUE_PLACEHOLDER = '\u0001';
// Valid values that the upstream keyword tables do not list yet
const MISSING_VALUES: Record<string, string[]> = {
  'display-mode': ['window-controls-overlay'],
};
// Features of type <mq-boolean>, which accept the integers 0 and 1
const BOOLEAN_FEATURES = new Set(['grid']);
const VENDOR_PREFIX = /^-[a-z]+-/;
// Unknown units are left to S4653. Like S4653, "x" is only known for resolutions,
// and the upstream rule already accepts it there.
const KNOWN_UNITS = new Set(
  Object.values((lexer as Lexer & { units: Record<string, string[]> }).units)
    .flat()
    .filter(unit => unit !== 'x'),
);

export const messages = {
  rejected: (value: string, name: string): string =>
    `Replace "${value}" with a valid value for the "${name}" media feature.`,
};

function parseRejected(
  text: string,
  upstream: UpstreamMessages,
): { name: string; value: string } | undefined {
  const template = upstream.rejected(NAME_PLACEHOLDER, VALUE_PLACEHOLDER);
  const [prefix, rest] = template.split(VALUE_PLACEHOLDER);
  const [separator, suffix] = rest.split(NAME_PLACEHOLDER);
  if (!text.startsWith(prefix) || !text.endsWith(suffix)) {
    return undefined;
  }
  const body = text.slice(prefix.length, text.length - suffix.length);
  const separatorIndex = body.lastIndexOf(separator);
  if (separatorIndex < 0) {
    return undefined;
  }
  return {
    value: body.slice(0, separatorIndex),
    name: body.slice(separatorIndex + separator.length),
  };
}

function hasUnknownUnit(value: string): boolean {
  return tokenize({ css: value }).some(
    token => isTokenDimension(token) && !KNOWN_UNITS.has(token[4].unit.toLowerCase()),
  );
}

/**
 * Upstream rejects math functions for <mq-boolean> features, although they can resolve to
 * 0 or 1. Their result is not evaluated, so they are accepted.
 */
function isBooleanCalculation(name: string, value: string): boolean {
  const feature = name.toLowerCase().replace(VENDOR_PREFIX, '');
  return BOOLEAN_FEATURES.has(feature) && isTokenFunction(tokenize({ css: value })[0]);
}

function rewriteMessage(
  message: DecoratedMessage,
  upstreamMessages: stylelint.RuleMessages,
): string | undefined {
  const rejected = parseRejected(message.text, upstreamMessages as UpstreamMessages);
  if (rejected === undefined) {
    return message.text.replace(` (${upstreamRule})`, '');
  }
  const { name, value } = rejected;
  if (hasUnknownUnit(value) || isBooleanCalculation(name, value)) {
    return undefined;
  }
  return messages.rejected(value, name);
}

/** Adds the values missing from the upstream tables to the configured ignored values. */
function withMissingValues(secondaryOptions: unknown): unknown {
  if (secondaryOptions === undefined || secondaryOptions === null) {
    return { ignoreMediaFeatureNameValues: MISSING_VALUES };
  }
  if (typeof secondaryOptions !== 'object' || Array.isArray(secondaryOptions)) {
    // Leave invalid options to the upstream validation
    return secondaryOptions;
  }
  const options: SecondaryOptions = secondaryOptions;
  const ignored = { ...options.ignoreMediaFeatureNameValues };
  for (const [name, values] of Object.entries(MISSING_VALUES)) {
    ignored[name] = [...(ignored[name] ?? []), ...values];
  }
  return { ...options, ignoreMediaFeatureNameValues: ignored };
}

const decoratedRule = createDecoratedRule(stylelintKey, upstreamRule, rewriteMessage);

const ruleImpl: stylelint.RuleBase = (primary, secondaryOptions, context) =>
  decoratedRule(primary, withMissingValues(secondaryOptions), context);

export const rule = stylelint.createPlugin(stylelintKey, ruleImpl as stylelint.Rule) as {
  ruleName: string;
  rule: stylelint.Rule;
};
