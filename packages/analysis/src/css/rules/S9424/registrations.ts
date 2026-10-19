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
import type PostCSS from 'postcss';
import { find, parse, string as cssString, type CssNode, type Lexer } from 'css-tree';

export const UNIVERSAL_SYNTAX = '*';

// Data types that a `@property` syntax string can use
const SYNTAX_DATA_TYPES = new Set([
  'angle',
  'color',
  'custom-ident',
  'image',
  'integer',
  'length',
  'length-percentage',
  'number',
  'percentage',
  'resolution',
  'string',
  'time',
  'transform-function',
  'transform-list',
  'url',
]);
// Data types that a `@property` syntax string cannot repeat with a multiplier
const PRE_MULTIPLIED_DATA_TYPES = new Set(['transform-list']);
const SYNTAX_MULTIPLIERS = new Set(['#', '+']);
const SYNTAX_KEYWORD = /^-?[a-z_][\w-]*$/i;

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

/**
 * Maps the custom properties registered with `@property` to their syntax. When a property
 * is registered several times, the last valid registration wins.
 */
export function collectRegisteredSyntaxes(root: PostCSS.Root, lexer: Lexer): Map<string, string> {
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
 * The syntax of a valid `@property` registration: browsers ignore a registration without
 * a supported `syntax` string or an `inherits` flag, or whose initial value does not match
 * its syntax or depends on other properties.
 */
function registeredSyntax(atRule: PostCSS.AtRule, lexer: Lexer): string | undefined {
  const descriptors = new Map<string, string>();
  atRule.each((node: PostCSS.ChildNode) => {
    if (node.type === 'decl') {
      descriptors.set(node.prop.toLowerCase(), node.value.trim());
    }
  });
  const rawSyntax = descriptors.get('syntax') ?? '';
  const syntax = cssString.decode(rawSyntax).trim();
  const inherits = descriptors.get('inherits')?.toLowerCase();
  if (
    syntax === rawSyntax ||
    (inherits !== 'true' && inherits !== 'false') ||
    !isSupportedSyntax(syntax)
  ) {
    return undefined;
  }
  if (syntax === UNIVERSAL_SYNTAX) {
    return UNIVERSAL_SYNTAX;
  }
  const initialValue = descriptors.get('initial-value');
  return initialValue !== undefined && isValidInitialValue(lexer, syntax, initialValue)
    ? syntax
    : undefined;
}

/**
 * Syntax strings are either the universal syntax or components separated by `|`. The full
 * value definition grammar, with `||`, `&&` or groups, is not supported.
 */
function isSupportedSyntax(syntax: string): boolean {
  return syntax === UNIVERSAL_SYNTAX || syntax.split('|').every(isSyntaxComponent);
}

function isSyntaxComponent(component: string): boolean {
  const trimmed = component.trim();
  const multiplied = SYNTAX_MULTIPLIERS.has(trimmed.slice(-1));
  const single = multiplied ? trimmed.slice(0, -1) : trimmed;
  if (single.startsWith('<') && single.endsWith('>')) {
    const dataType = single.slice(1, -1);
    return (
      SYNTAX_DATA_TYPES.has(dataType) && !(multiplied && PRE_MULTIPLIED_DATA_TYPES.has(dataType))
    );
  }
  return SYNTAX_KEYWORD.test(single);
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
