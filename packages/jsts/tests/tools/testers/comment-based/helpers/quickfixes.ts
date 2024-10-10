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
import { LineIssues } from './issues.js';
import { Comment } from './comments.js';
import { extractEffectiveLine, LINE_ADJUSTMENT } from './locations.js';

const STARTS_WITH_QUICKFIX = /^ *(edit|del|add|fix)@/;
export const QUICKFIX_SEPARATOR = '[,\\s]+';
export const QUICKFIX_ID =
  '\\[\\[(?<quickfixes>\\w+(=\\d+)?!?(?:' + QUICKFIX_SEPARATOR + '(?:\\w+(=\\d+)?!?))*)\\]\\]';
const QUICKFIX_DESCRIPTION_PATTERN = RegExp(
  ' *' +
    // quickfix description, ex: fix@qf1 {{Replace with foo}}
    'fix@(?<quickfixId>\\w+)' +
    // message, ex: {{msg}}
    ' *(?:\\{\\{(?<message>.*?)\\}\\}(?!\\}))? *' +
    '(?:\\r(\\n?)|\\n)?',
);

const QUICKFIX_CHANGE_PATTERN = RegExp(
  ' *' +
    // quickfix edit, ex: edit@qf1
    '(?<type>edit|add|del)@(?<quickfixId>\\w+)' +
    LINE_ADJUSTMENT +
    // start and end columns, ex: [[sc=1;ec=5]] both are optional
    ' *(?:\\[\\[' +
    '(?<firstColumnType>sc|ec)=(?<firstColumnValue>\\d+)(?:;(?<secondColumnType>sc|ec)=(?<secondColumnValue>\\d+))?' +
    '\\]\\])?' +
    // contents to be applied, ex: {{foo}}
    ' *(?:\\{\\{(?<contents>.*?)\\}\\}(?!\\}))?' +
    ' *(?:\\r(\\n?)|\\n)?',
);

type ChangeType = 'add' | 'del' | 'edit';

export type Change = {
  type: ChangeType;
  start: number | undefined;
  end: number | undefined;
  line: number;
  contents: string | undefined;
};

export class QuickFix {
  public changes: Change[] = [];
  public description: string | undefined = undefined;
  constructor(
    readonly id: string,
    readonly mandatory: boolean,
    readonly messageIndex: number,
    readonly lineIssues: LineIssues,
  ) {}
}

export function isQuickfixLine(comment: string) {
  return STARTS_WITH_QUICKFIX.test(comment);
}

export function extractQuickFixes(quickfixes: Map<string, QuickFix>, comment: Comment) {
  if (QUICKFIX_DESCRIPTION_PATTERN.test(comment.value)) {
    const matches = QUICKFIX_DESCRIPTION_PATTERN.exec(comment.value);
    const { quickfixId, message } = matches.groups;
    const quickfix = quickfixes.get(quickfixId);
    if (!quickfix) {
      throw new Error(
        `Unexpected quickfix ID '${quickfixId}' found at ${comment.line}:${comment.column}`,
      );
    } else if (quickfix.mandatory) {
      throw new Error(`ESLint fix '${quickfixId}' does not require description message`);
    }
    quickfix.description = message;
  } else if (QUICKFIX_CHANGE_PATTERN.test(comment.value)) {
    const matches = QUICKFIX_CHANGE_PATTERN.exec(comment.value);
    const {
      quickfixId,
      type,
      firstColumnType,
      firstColumnValue,
      secondColumnType,
      secondColumnValue,
      contents,
    } = matches.groups;
    if (!quickfixes.has(quickfixId)) {
      throw new Error(
        `Unexpected quickfix ID '${matches.groups?.quickfixId}' found at ${comment.line}:${comment.column}`,
      );
    }
    const quickfix = quickfixes.get(quickfixId);
    const line = extractEffectiveLine(quickfix.lineIssues.line, matches);
    const edit: Change = {
      line,
      type: type as ChangeType,
      start:
        firstColumnType === 'sc'
          ? +firstColumnValue
          : secondColumnType === 'sc'
            ? +secondColumnValue
            : undefined,
      end:
        firstColumnType === 'ec'
          ? +firstColumnValue
          : secondColumnType === 'ec'
            ? +secondColumnValue
            : undefined,
      contents,
    };
    quickfix.changes.push(edit);
  }
}
