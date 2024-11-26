/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { SourceCode } from 'eslint';
import ESTree from 'estree';
import { AST } from 'vue-eslint-parser';
import { extractTokensAndComments, Location } from './metrics/helpers/index.js';

/**
 * A syntax highlight
 *
 * A syntax highlight is used by SonarQube to display a source code
 * with syntax highlighting.
 *
 * @param location the highlight location
 * @param textType the highlight type
 */
export interface SyntaxHighlight {
  location: Location;
  textType: TextType;
}

/**
 * Denotes a highlight type of a token
 *
 * The set of possible values for a token highlight is defined by SonarQube, which
 * uses this value to decide how to highlight a token.
 */
export type TextType = 'CONSTANT' | 'COMMENT' | 'STRUCTURED_COMMENT' | 'KEYWORD' | 'STRING';

/**
 * Computes the syntax highlighting of an ESLint source code
 * @param sourceCode the source code to highlight
 * @returns a list of highlighted tokens
 */
export function getSyntaxHighlighting(sourceCode: SourceCode) {
  const { tokens, comments } = extractTokensAndComments(sourceCode);
  const highlights: SyntaxHighlight[] = [];
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
      case 'RegularExpression':
        highlight(token, 'STRING', highlights);
        break;
      case 'Numeric':
        highlight(token, 'CONSTANT', highlights);
        break;
      case 'Identifier': {
        const node = sourceCode.getNodeByRangeIndex(token.range[0]);
        // @ts-ignore
        if (token.value === 'type' && node?.type === 'TSTypeAliasDeclaration') {
          highlight(token, 'KEYWORD', highlights);
        }
        // @ts-ignore
        if (token.value === 'as' && node?.type === 'TSAsExpression') {
          highlight(token, 'KEYWORD', highlights);
        }
        break;
      }
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

function highlight(
  node: AST.Token | ESTree.Comment,
  highlightKind: TextType,
  highlights: SyntaxHighlight[],
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
