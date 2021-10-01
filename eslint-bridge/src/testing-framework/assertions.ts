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

import { RuleTester } from 'eslint';
import { readFileSync } from 'fs';
import { toEncodedMessage } from '../utils';
import { FileIssues, LineIssues } from './issues';

export interface Tests {
  valid?: (string | RuleTester.ValidTestCase)[];
  invalid?: RuleTester.InvalidTestCase[];
}

export function readAssertions(filePath: string): Tests {
  const fileContent = readFileSync(filePath, { encoding: 'utf8' });
  const expectedIssues = new FileIssues(fileContent).getExpectedIssues();
  const errors: RuleTester.TestCaseError[] = [];
  for (const expectedIssue of expectedIssues) {
    errors.push(...convertToTestCaseErrors(expectedIssue));
  }
  console.log(`asserting ${errors.length} issues`);
  return { valid: [], invalid: [{ code: fileContent, errors }] };
}

function convertToTestCaseErrors(issue: LineIssues): RuleTester.TestCaseError[] {
  const line = issue.line;
  const primary = issue.primaryLocation;
  const messages = issue.messages;
  if (primary === null) {
    return messages.map(message => ({ line, message }));
  } else {
    const secondary = primary.secondaryLocations;
    if (secondary.length === 0) {
      return messages.map(message => ({ ...primary.range, message }));
    } else {
      return messages.map(message => ({
        ...primary.range,
        message: toEncodedMessage(
          message,
          secondary.map(s => s.range.toLocationHolder()),
          secondary.map(s => s.message),
        ),
      }));
    }
  }
}
