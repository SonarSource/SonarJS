/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import { Comment } from './comments';

const STARTS_WITH_QUICKFIX = /^ *(edit|fix)@/;
export const QUICKFIX_SEPARATOR = '[,\\s]+';
export const QUICKFIX_ID =
  '\\[\\[(?<quickfixes>\\w+(=\\d+)?(?:' + QUICKFIX_SEPARATOR + '(?:\\w+(=\\d+)?))*)\\]\\]';
export const QUICKFIX_DESCRIPTION_PATTERN = RegExp(
  ' *' +
    // quickfix description, ex: fix@qf1 {{Replace with foo}}
    'fix@(?<quickfixId>\\w+)' +
    // message, ex: {{msg}}
    ' *(?:\\{\\{(?<message>.*?)\\}\\}(?!\\}))? *' +
    '(?:\r(\n?)|\n)?',
);

export const QUICKFIX_EDIT_PATTERN = RegExp(
  ' *' +
    // quickfix edit, ex: edit@qf1
    'edit@(?<quickfixId>\\w+)' +
    // start and end columns, ex: [[sc=1;ec=5]] both are optional
    ' *(?:\\[\\[' +
    '(?<firstColumnType>sc|ec)=(?<firstColumnValue>\\d+)(?:;(?<secondColumnType>sc|ec)=(?<secondColumnValue>\\d+))?' +
    '\\]\\])?' +
    // replacement string, ex: {{foo}}
    ' *(?:\\{\\{(?<fix>.*?)\\}\\}(?!\\}))?' +
    ' *(?:\r(\n?)|\n)?',
);

export class QuickFix {
  public start: number | undefined = undefined;
  public end: number | undefined = undefined;
  public description: string | undefined = undefined;
  public fix: string | undefined = undefined;
  constructor(
    readonly id: string,
    readonly messageIndex: number,
    readonly lineIssues: LineIssues,
  ) {}
}

export function isQuickfixLine(comment: string) {
  return STARTS_WITH_QUICKFIX.test(comment);
}

export function extractQuickFixes(quickfixes: Map<string, QuickFix>, comment: Comment) {
  if (QUICKFIX_DESCRIPTION_PATTERN.test(comment.value)) {
    const matches = comment.value.match(QUICKFIX_DESCRIPTION_PATTERN);
    const { quickfixId, message } = matches.groups;
    if (!quickfixes.has(quickfixId)) {
      throw new Error(
        `Unexpected quickfix ID '${matches.groups?.quickfixId}' found at ${comment.line}:${comment.column}`,
      );
    }
    quickfixes.get(quickfixId).description = message;
  } else if (QUICKFIX_EDIT_PATTERN.test(comment.value)) {
    const matches = comment.value.match(QUICKFIX_EDIT_PATTERN);
    const {
      quickfixId,
      firstColumnType,
      firstColumnValue,
      secondColumnType,
      secondColumnValue,
      fix,
    } = matches.groups;
    if (!quickfixes.has(quickfixId)) {
      throw new Error(
        `Unexpected quickfix ID '${matches.groups?.quickfixId}' found at ${comment.line}:${comment.column}`,
      );
    }
    const quickfix = quickfixes.get(quickfixId);
    quickfix.start =
      firstColumnType === 'sc'
        ? +firstColumnValue
        : secondColumnType === 'sc'
        ? +secondColumnValue
        : undefined;
    quickfix.end =
      firstColumnType === 'ec'
        ? +firstColumnValue
        : secondColumnType === 'ec'
        ? +secondColumnValue
        : undefined;
    quickfix.fix = fix;
  }
}
