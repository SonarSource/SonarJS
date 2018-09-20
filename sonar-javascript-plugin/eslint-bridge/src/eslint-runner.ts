/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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
import { parseSourceFile, isParseError, ParseError } from "./parser";
import { getIssues } from "./rules";
import * as fs from "fs";

interface InputRequest {
  filepath: string;
  fileContent?: string;
  rules: Rule[];
}

// TODO: Consider rules with parameters
export type Rule = string;

interface IssueReport {
  column: number;
  line: number;
  endColumn?: number;
  endLine?: number;
  ruleId: string | null;
  message: string;
  source: string | null;
}

export function processRequest(input: InputRequest) {
  let reportedIssues: IssueReport[] = [];
  const filepath = input.filepath;
  const fileContent = getFileContent(input);
  if (fileContent) {
    const sourceCode = parseSourceFile(fileContent);
    if (isParseError(sourceCode)) {
      reportedIssues = [toIssueReport(sourceCode)];
    } else {
      reportedIssues = getIssues(sourceCode, input.rules, filepath);
    }
  }
  return reportedIssues;
}

function getFileContent(input: InputRequest) {
  if (input.fileContent) {
    return input.fileContent;
  }
  try {
    const fileContent = fs.readFileSync(input.filepath, {
      encoding: "UTF-8"
    });
    return fileContent;
  } catch (e) {
    console.error(
      `Failed to find a source file matching path ${input.filepath}`
    );
  }
}

function toIssueReport(parseError: ParseError) {
  return Object.assign(parseError, {
    ruleId: null,
    source: null,
    message: `Parse error: ${parseError.message}`
  });
}
