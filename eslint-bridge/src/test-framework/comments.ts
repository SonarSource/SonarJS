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

export interface Comment {
  value: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

export function extractLineComments(fileContent: string): Comment[] {
  return fileContent
    .split('\n')
    .filter(l => l.trimStart().startsWith('//'))
    .map((line, index) => {
      const value = line.substring(line.indexOf("//") + 2);
      return { value , line: index, endLine: index, column: 1, endColumn: line.length };
    });
}

const REGEX_START_WITH_NON_COMPLIANT = /^ *Noncompliant/i;
const REGEX_NON_COMPLIANT = RegExp(
  ' *Noncompliant' +
    LINE_ADJUSTMENT +
    // issue count, ex: 2
    '(?: +(?<issueCount>\\d+))?' +
    ' *' +
    // messages, ex: {{msg1}} {{msg2}}
    '(?<messages>(\\{\\{.*?\\}\\} *)+)?',
  'i',
);

export function parseNonCompliantComment(comment: Comment) {
  if (REGEX_START_WITH_NON_COMPLIANT.test(comment.value)) {
    const matcher = comment.value.match(REGEX_NON_COMPLIANT);
    if (matcher === null) {
      throw new Error(`Invalid comment format line ${comment.line} : ${comment.value}`);
    }
    const effectiveLine = extractEffectiveLine(comment.line, matcher);
    const messages = extractIssueCountOrMessages(
      comment.line,
      matcher.groups ? matcher.groups.issueCount : undefined,
      matcher.groups ? matcher.groups.messages : undefined,
    );
    return new LineIssues(effectiveLine, messages, null);
  }
  return null;
}

export function extractParams(paramGroup: string | undefined) {
  const params = new Map<string, string>();
  if (paramGroup !== undefined) {
    paramGroup
      .trim()
      .split(';')
      .map(s => s.split('=', 2))
      .forEach(arr => params.set(arr[0], arr.length === 2 ? arr[1] : ''));
  }
  return params;
}

function extractIssueCountOrMessages(
  line: number,
  issueCountGroup: string | undefined,
  messageGroup: string | undefined,
) {
  if (messageGroup !== undefined) {
    if (issueCountGroup !== undefined) {
      throw new Error(
        `Error, you can not specify issue count and messages at line ${line}, you have to choose either:\n  Noncompliant ${issueCountGroup}\nor\n  Noncompliant ${messageGroup}\n`,
      );
    }
    const messageContent = messageGroup.trim();
    return messageContent.substring(2, messageContent.length - 2).split('\\}\\} *\\{\\{');
  }
  const issueCount = issueCountGroup === undefined ? 1 : Number.parseInt(issueCountGroup);
  return new Array<string>(issueCount);
}
