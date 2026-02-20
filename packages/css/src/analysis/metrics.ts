/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import type { Root } from 'postcss';
import type { CssMetrics } from './analysis.js';

const NOSONAR_PATTERN = /NOSONAR/;

/**
 * Adds all line numbers from startLine to endLine (inclusive) into the target set.
 */
function addLineRange(target: Set<number>, startLine: number, endLine: number): void {
  for (let line = startLine; line <= endLine; line++) {
    target.add(line);
  }
}

/**
 * Computes metrics from a PostCSS AST root node.
 *
 * Walks all nodes in the tree to determine which lines contain code
 * and which contain only comments. Lines that contain both code and
 * comments are counted as code lines only.
 *
 * @param root the PostCSS AST root
 * @returns computed CSS metrics
 */
export function computeMetrics(root: Root): CssMetrics {
  const codeLines = new Set<number>();
  const commentCandidates = new Set<number>();
  const nosonarLines: number[] = [];

  root.walk(node => {
    const start = node.source?.start;
    const end = node.source?.end;
    if (!start || !end) {
      return;
    }

    if (node.type === 'comment') {
      addLineRange(commentCandidates, start.line, end.line);
      if (NOSONAR_PATTERN.test(node.text)) {
        nosonarLines.push(start.line);
      }
    } else {
      // Rule, AtRule, Declaration nodes contribute to code lines
      addLineRange(codeLines, start.line, end.line);
    }
  });

  // Comment-only lines are those not also covered by code
  const commentLines: number[] = [];
  for (const line of commentCandidates) {
    if (!codeLines.has(line)) {
      commentLines.push(line);
    }
  }

  return {
    ncloc: Array.from(codeLines).sort((a, b) => a - b),
    commentLines: commentLines.sort((a, b) => a - b),
    nosonarLines: nosonarLines.sort((a, b) => a - b),
    executableLines: [],
    functions: 0,
    statements: 0,
    classes: 0,
    complexity: 0,
    cognitiveComplexity: 0,
  };
}
