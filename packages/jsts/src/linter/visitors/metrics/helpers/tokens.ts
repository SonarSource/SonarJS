/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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

/**
 * Extracts comments and tokens from an ESLint source code
 *
 * The returned extracted comments includes also those from
 * the template section of a Vue.js Single File Component.
 *
 * @param sourceCode the source code to extract from
 * @returns the extracted tokens and comments
 */
export function extractTokensAndComments(sourceCode: SourceCode): {
  tokens: AST.Token[];
  comments: AST.Token[];
} {
  const ast = sourceCode.ast as AST.ESLintProgram;
  const tokens = [...(ast.tokens ?? [])];
  const comments = [...(ast.comments ?? [])];
  if (ast.templateBody) {
    const { templateBody } = ast;
    tokens.push(...templateBody.tokens);
    comments.push(...templateBody.comments);
  }
  return { tokens, comments };
}
