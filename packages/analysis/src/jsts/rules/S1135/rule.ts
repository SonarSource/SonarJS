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
// https://sonarsource.github.io/rspec/#/rspec/S1135/javascript

import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const todoPattern = 'TODO';
const letterPattern = /[\p{Letter}]/u;
const jiraIssueKeyPattern = /\b[A-Z][A-Z0-9]+-\d+\b/u;

type IgnorePatternMatch = (line: string, start: number, pattern: string) => boolean;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      completeTODO: 'Complete the task associated to this "TODO" comment.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      'Program:exit': () => {
        reportPatternInComment(context, todoPattern, 'completeTODO', true, isJiraAnchoredTodo);
      },
    };
  },
};

export function reportPatternInComment(
  context: Rule.RuleContext,
  pattern: string,
  messageId: string,
  caseSensitive = false,
  shouldIgnoreMatch: IgnorePatternMatch = () => false,
) {
  const normalizedPattern = caseSensitive ? pattern : pattern.toLowerCase();

  for (const comment of context.sourceCode.getAllComments() as TSESTree.Comment[]) {
    if (comment.value.trim().startsWith('eslint-disable')) {
      continue;
    }

    for (const loc of findPatternPositions(
      comment,
      normalizedPattern,
      caseSensitive,
      shouldIgnoreMatch,
    )) {
      context.report({ messageId, loc });
    }
  }
}

function findPatternPositions(
  comment: TSESTree.Comment,
  pattern: string,
  caseSensitive: boolean,
  shouldIgnoreMatch: IgnorePatternMatch,
) {
  const rawText = caseSensitive ? comment.value : comment.value.toLowerCase();
  if (!rawText.includes(pattern)) {
    return [];
  }

  const originalLines = comment.value.split(/\r\n?|\n/);
  const lines = rawText.split(/\r\n?|\n/);

  return lines.flatMap((line, index) =>
    findPatternPosition(line, originalLines[index], index, comment, pattern, shouldIgnoreMatch),
  );
}

function findPatternPosition(
  line: string,
  originalLine: string,
  lineIdx: number,
  comment: TSESTree.Comment,
  pattern: string,
  shouldIgnoreMatch: IgnorePatternMatch,
) {
  const index = line.indexOf(pattern);
  if (
    index < 0 ||
    isLetterAround(line, index, pattern) ||
    shouldIgnoreMatch(originalLine, index, pattern)
  ) {
    return [];
  }

  return [getPatternPosition(lineIdx, index, comment, pattern)];
}

/**
 * Checks whether a TODO is followed by a Jira issue key on the same line.
 * @param line The original comment line.
 * @param start The start index of the matched TODO marker.
 * @param pattern The tracked marker.
 * @return `true` when the TODO should be ignored.
 */
function isJiraAnchoredTodo(line: string, start: number, pattern: string) {
  return jiraIssueKeyPattern.test(line.slice(start + pattern.length));
}

function isLetterAround(line: string, start: number, pattern: string) {
  const end = start + pattern.length;

  const pre = start > 0 && letterPattern.test(line.charAt(start - 1));
  const post = end <= line.length - 1 && letterPattern.test(line.charAt(end));

  return pre || post;
}

function getPatternPosition(
  lineIdx: number,
  index: number,
  comment: TSESTree.Comment,
  pattern: string,
) {
  const line = comment.loc.start.line + lineIdx;
  const columnStart = lineIdx === 0 ? comment.loc.start.column + 2 : 0;
  const patternStart = columnStart + index;

  return {
    start: { line, column: patternStart },
    end: { line, column: patternStart + pattern.length },
  };
}
