/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import * as estree from 'estree';
import { SourceCode, AST } from 'eslint';
import { visit } from '../utils';
import { Location } from './location';

export default function getCpdTokens(sourceCode: SourceCode): { cpdTokens: CpdToken[] } {
  const cpdTokens: CpdToken[] = [];
  const tokens = sourceCode.ast.tokens;
  const jsxTokens = extractJSXTokens(sourceCode);

  tokens.forEach(token => {
    let text = token.value;

    if (text.trim().length === 0) {
      // for EndOfFileToken and JsxText tokens containing only whitespaces
      return;
    }

    if (isStringLiteralToken(token) && !jsxTokens.includes(token)) {
      text = 'LITERAL';
    }

    const startPosition = token.loc.start;
    const endPosition = token.loc.end;

    cpdTokens.push({
      location: {
        startLine: startPosition.line,
        startCol: startPosition.column,
        endLine: endPosition.line,
        endCol: endPosition.column,
      },
      image: text,
    });
  });

  return { cpdTokens };
}

function extractJSXTokens(sourceCode: SourceCode) {
  const tokens: AST.Token[] = [];
  visit(sourceCode, (node: estree.Node) => {
    if (
      ['JSXExpressionContainer', 'JSXSpreadChild', 'JSXSpreadAttribute', 'JSXAttribute'].includes(
        node.type,
      )
    ) {
      tokens.push(...sourceCode.getTokens(node));
    }
  });
  return tokens;
}

function isStringLiteralToken(token: AST.Token) {
  return token.value.startsWith('"') || token.value.startsWith("'") || token.value.startsWith('`');
}

export interface CpdToken {
  location: Location;
  image: string;
}
