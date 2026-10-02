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
import postcssValueParser, {
  type FunctionNode,
  type Node as ValueNode,
} from 'postcss-value-parser';
import cssFunctions from 'css-functions-list/index.json' with { type: 'json' };

const SONAR_RULE = 'sonar/declaration-property-value-no-unknown';
const UPSTREAM_RULE = 'declaration-property-value-no-unknown';

// Standard CSS function names, the same list stylelint's function-no-unknown relies on
const KNOWN_FUNCTIONS = new Set<string>(cssFunctions);

// Captures the offending value quoted in every upstream message variant
const OFFENDING_VALUE =
  /^(?:Unknown value|Cannot parse property value|Invalid math expression) "(.*)" for property "/s;
const VENDOR_PREFIX = /^-(?:webkit|moz|ms|o|khtml)-/i;
const VALID_HEX_COLOR = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const LEGACY_IE_FILTER_VALUE = /^\s*(?:progid:|alpha\()/i;

// Same `x` unit handling as stylelint's unit-no-unknown: only valid as an image resolution
const RESOLUTION_X_FUNCTIONS = new Set(['image-set', '-webkit-image-set']);
const RESOLUTION_X_PROPERTY = 'image-resolution';

// Same direction checks as stylelint's function-linear-gradient-no-nonstandard-direction
const GRADIENT_DIRECTION = /top|left|bottom|right/i;
const STANDARD_GRADIENT_DIRECTION = /^to (top|left|bottom|right)(?: (top|left|bottom|right))?$/i;
const GRADIENT_ANGLE = /^[\d.]+(?:deg|grad|rad|turn)$/;
const GRADIENT_IN_KEYWORD = /\bin\b/i;

type UpstreamWarning = PostCSS.Warning & { rule?: string };
type Lexer = { units: Record<string, string[]> };
type Overlap = (node: ValueNode, allowsX: boolean) => boolean;

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

function firstArgument(node: FunctionNode): string {
  const separator = node.nodes.findIndex(
    (child: ValueNode): boolean => child.type === 'div' && child.value === ',',
  );
  const nodes = separator === -1 ? node.nodes : node.nodes.slice(0, separator);
  return postcssValueParser.stringify(nodes).trim().toLowerCase();
}

/**
 * Checks for problems that dedicated rules already report, so that the same value is not
 * reported twice:
 * - S4647 (color-no-invalid-hex), S4651 (function-linear-gradient-no-nonstandard-direction),
 *   S4652 (string-no-newline), S4653 (unit-no-unknown), S8757 (annotation-no-unknown),
 *   and the unknown functions of stylelint's function-no-unknown.
 */
function overlapChecks(knownUnits: Set<string>): Overlap[] {
  return [
    (node: ValueNode): boolean =>
      node.type === 'function' &&
      node.value !== '' &&
      !KNOWN_FUNCTIONS.has(node.value.toLowerCase()),
    (node: ValueNode): boolean =>
      node.type === 'word' && node.value.startsWith('#') && !VALID_HEX_COLOR.test(node.value),
    (node: ValueNode, allowsX: boolean): boolean => {
      const unit = node.type === 'word' ? postcssValueParser.unit(node.value) : false;
      if (!unit || unit.unit === '') {
        return false;
      }
      const name = unit.unit.toLowerCase();
      return name === 'x' ? !allowsX : !knownUnits.has(name);
    },
    (node: ValueNode): boolean =>
      node.type === 'function' &&
      node.value.toLowerCase() === 'linear-gradient' &&
      isNonstandardGradientDirection(firstArgument(node)),
    (node: ValueNode): boolean => node.type === 'string' && node.value.includes('\n'),
    (node: ValueNode): boolean => node.type === 'word' && node.value.startsWith('!'),
  ];
}

/** Vendor-prefixed values are deliberate fallbacks for older browsers */
function isVendorPrefixed(node: ValueNode): boolean {
  return (node.type === 'word' || node.type === 'function') && VENDOR_PREFIX.test(node.value);
}

function hasIgnoredNode(nodes: ValueNode[], checks: Overlap[], allowsX: boolean): boolean {
  return nodes.some((node: ValueNode): boolean => {
    if (isVendorPrefixed(node) || checks.some((check: Overlap): boolean => check(node, allowsX))) {
      return true;
    }
    if (node.type !== 'function') {
      return false;
    }
    const allowsXInside = allowsX || RESOLUTION_X_FUNCTIONS.has(node.value.toLowerCase());
    return hasIgnoredNode(node.nodes, checks, allowsXInside);
  });
}

function isLegacyIeFilter(decl: PostCSS.Declaration): boolean {
  const property = decl.prop.toLowerCase();
  return (
    property === '-ms-filter' || (property === 'filter' && LEGACY_IE_FILTER_VALUE.test(decl.value))
  );
}

function knownUnitsOf(result: PostcssResult): Set<string> {
  const { units } = result.stylelint.lexer as Lexer;
  return new Set(['%', ...Object.values(units).flat()]);
}

/**
 * Vendor-prefixed fallbacks and legacy IE filters are deliberate. Problems that dedicated rules
 * already report are left to them.
 */
function isIgnored(warning: UpstreamWarning, checks: Overlap[]): boolean {
  const value = OFFENDING_VALUE.exec(warning.text)?.[1];
  const decl = warning.node;
  if (value === undefined || decl?.type !== 'decl') {
    return false;
  }
  const declaration = decl as PostCSS.Declaration;
  const allowsX = declaration.prop.toLowerCase() === RESOLUTION_X_PROPERTY;
  return (
    isLegacyIeFilter(declaration) ||
    hasIgnoredNode(postcssValueParser(value).nodes, checks, allowsX)
  );
}

/**
 * Upstream locates a missing value right after the colon, which is past the end of the line for
 * a declaration like `letter-spacing:` at the end of a line. Such a location cannot be reported,
 * so the warning is moved to the whole declaration.
 */
function relocateMissingValue(warning: UpstreamWarning): void {
  const { start, end } = warning.node?.source ?? {};
  if (OFFENDING_VALUE.exec(warning.text)?.[1] !== '' || !start || !end) {
    return;
  }
  warning.line = start.line;
  warning.column = start.column;
  warning.endLine = end.line;
  warning.endColumn = end.column + 1;
}

/**
 * Stylelint runs rules concurrently, so warnings from other rules may be interleaved with the
 * upstream ones. Only warnings that still carry the upstream rule name are handled.
 */
function filterAndRelabelWarnings(result: PostcssResult): void {
  const { messages } = result;
  const checks = overlapChecks(knownUnitsOf(result));
  for (let i = messages.length - 1; i >= 0; i--) {
    const warning = messages[i] as UpstreamWarning;
    if (warning.type !== 'warning' || warning.rule !== UPSTREAM_RULE) {
      continue;
    }
    if (isIgnored(warning, checks)) {
      messages.splice(i, 1);
    } else {
      relocateMissingValue(warning);
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
    await delegated(root, result);
    filterAndRelabelWarnings(result);
  };
};

export const rule = stylelint.createPlugin(SONAR_RULE, ruleImpl as stylelint.Rule) as {
  ruleName: string;
  rule: stylelint.Rule;
};
