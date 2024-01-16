/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S1451/javascript

import { Rule } from 'eslint';

let cached: {
  headerFormat: string;
  isRegularExpression: boolean;
  expectedLines?: string[];
  searchPattern?: RegExp;
  failedToCompile?: boolean;
};

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      fixHeader: 'Add or update the header of this file.',
    },
  },
  create(context: Rule.RuleContext) {
    updateCache(context.options);

    if (cached.failedToCompile) {
      // don't visit anything
      return {};
    }

    return {
      'Program:exit'() {
        if (cached.isRegularExpression) {
          checkRegularExpression(cached.searchPattern!, context);
        } else {
          checkPlainText(cached.expectedLines!, context);
        }
      },
    };
  },
};

function checkPlainText(expectedLines: string[], context: Rule.RuleContext) {
  let matches = false;
  const lines = context.sourceCode.lines;

  if (expectedLines.length <= lines.length) {
    matches = true;

    let i = 0;
    for (const expectedLine of expectedLines) {
      const line = lines[i];
      i++;
      if (line !== expectedLine) {
        matches = false;
        break;
      }
    }
  }

  if (!matches) {
    addFileIssue(context);
  }
}

function checkRegularExpression(searchPattern: RegExp, context: Rule.RuleContext) {
  const fileContent = context.sourceCode.getText();
  const match = searchPattern.exec(fileContent);
  if (!match || match.index !== 0) {
    addFileIssue(context);
  }
}

function addFileIssue(context: Rule.RuleContext) {
  context.report({
    messageId: 'fixHeader',
    loc: { line: 0, column: 0 },
  });
}

function updateCache(options: any[]) {
  const [{ headerFormat, isRegularExpression }] = options;

  if (
    !cached ||
    cached.headerFormat !== headerFormat ||
    cached.isRegularExpression !== isRegularExpression
  ) {
    cached = {
      headerFormat,
      isRegularExpression,
    };

    if (isRegularExpression) {
      try {
        cached.searchPattern = new RegExp(headerFormat, 's');
        cached.failedToCompile = false;
      } catch (e) {
        console.error(`Failed to compile regular expression for rule S1451 (${e.message})`);
        cached.failedToCompile = true;
      }
    } else {
      cached.expectedLines = headerFormat.split(/(?:\r)?\n|\r/);
    }
  }
}
