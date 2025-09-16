/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S1135/javascript

import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';

const todoPattern = 'todo';
const letterPattern = /[\p{Letter}]/u;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      completeTODO: 'Complete the task associated to this "TODO" comment.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      'Program:exit': () => {
        reportPatternInComment(context, todoPattern, 'completeTODO');
      },
    };
  },
};

export function reportPatternInComment(
  context: Rule.RuleContext,
  pattern: string,
  messageId: string,
) {
  const sourceCode = context.sourceCode;
  for (const comment of sourceCode.getAllComments() as TSESTree.Comment[]) {
    const rawText = comment.value.toLowerCase();

    if (rawText.includes(pattern)) {
      const lines = rawText.split(/\r\n?|\n/);

      for (const [i, line] of lines.entries()) {
        const index = line.indexOf(pattern);
        if (index >= 0 && !isLetterAround(line, index, pattern)) {
          context.report({
            messageId,
            loc: getPatternPosition(i, index, comment, pattern),
          });
        }
      }
    }
  }
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
