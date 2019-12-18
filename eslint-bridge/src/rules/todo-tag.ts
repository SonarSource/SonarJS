/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-1135

import { Rule } from "eslint";
import { TSESTree } from "@typescript-eslint/experimental-utils";

const message = 'Complete the task associated to this "TODO" comment.';

const todoPattern = "todo";

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      "Program:exit": () => {
        const sourceCode = context.getSourceCode();
        (sourceCode.getAllComments() as TSESTree.Comment[]).forEach(comment => {
          const rawText = comment.value.toLowerCase();

          if (rawText.includes(todoPattern)) {
            const lines = rawText.split(/\r\n?|\n/);

            for (let i = 0; i < lines.length; i++) {
              const index = lines[i].indexOf(todoPattern);
              if (index >= 0 && !isLetterAround(lines[i], index)) {
                context.report({
                  message,
                  loc: getPatternPosition(i, index, comment),
                });
              }
            }
          }
        });
      },
    };
  },
};

function isLetterAround(line: string, start: number) {
  const end = start + todoPattern.length;

  const pre = start > 0 && /[a-zA-Z]/.test(line.charAt(start - 1));
  const post = end < line.length - 1 && /[a-zA-Z]/.test(line.charAt(end));

  return pre || post;
}

function getPatternPosition(lineIdx: number, index: number, comment: TSESTree.Comment) {
  const line = comment.loc.start.line + lineIdx;
  const columnStart = lineIdx === 0 ? comment.loc.start.column + 2 : 0;
  const patternStart = columnStart + index;

  return {
    start: { line, column: patternStart },
    end: { line, column: patternStart + todoPattern.length },
  };
}
