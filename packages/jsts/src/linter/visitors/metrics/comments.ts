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
import { addLines } from './helpers/index.js';

/**
 * A comment marker to tell SonarQube to ignore any issue on the same line
 * as the one with a comment whose text is `NOSONAR` (case-insensitive).
 */
const NOSONAR = 'NOSONAR';

/**
 * Finds the line numbers of comments in the source code
 * @param sourceCode the source code to visit
 * @param ignoreHeaderComments a flag to ignore file header comments
 * @returns the line numbers of comments
 */
export function findCommentLines(
  sourceCode: SourceCode,
  ignoreHeaderComments: boolean,
): { commentLines: number[]; nosonarLines: number[] } {
  const commentLines: Set<number> = new Set();
  const nosonarLines: Set<number> = new Set();

  let comments = sourceCode.ast.comments;

  // ignore header comments -> comments before first token
  const firstToken = sourceCode.getFirstToken(sourceCode.ast);
  if (firstToken && ignoreHeaderComments) {
    const header = sourceCode.getCommentsBefore(firstToken);
    comments = comments.slice(header.length);
  }

  for (const comment of comments) {
    if (comment.loc) {
      const commentValue = comment.value.startsWith('*')
        ? comment.value.substring(1).trim()
        : comment.value.trim();
      if (commentValue.toUpperCase().startsWith(NOSONAR)) {
        addLines(comment.loc.start.line, comment.loc.end.line, nosonarLines);
      } else if (commentValue.length > 0) {
        addLines(comment.loc.start.line, comment.loc.end.line, commentLines);
      }
    }
  }

  return {
    commentLines: Array.from(commentLines).sort((a, b) => a - b),
    nosonarLines: Array.from(nosonarLines).sort((a, b) => a - b),
  };
}
