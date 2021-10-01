/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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

import { LineIssues } from './issues';
import { extractEffectiveLine, LINE_ADJUSTMENT } from './locations';

const LINE_COMMENT = '//';
const START_WITH_NON_COMPLIANT = /^ *Noncompliant/i;
const NON_COMPLIANT_PATTERN = RegExp(
  ' *Noncompliant' +
    LINE_ADJUSTMENT +
    // issue count, ex: 2
    '(?: +(?<issueCount>\\d+))?' +
    ' *' +
    // messages, ex: {{msg1}} {{msg2}}
    '(?<messages>(\\{\\{.*?\\}\\} *)+)?',
  'i',
);

export interface Comment {
  value: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

export function extractComments(fileContent: string): Comment[] {
  const comments: Comment[] = [];
  const lines = fileContent.split('\n');
  for (const [index, line] of lines.entries()) {
    const commentPosition = line.indexOf(LINE_COMMENT);
    if (commentPosition !== -1) {
      const column = commentPosition + LINE_COMMENT.length;
      const value = line.substring(column);
      const endColumn = column + value.length + 1;
      comments.push({ value, line: index + 1, endLine: index + 1, column, endColumn });
    }
  }
  return comments;
}

export function extractLineIssues(comment: Comment): LineIssues | null {
  if (!START_WITH_NON_COMPLIANT.test(comment.value)) {
    return null;
  }
  const matcher = comment.value.match(NON_COMPLIANT_PATTERN);
  if (matcher === null) {
    throw new Error(`Invalid comment format at line ${comment.line}: ${comment.value}`);
  }
  const effectiveLine = extractEffectiveLine(comment.line, matcher);
  const messages = extractIssueCountOrMessages(
    comment.line,
    matcher.groups?.issueCount,
    matcher.groups?.messages,
  );
  return new LineIssues(effectiveLine, messages);
}

function extractIssueCountOrMessages(
  line: number,
  issueCountGroup: string | undefined,
  messageGroup: string | undefined,
) {
  if (messageGroup) {
    if (issueCountGroup) {
      throw new Error(
        `Error, you can not specify issue count and messages at line ${line}, you have to choose either:` +
          `\n  Noncompliant ${issueCountGroup}\nor\n  Noncompliant ${messageGroup}\n`,
      );
    }
    const messageContent = messageGroup.trim();
    return messageContent.substring(2, messageContent.length - 2).split(/\}\} *\{\{/);
  }
  const issueCount = issueCountGroup ? parseInt(issueCountGroup) : 1;
  return new Array<string>(issueCount);
}
