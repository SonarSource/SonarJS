/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { AST } from 'vue-eslint-parser';
import { addLines } from './helpers';

/**
 * Finds the line numbers of code (ncloc)
 *
 * The line numbers of code denote physical lines that contain at least
 * one character which is neither a whitespace nor a tabulation nor part
 * of a comment.
 *
 * @param sourceCode the ESLint source code
 * @returns the line numbers of code
 */
export function findNcloc(sourceCode: SourceCode): number[] {
  const lines: Set<number> = new Set();
  const ast = sourceCode.ast as AST.ESLintProgram;
  const tokens = [...(ast.tokens ?? [])];
  if (ast.templateBody) {
    tokens.push(...extractVuejsTokens(ast.templateBody));
  }
  for (const token of tokens) {
    addLines(token.loc.start.line, token.loc.end.line, lines);
  }
  return Array.from(lines).sort((a, b) => a - b);
}

/**
 * Extracts Vue.js-specific tokens
 *
 * The template section parsed by `vue-eslint-parser` includes tokens for the whole `.vue` file.
 * Everything that is not template-related is either raw text or whitespace. Although the style
 * section is not parsed, its tokens are made available. Therefore, in addition to the tokens of
 * the script section, we consider tokens from the template and style sections as well, provided
 * that they don't denote whitespace or comments.
 */
function extractVuejsTokens(templateBody: AST.VElement & AST.HasConcreteInfo) {
  const tokens = [];

  let withinStyle = false;
  let withinComment = false;
  for (const token of templateBody.tokens) {
    /**
     * Style section
     */
    if (token.type === 'HTMLTagOpen' && token.value === 'style') {
      withinStyle = true;
    } else if (token.type === 'HTMLEndTagOpen' && token.value === 'style') {
      withinStyle = false;
    }

    /**
     * Whitespace tokens should be ignored in accordance with the
     * definition of ncloc.
     */
    if (token.type === 'HTMLWhitespace') {
      continue;
    }

    /**
     * Tokens of type 'HTMLRawText' denote either tokens from the
     * style section or tokens from the script section. Since the
     * tokens from the script section are already retrieved from
     * the root of the ast, we ignore those and only consider the
     * tokens from the style section.
     */
    if (token.type === 'HTMLRawText' && !withinStyle) {
      continue;
    }

    /**
     * CSS comment tokens should be ignored in accordance with the
     * definition of ncloc.
     */
    if (withinStyle && !withinComment && token.value === '/*') {
      withinComment = true;
      continue;
    } else if (withinStyle && withinComment) {
      withinComment = token.value !== '*/';
      continue;
    }

    tokens.push(token);
  }

  return tokens;
}
