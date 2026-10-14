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
import { definitionSyntax, type DSNode, type Lexer, type SyntaxDescriptor } from 'css-tree';

const knownFunctionsByLexer = new WeakMap<Lexer, Set<string>>();

// Suffix of the lexer types that define a function, such as `rgb()`
const FUNCTION_TYPE_SUFFIX = '()';

// The grammar definitions that a css-tree lexer holds, which its typings do not expose
type LexerDefinitions = {
  properties: Record<string, SyntaxDescriptor>;
  types: Record<string, SyntaxDescriptor>;
};

/**
 * Names of the functions that the lexer grammar defines, the only ones whose calls it can validate
 */
export function knownFunctionsOf(lexer: Lexer): Set<string> {
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
