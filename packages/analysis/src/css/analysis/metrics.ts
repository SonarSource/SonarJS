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
import type { Root, Document } from 'postcss';
import type { CssMetrics } from './analysis.js';

const NOSONAR_PATTERN = /NOSONAR/;

interface ComputeMetricsOptions {
  includeNcloc: boolean;
  includeCommentLines: boolean;
  includeNoSonar: boolean;
}

const ALL_METRICS: ComputeMetricsOptions = {
  includeNcloc: true,
  includeCommentLines: true,
  includeNoSonar: true,
};

/**
 * Adds all line numbers from startLine to endLine (inclusive) into the target set.
 */
function addLineRange(target: Set<number>, startLine: number, endLine: number): void {
  for (let line = startLine; line <= endLine; line++) {
    target.add(line);
  }
}

function addLine(target: Set<number>, line: number): void {
  target.add(line);
}

/**
 * Computes metrics from a PostCSS AST root node.
 *
 * Walks all nodes in the tree to compute only the requested metrics.
 * Lines that contain both code and comments are counted in both metrics.
 *
 * @param root the PostCSS AST root
 * @param options metrics to include
 * @returns computed CSS metrics
 */
export function computeMetrics(
  root: Root | Document,
  options: ComputeMetricsOptions = ALL_METRICS,
): CssMetrics {
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
      if (options.includeCommentLines) {
        addLineRange(commentCandidates, start.line, end.line);
      }
      if (options.includeNoSonar && NOSONAR_PATTERN.test(node.text)) {
        nosonarLines.push(start.line);
      }
    } else if (options.includeNcloc) {
      switch (node.type) {
        case 'decl':
        case 'atrule':
          addLineRange(codeLines, start.line, end.line);
          break;
        case 'rule':
          // Count selector line and closing line, but avoid spanning the full block.
          addLine(codeLines, start.line);
          addLine(codeLines, end.line);
          break;
      }
    }
  });

  // Match the old CssMetricSensor behavior: a line with both code and comment
  // tokens is counted in BOTH ncloc and commentLines independently.
  // Sort is needed because root.walk() is depth-first (parent before children),
  // so line numbers are not necessarily added in order (e.g. a rule's closing
  // brace line is added before its children's lines).
  return {
    ncloc: Array.from(codeLines).toSorted((a, b) => a - b),
    commentLines: Array.from(commentCandidates).toSorted((a, b) => a - b),
    nosonarLines: nosonarLines.toSorted((a, b) => a - b),
  };
}
