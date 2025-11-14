/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { extractEffectiveLine, LINE_ADJUSTMENT, PrimaryLocation } from './locations.js';
import { QuickFix, QUICKFIX_ID, QUICKFIX_SEPARATOR } from './quickfixes.js';
import { Comment } from './comments.js';
import { FileIssues } from './file.js';

const START_WITH_NON_COMPLIANT = /^ *Noncompliant/i;
const NON_COMPLIANT_PATTERN = new RegExp(
  ' *Noncompliant' +
    LINE_ADJUSTMENT +
    // quickfixes, ex: [[qf1,qf2]]
    ' *(?:' +
    QUICKFIX_ID +
    ')?' +
    // messages, ex: {{msg1}} {{msg2}}
    String.raw` *(?<messages>(\{\{.*?\}\} *)+)?`,
  'i',
);

export class LineIssues {
  public primaryLocation: PrimaryLocation | null = null;
  public quickfixes: QuickFix[] = [];
  constructor(
    readonly line: number,
    readonly messages: string[],
    quickfixes: string | undefined,
    quickFixesMap: Map<string, QuickFix>,
  ) {
    if (quickfixes?.length) {
      this.quickfixes = quickfixes
        .split(new RegExp(QUICKFIX_SEPARATOR))
        .map((quickfixAndMessage, index) => {
          const [quickfixId, messageIndexStr] = quickfixAndMessage.split('=');
          const messageIndex = messageIndexStr ? Number.parseInt(messageIndexStr) : index;
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
    this.primaryLocation ??= other.primaryLocation;
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
  const messages = extractMessages(matcher.groups?.messages);
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
    file.addLocation(new PrimaryLocation(), lineIssues.line);
  }
}

function extractMessages(messageGroup: string | undefined) {
  if (messageGroup !== undefined) {
    const messageContent = messageGroup.trim();
    return messageContent
      .substring('{{'.length, messageContent.length - '}}'.length)
      .split(/\}\} *\{\{/);
  }
  return [''];
}
