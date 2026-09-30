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
// https://sonarsource.github.io/rspec/#/rspec/S9424/css
import stylelint, { type PostcssResult } from 'stylelint';
import type PostCSS from 'postcss';
import cssFunctions from 'css-functions-list/index.json' with { type: 'json' };

const SONAR_RULE = 'sonar/declaration-property-value-no-unknown';
const UPSTREAM_RULE = 'declaration-property-value-no-unknown';

// Standard CSS function names, the same list stylelint's function-no-unknown relies on
const KNOWN_FUNCTIONS = new Set<string>(cssFunctions);

// Captures the offending value quoted in every upstream message variant
const OFFENDING_VALUE =
  /^(?:Unknown value|Cannot parse property value|Invalid math expression) "(.*)" for property "/s;
const PARSE_ERROR = 'Cannot parse property value';
const VENDOR_PREFIX = /(?:^|[^\w-])-(?:webkit|moz|ms|o|khtml)-/i;
const QUOTED_STRING = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;
const TOKEN_SEPARATOR = /[\s,/*+]+/;
const FUNCTION_CALL = /[\w-]+\(?/g;
const DIMENSION = /^[+-]?[\d.]+(?:e[+-]?\d+)?([a-z]+)$/i;
const VALID_HEX_COLOR = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const LEGACY_IE_FILTER_VALUE = /^\s*(?:progid:|alpha\()/i;

// Same direction checks as stylelint's function-linear-gradient-no-nonstandard-direction
const GRADIENT_DIRECTION = /top|left|bottom|right/i;
const STANDARD_GRADIENT_DIRECTION = /^to (top|left|bottom|right)(?: (top|left|bottom|right))?$/i;
const GRADIENT_ANGLE = /^[\d.]+(?:deg|grad|rad|turn)$/;
const GRADIENT_IN_KEYWORD = /\bin\b/i;

type UpstreamWarning = PostCSS.Warning & { rule?: string };
type Lexer = { units: Record<string, string[]> };

function functionNames(value: string): string[] {
  return (value.match(FUNCTION_CALL) ?? [])
    .filter((match: string): boolean => match.endsWith('('))
    .map((match: string): string => match.slice(0, -1).toLowerCase());
}

function callsUnknownFunction(value: string): boolean {
  return functionNames(value).some((name: string): boolean => !KNOWN_FUNCTIONS.has(name));
}

/** Covered by S4647 (color-no-invalid-hex) */
function hasInvalidHexColor(tokens: string[]): boolean {
  return tokens.some(
    (token: string): boolean => token.startsWith('#') && !VALID_HEX_COLOR.test(token),
  );
}

/** Covered by S4653 (unit-no-unknown) */
function hasUnknownUnit(tokens: string[], knownUnits: Set<string>): boolean {
  return tokens.some((token: string): boolean => {
    const unit = DIMENSION.exec(token)?.[1];
    return unit !== undefined && !knownUnits.has(unit.toLowerCase());
  });
}

function isNonstandardGradientDirection(firstArgument: string): boolean {
  if (GRADIENT_IN_KEYWORD.test(firstArgument) || firstArgument.startsWith('var(')) {
    return false;
  }
  if (/^[\d.]/.test(firstArgument)) {
    return !GRADIENT_ANGLE.test(firstArgument);
  }
  if (!GRADIENT_DIRECTION.test(firstArgument)) {
    return false;
  }
  const match = STANDARD_GRADIENT_DIRECTION.exec(firstArgument);
  return match === null || match[1] === match[2];
}

/** Covered by S4651 (function-linear-gradient-no-nonstandard-direction) */
function hasNonstandardGradientDirection(value: string): boolean {
  const lowerCased = value.toLowerCase();
  let index = lowerCased.indexOf('linear-gradient(');
  while (index !== -1) {
    const previous = lowerCased.charAt(index - 1);
    if (!/[\w-]/.test(previous)) {
      const argumentsStart = index + 'linear-gradient('.length;
      const firstArgument = lowerCased.slice(argumentsStart).split(/[,)]/)[0].trim();
      if (isNonstandardGradientDirection(firstArgument)) {
        return true;
      }
    }
    index = lowerCased.indexOf('linear-gradient(', index + 1);
  }
  return false;
}

/** Covered by S4652 (string-no-newline) */
function hasNewlineInString(value: string): boolean {
  return (value.match(QUOTED_STRING) ?? []).some((str: string): boolean => str.includes('\n'));
}

function isLegacyIeFilter(node: PostCSS.Node | undefined): boolean {
  if (node?.type !== 'decl') {
    return false;
  }
  const { prop, value } = node as PostCSS.Declaration;
  const property = prop.toLowerCase();
  return property === '-ms-filter' || (property === 'filter' && LEGACY_IE_FILTER_VALUE.test(value));
}

function knownUnitsOf(result: PostcssResult): Set<string> {
  const { units } = result.stylelint.lexer as Lexer;
  return new Set(Object.values(units).flat());
}

/**
 * Vendor-prefixed fallbacks and legacy IE filters are deliberate. Unknown functions, invalid hex
 * colors, unknown units, non-standard gradient directions, and strings with newlines are left to
 * the dedicated rules so that the same value is not reported twice.
 */
function isIgnored(warning: UpstreamWarning, knownUnits: Set<string>): boolean {
  const value = OFFENDING_VALUE.exec(warning.text)?.[1];
  if (value === undefined) {
    return false;
  }
  if (warning.text.startsWith(PARSE_ERROR) && hasNewlineInString(value)) {
    return true;
  }
  const unquoted = value.replaceAll(QUOTED_STRING, '""');
  const tokens = unquoted.split(TOKEN_SEPARATOR);
  return (
    VENDOR_PREFIX.test(unquoted) ||
    callsUnknownFunction(unquoted) ||
    hasInvalidHexColor(tokens) ||
    hasUnknownUnit(tokens, knownUnits) ||
    hasNonstandardGradientDirection(unquoted) ||
    isLegacyIeFilter(warning.node)
  );
}

function filterAndRelabelWarnings(result: PostcssResult, from: number): void {
  const { messages } = result;
  const knownUnits = knownUnitsOf(result);
  for (let i = messages.length - 1; i >= from; i--) {
    const warning = messages[i] as UpstreamWarning;
    if (warning.type !== 'warning' || warning.rule !== UPSTREAM_RULE) {
      continue;
    }
    if (isIgnored(warning, knownUnits)) {
      messages.splice(i, 1);
    } else {
      warning.text = warning.text.replace(` (${UPSTREAM_RULE})`, ` (${SONAR_RULE})`);
      warning.rule = SONAR_RULE;
    }
  }
}

type RuleFunction = ReturnType<stylelint.RuleBase>;

const ruleImpl: stylelint.RuleBase<unknown, unknown> = (
  primary: unknown,
  secondaryOptions: unknown,
  context: stylelint.RuleContext,
): RuleFunction => {
  let upstream: RuleFunction | undefined;

  const getUpstream = async (): Promise<RuleFunction> => {
    if (!upstream) {
      const factory = (await stylelint.rules[UPSTREAM_RULE]) as stylelint.Rule;
      upstream = factory(primary, secondaryOptions, context);
    }
    return upstream;
  };

  return async (root: PostCSS.Root, result: PostcssResult): Promise<void> => {
    const delegated = await getUpstream();
    const from = result.messages.length;
    await delegated(root, result);
    filterAndRelabelWarnings(result, from);
  };
};

export const rule = stylelint.createPlugin(SONAR_RULE, ruleImpl as stylelint.Rule) as {
  ruleName: string;
  rule: stylelint.Rule;
};
