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
import { SourceCode } from 'eslint';
import * as ESTree from 'estree';
import { Location } from './location';
import { AST } from 'vue-eslint-parser';
import { extractTokensAndComments } from './utils-token';

export default function getHighlighting(sourceCode: SourceCode) {
  const { tokens, comments } = extractTokensAndComments(sourceCode);
  const highlights: Highlight[] = [];
  for (const token of tokens) {
    switch (token.type as any) {
      case 'HTMLTagOpen':
      case 'HTMLTagClose':
      case 'HTMLEndTagOpen':
      case 'HTMLSelfClosingTagClose':
      case 'Keyword':
        highlight(token, 'KEYWORD', highlights);
        break;
      case 'HTMLLiteral':
      case 'String':
      case 'Template':
        highlight(token, 'STRING', highlights);
        break;
      case 'Numeric':
        highlight(token, 'CONSTANT', highlights);
        break;
    }
  }
  for (const comment of comments) {
    if (
      (comment.type === 'Block' && comment.value.startsWith('*')) ||
      comment.type === 'HTMLBogusComment'
    ) {
      highlight(comment, 'STRUCTURED_COMMENT', highlights);
    } else {
      highlight(comment, 'COMMENT', highlights);
    }
  }
  return { highlights };
}

export type SonarTypeOfText = 'CONSTANT' | 'COMMENT' | 'STRUCTURED_COMMENT' | 'KEYWORD' | 'STRING';

export interface Highlight {
  location: Location;
  textType: SonarTypeOfText;
}

function highlight(
  node: AST.Token | ESTree.Comment,
  highlightKind: SonarTypeOfText,
  highlights: Highlight[],
) {
  if (!node.loc) {
    return;
  }
  const startPosition = node.loc.start;
  const endPosition = node.loc.end;
  highlights.push({
    location: {
      startLine: startPosition.line,
      startCol: startPosition.column,
      endLine: endPosition.line,
      endCol: endPosition.column,
    },
    textType: highlightKind,
  });
}
