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
import * as fs from 'fs';
import * as path from 'path';
import { Issue, JsTsFiles, ProjectAnalysisOutput } from '../../jsts/src';
import { JsTsLanguage } from '../../shared/src';
import eslintIdToSonarId from '../data/eslint-to-sonar-id.json';

type LitsFormattedResult = {
  issues: {
    [ruleId: string]: {
      js: {
        [filename: string]: number[];
      };
      ts: {
        [filename: string]: number[];
      };
    };
  };
};

/**
 * Writes the given `results` in its associated project folder
 */
export function writeResults(
  projectPath: string,
  projectName: string,
  results: ProjectAnalysisOutput,
  fileSet: { [key: string]: JsTsFiles },
  actualPath: string,
) {
  const targetProjectPath = path.join(actualPath, projectName);
  try {
    fs.rmSync(targetProjectPath, { recursive: true });
  } catch {}
  fs.mkdirSync(targetProjectPath, { recursive: true });
  const litsResults = transformResults(projectPath, projectName, results, fileSet);
  for (const [ruleId, { js: jsIssues, ts: tsIssues }] of Object.entries(litsResults.issues)) {
    const sonarRuleId = eslintIdToSonarId[ruleId] || ruleId;
    writeIssues(targetProjectPath, sonarRuleId, jsIssues);
    writeIssues(targetProjectPath, sonarRuleId, tsIssues, false);
  }
}

/**
 * Write the issues LITS style, if there are any
 */
function writeIssues(projectDir: string, ruleId: string, issues, isJs: boolean = true) {
  // we don't write empty files
  if (Object.keys(issues).length === 0) return;
  const issueFilename = path.join(
    projectDir,
    `${isJs ? 'javascript' : 'typescript'}-${
      ruleId === 'S124' ? (isJs ? 'CommentRegexTest' : 'CommentRegexTestTS') : ruleId
    }.json`,
  );
  fs.writeFileSync(
    issueFilename,
    // we remove both:
    // - 1 space before a newline (for closing bracket lines: " ]")
    // - 2 spaces before a newline (for line numbers)
    // and we sort the keys
    JSON.stringify(issues, Object.keys(issues).sort(), 1).replaceAll(/\n\s+/g, '\n') + '\n',
  );
}

/**
 * Transform ProjectAnalysisOutput to LITS format
 */
function transformResults(
  projectPath: string,
  project: string,
  results: ProjectAnalysisOutput,
  fileSet: { [key: string]: JsTsFiles },
) {
  const litsResult: LitsFormattedResult = {
    issues: {},
  };
  for (const [filename, fileData] of Object.entries(results.files)) {
    const filenamePathInProject = retrieveFilename(projectPath.length + 1, filename);
    let language;
    for (const files of Object.values(fileSet)) {
      if (files.hasOwnProperty(filename)) {
        language = files[filename].language;
        break;
      }
    }
    if (!language) {
      throw Error(`No language set for ${filename}`);
    }
    processIssues(litsResult, `${project}:${filenamePathInProject}`, fileData.issues, language);
  }
  return litsResult;

  function retrieveFilename(prefixLength: number, filename: string) {
    return filename.substring(prefixLength);
  }

  function processIssues(
    result: LitsFormattedResult,
    projectWithFilename: string,
    issues: Issue[],
    language: JsTsLanguage,
  ) {
    for (const issue of issues) {
      const ruleId = issue.ruleId;
      if (result.issues[ruleId] === undefined) result.issues[ruleId] = { js: {}, ts: {} };
      if (result.issues[ruleId][language][projectWithFilename] === undefined)
        result.issues[ruleId][language][projectWithFilename] = [];
      result.issues[ruleId][language][projectWithFilename].push(issue.line);
    }
  }
}
