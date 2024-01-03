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
import { toEncodedMessage } from '../../../../src/rules/helpers';
import { FileIssues, LineIssues } from './helpers';
import { Change, QuickFix } from './helpers/quickfixes';

interface ExpectationsResult {
  errors: RuleTester.TestCaseError[];
  output: string | null;
}
/**
 * Extracts issue expectations from a comment-based test file
 * @param fileContent the contents of the comment-based test file
 * @param filePath used to know if it's Vue or not
 * @param usesSecondaryLocations A flag that indicates if the tested rule uses sonar-runtime parameter
 * @returns an array of ESLint test case errors
 */
export function extractExpectations(
  fileContent: string,
  filePath: string,
  usesSecondaryLocations: boolean,
): ExpectationsResult {
  const expectedIssues = new FileIssues(fileContent, filePath).getExpectedIssues();
  const encodeMessageIfNeeded = usesSecondaryLocations ? toEncodedMessage : message => message;
  const result: ExpectationsResult = { errors: [], output: fileContent };
  expectedIssues.forEach(issue => {
    const line = issue.line;
    const primary = issue.primaryLocation;
    const messages = [...issue.messages.values()];
    const quickfixes = issue.quickfixes ? [...issue.quickfixes.values()] : [];
    messages.forEach((message, index) => {
      const suggestions = applyQuickFixes(
        quickfixes.filter(quickfix => quickfix.messageIndex === index),
        fileContent,
        result,
        expectedIssues,
      );
      const error: RuleTester.TestCaseError = { ...suggestions, ...(primary?.range || { line }) };
      if (primary !== null) {
        const secondary = primary.secondaryLocations;
        if (secondary.length) {
          error.message = encodeMessageIfNeeded(
            message,
            secondary.map(s => s.range.toLocationHolder()),
            secondary.map(s => s.message),
          );
        }
      }
      if (!error.message && message) {
        error.message = encodeMessageIfNeeded(message);
      }

      result.errors.push(error);
    });
  });
  if (result.output === fileContent) {
    result.output = null;
  }
  return result;
}

interface Suggestions {
  suggestions?: RuleTester.SuggestionOutput[];
}

/**
 * Applies quick fix operations to the source code line.
 *
 * @param quickfixes array of quick fixes to apply
 * @param fileContent the file contents
 * @param result The result object to have access to the output attribute
 * @param issues the array of issues, needed if a reindex needs to be done on all quickfixes
 */
function applyQuickFixes(
  quickfixes: QuickFix[],
  fileContent: string,
  result: ExpectationsResult,
  issues: LineIssues[],
): Suggestions {
  const suggestions: RuleTester.SuggestionOutput[] = [];
  for (const quickfix of quickfixes) {
    const lines = (quickfix.mandatory ? result.output : fileContent).split(/\n/);
    const { description: desc, changes } = quickfix;
    for (const change of changes) {
      switch (change.type) {
        case 'add':
          addLine(lines, change);
          if (quickfix.mandatory) {
            reIndexLines(issues, true, change.line);
          }
          break;
        case 'del':
          deleteLine(lines, change);
          if (quickfix.mandatory) {
            reIndexLines(issues, false, change.line);
          }
          break;
        case 'edit':
          editLine(lines, change);
      }
    }

    const output = lines.join('\n');

    if (output !== fileContent) {
      if (quickfix.mandatory) {
        result.output = output;
      } else {
        const suggestion: RuleTester.SuggestionOutput = { output };
        if (desc) {
          suggestion.desc = desc;
        }
        suggestions.push(suggestion);
      }
    }
  }
  return suggestions.length ? { suggestions } : {};
}

/**
 * After quickfixes add or delete a line, re-index the lines higher than
 * then given index, incrementing them by one when increment is true
 * or decrementing them otherwise
 * @param issues all issues from the file
 * @param increment where the lines need to be incremented or decremented
 * @param start starting line from which the change should be made
 */
function reIndexLines(issues: LineIssues[], increment: boolean, start: number) {
  for (const issue of issues) {
    for (const quickfix of issue.quickfixes) {
      if (quickfix.mandatory) {
        for (const change of quickfix.changes) {
          if (change.line > start) {
            increment ? change.line++ : change.line--;
          }
        }
      }
    }
  }
}

/**
 * Applies quick fix edits to a source code line. The fixed line will be formed by a
 * concatenation of three strings:
 *  - Original line from column 0 until start of fix column
 *  - Contents of fix
 *  - Original line from end of fix column until end of original line
 *
 * @param lines array of lines from file
 * @param change the change descriptor
 */
function editLine(lines: string[], change: Change) {
  const { start, end, contents, line: issueLine } = change;
  if (contents !== undefined) {
    let appendAfterFix = '';
    const line = lines[issueLine - 1];
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
        throw new Error(`End column cannot be in // Noncompliant comment ${end} > ${containsNC}`);
      }
      appendAfterFix = line.slice(end);
    }
    lines[issueLine - 1] = line.slice(0, start || 0) + contents + appendAfterFix;
  }
}

/**
 * Adds a new line to the source code at the index and with the contents described
 * in the Change object
 *
 * @param lines array of lines from file
 * @param change the change descriptor
 */
function addLine(lines: string[], change: Change) {
  const { contents, line } = change;
  if (contents !== undefined) {
    lines.splice(line - 1, 0, contents);
  }
}

/**
 * Removes the line from the source code.
 *
 * @param lines array of lines from file
 * @param change the change descriptor
 */
function deleteLine(lines: string[], change: Change) {
  lines.splice(change.line - 1, 1);
}
