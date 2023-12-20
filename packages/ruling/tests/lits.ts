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
import { ProjectAnalysisOutput } from '@sonar/jsts';

const eslintIdToSonarId = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'eslint-to-sonar-id.json'), 'utf8'),
);

type LitsFormattedResult = {
  issues: {
    [ruleId: string]: {
      [filename: string]: number[];
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
  isJsTs: boolean = true,
  baseDir: string = path.join(__dirname, 'actual'),
) {
  const targetProjectPath = path.join(baseDir, isJsTs ? 'jsts' : 'css', projectName);
  fs.mkdirSync(targetProjectPath, { recursive: true });
  const litsResults = transformResults(projectPath, projectName, results);
  for (const [ruleId, { js: jsIssues, ts: tsIssues }] of Object.entries(litsResults.issues)) {
    const sonarRuleId = eslintIdToSonarId[ruleId];
    writeIssues(targetProjectPath, sonarRuleId, jsIssues);
    writeIssues(targetProjectPath, sonarRuleId, tsIssues, false);
  }
}

/**
 * Write the issues LITS style, if there are any
 */
function writeIssues(projectDir: string, ruleId: string, issues, isJs: boolean = true) {
  if (Object.keys(issues).length === 0) return;
  const issueFilename = path.join(
    projectDir,
    `${isJs ? 'javascript' : 'typescript'}-${ruleId}.json`,
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
function transformResults(projectPath: string, project: string, results: ProjectAnalysisOutput) {
  const litsResult: LitsFormattedResult = {
    issues: {},
  };
  for (const [filename, fileData] of Object.entries(results.files)) {
    const filenamePathInProject = retrieveFilename(projectPath.length + 1, filename);
    processIssues(litsResult, `${project}:${filenamePathInProject}`, fileData.issues);
  }
  return litsResult;

  function retrieveFilename(prefixLength: number, filename: string) {
    return filename.substring(prefixLength);
  }

  function processIssues(result, projectWithFilename, issues) {
    for (const issue of issues) {
      const ruleId = issue.ruleId;
      if (result.issues[ruleId] === undefined) result.issues[ruleId] = { js: {}, ts: {} };
      if (result.issues[ruleId][isJs(projectWithFilename)][projectWithFilename] === undefined)
        result.issues[ruleId][isJs(projectWithFilename)][projectWithFilename] = [];
      result.issues[ruleId][isJs(projectWithFilename)][projectWithFilename].push(issue.line);
    }
  }
  function isJs(filename: string) {
    return filename.endsWith('js') ? 'js' : 'ts';
  }
}
