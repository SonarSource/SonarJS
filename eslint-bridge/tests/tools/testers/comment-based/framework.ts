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

/**
 * Comment-based Testing Framework
 *
 * This utility is a TypeScript implementation of the commented-based testing framework of `sonar-analyzer-commons`,
 * which is implemented in Java. It supports most of the documented features except for the `effortToFix` feature.
 *
 * Basically, this testing framework extracts convential comments from a source file that denote expected occurences
 * of issues at well-located lines with expected messages and secondary locations, if any.
 *
 * As such, this testing framework cannot be used to test actual rule implementatons, as it only provides a helper
 * function to extract issue expectations. To use it, please refer to `launcher.test.ts`.
 *
 * @see https://github.com/SonarSource/sonar-analyzer-commons/tree/master/test-commons
 * @see https://github.com/SonarSource/sonar-analyzer-commons/tree/master/test-commons#noncompliant-format
 */

import { RuleTester } from 'eslint';
import { toEncodedMessage } from 'linting/eslint/rules/helpers';
import { FileIssues, LineIssues } from './helpers';
import { QuickFix } from './helpers/quickfixes';

/**
 * Extracts issue expectations from a comment-based test file
 * @param fileContent the contents of the comment-based test file
 * @param usesSonarRuntime A flag that indicates if the tested rule uses sonar-runtime parameter
 *  @returns an array of ESLint test case errors
 */
export function extractExpectations(
  fileContent: string,
  usesSonarRuntime: boolean,
): RuleTester.TestCaseError[] {
  const expectedIssues = new FileIssues(fileContent).getExpectedIssues();
  const errors: RuleTester.TestCaseError[] = [];
  expectedIssues.forEach(issue =>
    errors.push(...convertToTestCaseErrors(fileContent, issue, usesSonarRuntime)),
  );
  return errors;
}

function convertToTestCaseErrors(
  fileContent: string,
  issue: LineIssues,
  usesSecondaryLocations: boolean,
): RuleTester.TestCaseError[] {
  const encodeMessageIfNeeded = usesSecondaryLocations ? toEncodedMessage : message => message;
  const line = issue.line;
  const primary = issue.primaryLocation;
  const messages = [...issue.messages.values()];
  const quickfixes = issue.quickfixes ? [...issue.quickfixes?.values()] : [];
  if (primary === null) {
    return messages.map((message, index) => {
      const suggestions = applyQuickFixes(
        quickfixes.filter(quickfix => quickfix.messageIndex === index),
        fileContent,
        line - 1,
      );
      return message
        ? { line, ...suggestions, message: encodeMessageIfNeeded(message) }
        : { line, ...suggestions };
    });
  } else {
    const secondary = primary.secondaryLocations;
    if (secondary.length === 0) {
      return messages.map((message, index) => {
        const suggestions = applyQuickFixes(
          quickfixes.filter(quickfix => quickfix.messageIndex === index),
          fileContent,
          line - 1,
        );
        return message
          ? { ...primary.range, ...suggestions, message: encodeMessageIfNeeded(message) }
          : { ...primary.range, ...suggestions };
      });
    } else {
      return messages.map((message, index) => {
        const suggestions = applyQuickFixes(
          quickfixes.filter(quickfix => quickfix.messageIndex === index),
          fileContent,
          line - 1,
        );
        return {
          ...primary.range,
          ...suggestions,
          message: encodeMessageIfNeeded(
            message,
            secondary.map(s => s.range.toLocationHolder()),
            secondary.map(s => s.message),
          ),
        };
      });
    }
  }
}

interface Suggestions {
  suggestions?: RuleTester.SuggestionOutput[];
}

/**
 * Applies quick fix edits to a source code line. The fixed line will be formed by a
 * concatenation of three strings:
 *  - Original line from column 0 until start of fix column
 *  - Contents of fix
 *  - Original line from end of fix column until end of original line
 *
 * @param quickfixes array of quick fixes to apply
 * @param fileContent the file contents
 * @param issueLine index of line to apply the fixes to
 */
function applyQuickFixes(
  quickfixes: QuickFix[],
  fileContent: string,
  issueLine: number,
): Suggestions {
  if (quickfixes.length) {
    const suggestions: RuleTester.SuggestionOutput[] = [];
    for (const quickfix of quickfixes) {
      const { description: desc, start = 0, end, fix } = quickfix;
      if (fix !== undefined) {
        let appendAfterFix = '';
        const lines = fileContent.split(/\n/);
        const line = lines[issueLine];
        const containsNC = line.search(/\s*\{?\s*(\/\*|\/\/)\s*Noncompliant/);
        if (end === undefined) {
          if (containsNC >= 0) {
            appendAfterFix = line.slice(containsNC);
          }
        } else {
          if (end < start) {
            throw new Error(`End column cannot be lower than start position ${end} < ${start}`);
          }
          if (containsNC >= 0 && end > containsNC) {
            throw new Error(
              `End column cannot be in // Noncompliant comment ${end} > ${containsNC}`,
            );
          }
          appendAfterFix = line.slice(end);
        }
        lines[issueLine] = line.slice(0, start || 0) + fix + appendAfterFix;
        const result: RuleTester.SuggestionOutput = { output: lines.join('\n') };
        if (desc) {
          result.desc = desc;
        }
        suggestions.push(result);
      }
    }
    return { suggestions };
  }
  return {};
}
