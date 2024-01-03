/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { extractEffectiveLine, LINE_ADJUSTMENT, PrimaryLocation } from './locations';
import { QuickFix, QUICKFIX_ID, QUICKFIX_SEPARATOR } from './quickfixes';
import { Comment } from './comments';
import { FileIssues } from './file';

const START_WITH_NON_COMPLIANT = /^ *Noncompliant/i;
const NON_COMPLIANT_PATTERN = RegExp(
  ' *Noncompliant' +
    LINE_ADJUSTMENT +
    // issue count, ex: 2
    '(?: +(?<issueCount>\\d+))?' +
    // quickfixes, ex: [[qf1,qf2]]
    ' *(?:' +
    QUICKFIX_ID +
    ')?' +
    // messages, ex: {{msg1}} {{msg2}}
    ' *(?<messages>(\\{\\{.*?\\}\\} *)+)?',
  'i',
);

export class LineIssues {
  public primaryLocation: PrimaryLocation | null;
  public quickfixes: QuickFix[] = [];
  constructor(
    readonly line: number,
    readonly messages: string[],
    quickfixes: string | undefined,
    quickFixesMap: Map<string, QuickFix>,
  ) {
    this.primaryLocation = null;
    if (quickfixes?.length) {
      this.quickfixes = quickfixes
        .split(RegExp(QUICKFIX_SEPARATOR))
        .map((quickfixAndMessage, index) => {
          const [quickfixId, messageIndexStr] = quickfixAndMessage.split('=');
          const messageIndex = !messageIndexStr ? index : parseInt(messageIndexStr);
          if (quickFixesMap.has(quickfixId)) {
            throw new Error(`QuickFix ID ${quickfixId} has already been declared`);
          }
          if (messageIndex >= this.messages.length) {
            throw new Error(
              `QuickFix ID ${quickfixId} refers to message index ${messageIndex} but there are only ${this.messages.length} messages`,
            );
          }
          const [id, mandatory] = quickfixId.endsWith('!')
            ? [quickfixId.slice(0, -1), true]
            : [quickfixId, false];
          const qf = new QuickFix(id, mandatory, messageIndex, this);
          quickFixesMap.set(id, qf);
          return qf;
        });
    }
  }

  merge(other: LineIssues) {
    this.messages.push(...other.messages);
    if (this.primaryLocation === null) {
      this.primaryLocation = other.primaryLocation;
    }
  }
}

export function isNonCompliantLine(comment: string) {
  return START_WITH_NON_COMPLIANT.test(comment);
}

export function extractLineIssues(file: FileIssues, comment: Comment) {
  const matcher = NON_COMPLIANT_PATTERN.exec(comment.value);
  if (matcher === null) {
    throw new Error(`Invalid comment format at line ${comment.line}: ${comment.value}`);
  }
  const effectiveLine = extractEffectiveLine(comment.line, matcher);
  const messages = extractIssueCountOrMessages(
    comment.line,
    matcher.groups?.issueCount,
    matcher.groups?.messages,
  );
  const lineIssues = new LineIssues(
    effectiveLine,
    messages,
    matcher.groups?.quickfixes,
    file.quickfixes,
  );
  const existingLineIssues = file.expectedIssues.get(lineIssues.line);
  if (existingLineIssues) {
    existingLineIssues.merge(lineIssues);
  } else {
    file.expectedIssues.set(lineIssues.line, lineIssues);
  }
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
    return messageContent
      .substring('{{'.length, messageContent.length - '}}'.length)
      .split(/\}\} *\{\{/);
  }
  const issueCount = issueCountGroup ? parseInt(issueCountGroup) : 1;
  return new Array<string>(issueCount);
}
