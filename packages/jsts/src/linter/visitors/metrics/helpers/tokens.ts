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
