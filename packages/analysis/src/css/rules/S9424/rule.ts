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
import {
  definitionSyntax,
  find,
  ident,
  parse,
  string as cssString,
  walk,
  type CssNode,
  type DSNode,
  type FunctionNode,
  type Lexer,
  type SyntaxDescriptor,
  type SyntaxMatchError,
} from 'css-tree';
import { calc, ParseErrorMessage, type ParseError } from '@csstools/css-calc';

const ruleName = 'sonar/declaration-property-value-no-unknown';

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (property: string, value: string) =>
    `Unknown value "${value}" for property "${property}"`,
  missing: (property: string) => `Missing value for property "${property}"`,
  rejectedMath: (property: string, expression: string) =>
    `Invalid math expression "${expression}" for property "${property}"`,
});

// Functions whose values css-tree cannot validate reliably
const UNVALIDATED_FUNCTIONS = new Set([
  'attr',
  'calc-size',
  'clamp',
  'env',
  'if',
  'max',
  'min',
  'var',
]);

const MATH_FUNCTIONS = new Set([
  'abs',
  'acos',
  'asin',
  'atan',
  'atan2',
  'calc',
  'clamp',
  'cos',
  'exp',
  'hypot',
  'log',
  'max',
  'min',
  'mod',
  'pow',
  'rem',
  'round',
  'sign',
  'sin',
  'sqrt',
  'tan',
]);

const MATH_ERRORS = new Set<string>([
  ParseErrorMessage.UnexpectedAdditionOfDimensionOrPercentageWithNumber,
  ParseErrorMessage.UnexpectedSubtractionOfDimensionOrPercentageWithNumber,
]);

/**
 * Value pieces that related rules cover: hex colors (S4647) and numbers with a unit (S4653).
 */
const UNCHECKED_NODE_TYPES = new Set(['Hash', 'Dimension']);

// At-rules whose declarations are style declarations rather than descriptors
const NESTING_AT_RULES = new Set([
  'apply',
  'container',
  'keyframes',
  'layer',
  'media',
  'scope',
  'starting-style',
  'supports',
]);

const CSS_WIDE_KEYWORDS = new Set(['inherit', 'initial', 'revert', 'revert-layer', 'unset']);
const UNIVERSAL_SYNTAX = '*';

const VENDOR_PREFIX = /^-(?:webkit|moz|ms|o|khtml)-/i;
const LEGACY_IE_FILTER_FUNCTION = /^\s*(?:progid:|alpha\()/i;
const LEGACY_IE_FILTER_KEYWORDS = new Set(['fliph', 'flipv', 'gray', 'invert', 'xray']);

// Units relative to the font or to a container, whose lengths depend on other properties
const DEPENDENT_UNITS = new Set([
  'cap',
  'ch',
  'cqb',
  'cqh',
  'cqi',
  'cqmax',
  'cqmin',
  'cqw',
  'em',
  'ex',
  'ic',
  'lh',
  'rcap',
  'rch',
  'rem',
  'rex',
  'ric',
  'rlh',
]);

const MAX_CACHE_SIZE = 10000;
const validValuesByLexer = new WeakMap<Lexer, Set<string>>();
const knownFunctionsByLexer = new WeakMap<Lexer, Set<string>>();

// Suffix of the lexer types that define a function, such as `rgb()`
const FUNCTION_TYPE_SUFFIX = '()';

// The grammar definitions that a css-tree lexer holds, which its typings do not expose
type LexerDefinitions = {
  properties: Record<string, SyntaxDescriptor>;
  types: Record<string, SyntaxDescriptor>;
};

type Range = { start: number; end: number };

/** The rejected piece of a value, with the functions that enclose it, outermost first */
type Piece = { node: CssNode; functions: FunctionNode[] };

/** A problem located in the declaration value, or on the whole declaration without a range */
type Problem = { message: string; range?: Range };

const ruleImpl: stylelint.RuleBase = () => {
  return (root: PostCSS.Root, result: PostcssResult) => {
    const lexer = result.stylelint.lexer as Lexer;
    const registeredSyntaxes = collectRegisteredSyntaxes(root, lexer);
    let validValues = validValuesByLexer.get(lexer);
    if (!validValues) {
      validValues = new Set();
      validValuesByLexer.set(lexer, validValues);
    }

    root.walkDecls((decl: PostCSS.Declaration) => {
      const problem = findProblem(decl, lexer, registeredSyntaxes.get(decl.prop), validValues);
      if (problem) {
        const valueIndex = declarationValueIndex(decl);
        const { range } = problem;
        stylelint.utils.report({
          ruleName,
          result,
          message: problem.message,
          node: decl,
          ...(range && { index: valueIndex + range.start, endIndex: valueIndex + range.end }),
        });
      }
    });
  };
};

function findProblem(
  decl: PostCSS.Declaration,
  lexer: Lexer,
  syntax: string | undefined,
  validValues: Set<string>,
): Problem | undefined {
  if (isSkippedDeclaration(decl, syntax)) {
    return undefined;
  }
  const value = decl.raws.value?.raw ?? decl.value;
  const cacheKey = syntax === undefined ? `${decl.prop}:${value}` : undefined;
  if (cacheKey !== undefined && validValues.has(cacheKey)) {
    return undefined;
  }

  let ast: CssNode;
  try {
    ast = parse(value, { context: 'value', positions: true });
  } catch {
    // values that are not valid CSS syntax are left to S4652 and S8757
    return undefined;
  }
  decodeIdentifiers(ast);
  if (isAcceptedValue(decl.prop, ast)) {
    return undefined;
  }
  const knownFunctions = knownFunctionsOf(lexer);
  if (hasUnvalidatedPiece(ast, knownFunctions, MATH_FUNCTIONS)) {
    return undefined;
  }

  const mathError = findMathError(value, ast);
  if (mathError) {
    const expression = value.slice(mathError.start, mathError.end);
    return { message: messages.rejectedMath(decl.prop, expression), range: mathError };
  }
  if (hasUnvalidatedPiece(ast, knownFunctions)) {
    return undefined;
  }

  const mismatch = findMismatch(lexer, decl.prop, syntax, ast);
  if (!mismatch) {
    if (cacheKey !== undefined && validValues.size < MAX_CACHE_SIZE) {
      validValues.add(cacheKey);
    }
    return undefined;
  }

  const piece = locatePiece(ast, mismatch);
  if (!piece || !isChecked(piece)) {
    return undefined;
  }
  const range = rangeOf(piece.node);
  if (range.start === range.end) {
    return { message: messages.missing(decl.prop) };
  }
  return { message: messages.rejected(decl.prop, value.slice(range.start, range.end)), range };
}

/**
 * Maps the custom properties registered with `@property` to their syntax. When a property
 * is registered several times, the last valid registration wins.
 */
function collectRegisteredSyntaxes(root: PostCSS.Root, lexer: Lexer): Map<string, string> {
  const syntaxes = new Map<string, string>();
  root.walkAtRules(/^property$/i, (atRule: PostCSS.AtRule) => {
    const name = atRule.params.trim();
    const syntax = name.startsWith('--') ? registeredSyntax(atRule, lexer) : undefined;
    if (syntax !== undefined) {
      syntaxes.set(name, syntax);
    }
  });
  return syntaxes;
}

/**
 * css-tree matches identifiers by their escaped name, so `\69nherit` would not match `inherit`
 */
function decodeIdentifiers(ast: CssNode): void {
  walk(ast, (node: CssNode) => {
    if (node.type === 'Identifier') {
      node.name = ident.decode(node.name);
    }
  });
}

/**
 * Values that the grammar rejects but browsers accept: CSS-wide keywords, which apply to
 * registered custom properties as well, and unitless `-webkit-perspective` numbers, which
 * WebKit reads as pixels.
 */
function isAcceptedValue(property: string, ast: CssNode): boolean {
  const node = ast.type === 'Value' && ast.children.size === 1 ? ast.children.first : null;
  if (node?.type === 'Identifier') {
    return CSS_WIDE_KEYWORDS.has(node.name.toLowerCase());
  }
  return (
    node?.type === 'Number' &&
    property.toLowerCase() === '-webkit-perspective' &&
    Number(node.value) >= 0
  );
}

/**
 * The syntax of a valid `@property` registration: browsers ignore a registration without
 * a `syntax` string or an `inherits` flag, or whose initial value does not match its syntax
 * or depends on other properties.
 */
function registeredSyntax(atRule: PostCSS.AtRule, lexer: Lexer): string | undefined {
  const descriptors = new Map<string, string>();
  atRule.each((node: PostCSS.ChildNode) => {
    if (node.type === 'decl') {
      descriptors.set(node.prop.toLowerCase(), node.value.trim());
    }
  });
  const rawSyntax = descriptors.get('syntax') ?? '';
  const syntax = cssString.decode(rawSyntax);
  const inherits = descriptors.get('inherits')?.toLowerCase();
  if (syntax === rawSyntax || (inherits !== 'true' && inherits !== 'false')) {
    return undefined;
  }
  if (syntax.trim() === UNIVERSAL_SYNTAX) {
    return UNIVERSAL_SYNTAX;
  }
  const initialValue = descriptors.get('initial-value');
  return initialValue !== undefined && isValidInitialValue(lexer, syntax, initialValue)
    ? syntax
    : undefined;
}

function isValidInitialValue(lexer: Lexer, syntax: string, value: string): boolean {
  try {
    const ast = parse(value, { context: 'value' });
    return (
      find(
        ast,
        (node: CssNode) =>
          node.type === 'Dimension' && DEPENDENT_UNITS.has(node.unit.toLowerCase()),
      ) === null && lexer.match(syntax, ast).error === null
    );
  } catch {
    return false;
  }
}

function isSkippedDeclaration(decl: PostCSS.Declaration, syntax: string | undefined): boolean {
  const property = decl.prop.toLowerCase();
  return (
    // custom properties are checked only against a restricted registered syntax
    (property.startsWith('--') && (syntax === undefined || syntax === UNIVERSAL_SYNTAX)) ||
    property === '-ms-filter' ||
    (property === 'filter' && isLegacyIeFilter(decl.value)) ||
    isDescriptor(decl)
  );
}

function isLegacyIeFilter(value: string): boolean {
  return (
    LEGACY_IE_FILTER_FUNCTION.test(value) ||
    value
      .trim()
      .split(/\s+/)
      .every((keyword: string) => LEGACY_IE_FILTER_KEYWORDS.has(keyword.toLowerCase()))
  );
}

function isDescriptor(decl: PostCSS.Declaration): boolean {
  for (let node: PostCSS.Node | undefined = decl.parent; node; node = node.parent) {
    if (node.type === 'atrule' && !NESTING_AT_RULES.has(unprefixedName(node as PostCSS.AtRule))) {
      return true;
    }
  }
  return false;
}

function unprefixedName(atRule: PostCSS.AtRule): string {
  return atRule.name.toLowerCase().replace(VENDOR_PREFIX, '');
}

/**
 * Vendor-prefixed values are deliberate fallbacks, and functions unknown to the lexer grammar,
 * like those of frameworks or preprocessors, cannot be validated. The `validated` functions
 * are exempted from `UNVALIDATED_FUNCTIONS`.
 */
function hasUnvalidatedPiece(
  ast: CssNode,
  knownFunctions: Set<string>,
  validated: Set<string> = new Set(),
): boolean {
  return (
    find(ast, (node: CssNode) => {
      if (node.type === 'Function') {
        const name = node.name.toLowerCase();
        return (
          VENDOR_PREFIX.test(name) ||
          (UNVALIDATED_FUNCTIONS.has(name) && !validated.has(name)) ||
          !knownFunctions.has(name)
        );
      }
      return node.type === 'Identifier' && VENDOR_PREFIX.test(node.name);
    }) !== null
  );
}

/**
 * Names of the functions that the lexer grammar defines, the only ones whose calls it can validate
 */
function knownFunctionsOf(lexer: Lexer): Set<string> {
  const cached = knownFunctionsByLexer.get(lexer);
  if (cached) {
    return cached;
  }
  const { properties, types } = lexer as unknown as LexerDefinitions;
  const functions = new Set<string>(
    Object.keys(types)
      .filter((type: string) => type.endsWith(FUNCTION_TYPE_SUFFIX))
      .map((type: string) => type.slice(0, -FUNCTION_TYPE_SUFFIX.length).toLowerCase()),
  );
  for (const { syntax } of [...Object.values(properties), ...Object.values(types)]) {
    if (syntax) {
      addFunctionNames(syntax, functions);
    }
  }
  knownFunctionsByLexer.set(lexer, functions);
  return functions;
}

function addFunctionNames(syntax: DSNode, names: Set<string>): void {
  definitionSyntax.walk(syntax, (node: DSNode) => {
    if (node.type === 'Function') {
      names.add(node.name.toLowerCase());
    }
  });
}

/**
 * Math expressions adding or subtracting a number and a dimension or a percentage
 */
function findMathError(value: string, ast: CssNode): Range | undefined {
  const hasMath =
    find(
      ast,
      (node: CssNode) => node.type === 'Function' && MATH_FUNCTIONS.has(node.name.toLowerCase()),
    ) !== null;
  if (!hasMath) {
    return undefined;
  }
  let error: Range | undefined;
  calc(value, {
    onParseError: (parseError: ParseError) => {
      if (!error && MATH_ERRORS.has(parseError.message)) {
        error = { start: parseError.sourceStart, end: parseError.sourceEnd + 1 };
      }
    },
  });
  return error;
}

function findMismatch(
  lexer: Lexer,
  property: string,
  syntax: string | undefined,
  ast: CssNode,
): Range | undefined {
  let error;
  try {
    ({ error } =
      syntax === undefined ? lexer.matchProperty(property, ast) : lexer.match(syntax, ast));
  } catch {
    // invalid registered syntax
    return undefined;
  }
  // unknown properties are left to S4654
  if (error?.name !== 'SyntaxMatchError' || !('loc' in error)) {
    return undefined;
  }
  const { loc } = error as SyntaxMatchError;
  return { start: loc.start.offset, end: loc.end.offset };
}

/**
 * Finds the deepest node matching the mismatch. An empty mismatch denotes a missing piece,
 * which rejects the enclosing function, or else the whole value.
 */
function locatePiece(ast: CssNode, mismatch: Range): Piece | undefined {
  const isMissing = mismatch.start === mismatch.end;
  const functions: FunctionNode[] = [];
  let piece: Piece | undefined;
  walk(ast, {
    enter: (node: CssNode) => {
      const range = rangeOf(node);
      const matches = isMissing
        ? node.type === 'Value' ||
          (node.type === 'Function' && range.start < mismatch.start && mismatch.end <= range.end)
        : node.type !== 'Value' && range.start === mismatch.start && range.end === mismatch.end;
      if (node.loc && matches) {
        piece = { node, functions: [...functions] };
      }
      if (node.type === 'Function') {
        functions.push(node);
      }
    },
    leave: (node: CssNode) => {
      if (node.type === 'Function') {
        functions.pop();
      }
    },
  });
  return piece;
}

/**
 * Pieces that related rules cover are not checked: hex colors, numbers with a unit, and
 * the first argument of `linear-gradient()`, which S4651 checks as the gradient direction.
 */
function isChecked({ node, functions }: Piece): boolean {
  return (
    !UNCHECKED_NODE_TYPES.has(node.type) &&
    !functions.some(
      (fn: FunctionNode) =>
        fn.name.toLowerCase() === 'linear-gradient' && isInFirstArgument(fn, node),
    )
  );
}

function isInFirstArgument(fn: FunctionNode, node: CssNode): boolean {
  const separator = fn.children
    .toArray()
    .find((child: CssNode) => child.type === 'Operator' && child.value === ',');
  return !separator || rangeOf(node).start < rangeOf(separator).start;
}

function rangeOf(node: CssNode): Range {
  return { start: node.loc?.start.offset ?? 0, end: node.loc?.end.offset ?? 0 };
}

function declarationValueIndex(decl: PostCSS.Declaration): number {
  return decl.prop.length + (decl.raws.between ?? ':').length;
}

export const rule = stylelint.createPlugin(
  ruleName,
  Object.assign(ruleImpl, {
    messages,
    ruleName,
  }),
) as { ruleName: string; rule: stylelint.Rule };
