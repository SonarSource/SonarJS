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

// exported for testing purpose
export const messages = stylelint.utils.ruleMessages(ruleName, {
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
  'layer',
  'media',
  'scope',
  'starting-style',
  'supports',
]);

const VENDOR_PREFIX = /^-(?:webkit|moz|ms|o|khtml)-/i;
const LEGACY_IE_FILTER_VALUE = /^\s*(?:progid:|alpha\()/i;

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
    const registeredSyntaxes = collectRegisteredSyntaxes(root);
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
  if (hasUnvalidatedPiece(ast, knownFunctionsOf(lexer))) {
    return undefined;
  }

  const mathError = findMathError(value, ast);
  if (mathError) {
    const expression = value.slice(mathError.start, mathError.end);
    return { message: messages.rejectedMath(decl.prop, expression), range: mathError };
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
 * Maps the custom properties registered with `@property` to their syntax, except those
 * accepting any value.
 */
function collectRegisteredSyntaxes(root: PostCSS.Root): Map<string, string> {
  const syntaxes = new Map<string, string>();
  root.walkAtRules(/^property$/i, (atRule: PostCSS.AtRule) => {
    const name = atRule.params.trim();
    if (!name.startsWith('--')) {
      return;
    }
    atRule.walkDecls(/^syntax$/i, (decl: PostCSS.Declaration) => {
      const value = decl.value.trim();
      const syntax = cssString.decode(value);
      if (syntax !== value && syntax !== '*') {
        syntaxes.set(name, syntax);
      }
    });
  });
  return syntaxes;
}

function isSkippedDeclaration(decl: PostCSS.Declaration, syntax: string | undefined): boolean {
  const property = decl.prop.toLowerCase();
  return (
    (property.startsWith('--') && syntax === undefined) ||
    property === '-ms-filter' ||
    (property === 'filter' && LEGACY_IE_FILTER_VALUE.test(decl.value)) ||
    isDescriptor(decl)
  );
}

function isDescriptor(decl: PostCSS.Declaration): boolean {
  for (let node: PostCSS.Node | undefined = decl.parent; node; node = node.parent) {
    if (
      node.type === 'atrule' &&
      !NESTING_AT_RULES.has((node as PostCSS.AtRule).name.toLowerCase())
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Vendor-prefixed values are deliberate fallbacks, and functions unknown to the lexer grammar,
 * like those of frameworks or preprocessors, cannot be validated.
 */
function hasUnvalidatedPiece(ast: CssNode, knownFunctions: Set<string>): boolean {
  return (
    find(ast, (node: CssNode) => {
      if (node.type === 'Function') {
        const name = node.name.toLowerCase();
        return (
          VENDOR_PREFIX.test(name) || UNVALIDATED_FUNCTIONS.has(name) || !knownFunctions.has(name)
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
