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
import { Issue, JsTsFiles, ProjectAnalysisOutput } from '../../../jsts/src';
import { JsTsLanguage } from '../../../shared/src';

/**
 * LITS formatted results with extra intermediate key js/ts
 * to define target file javascript-Sxxxx.json or typescript-Sxxxx.json
 */
type LitsFormattedResult = {
  issues: {
    [ruleId: string]: {
      js: FileIssues;
      ts: FileIssues;
    };
  };
};

type FileIssues = {
  [filename: string]: number[];
};

/**
 * Writes the given `results` in its associated project folder
 */
export function writeResults(
  projectPath: string,
  projectName: string,
  results: ProjectAnalysisOutput,
  fileSet: JsTsFiles[],
  actualPath: string,
) {
  const eslintIdToSonarId = loadKeysMapping();
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
 * Transform ProjectAnalysisOutput to LITS format
 */
function transformResults(
  projectPath: string,
  project: string,
  results: ProjectAnalysisOutput,
  fileSet: JsTsFiles[],
) {
  const litsResult: LitsFormattedResult = {
    issues: {},
  };
  for (const [filename, fileData] of Object.entries(results.files)) {
    const relativePath = getRelativePath(projectPath.length + 1, filename);
    const language = findFileLanguage(filename, fileSet);
    processIssues(litsResult, `${project}:${relativePath}`, fileData.issues, language);
  }
  return litsResult;

  function getRelativePath(prefixLength: number, filename: string) {
    return filename.substring(prefixLength);
  }

  function findFileLanguage(filename: string, fileSet: JsTsFiles[]) {
    for (const files of fileSet) {
      if (files.hasOwnProperty(filename)) {
        return files[filename].language;
      }
    }
    throw Error(`No language set for ${filename}`);
  }

  function processIssues(
    result: LitsFormattedResult,
    projectWithFilename: string,
    issues: Issue[],
    language: JsTsLanguage,
  ) {
    for (const issue of issues) {
      const ruleId = issue.ruleId;
      if (result.issues[ruleId] === undefined) {
        result.issues[ruleId] = { js: {}, ts: {} };
      }
      if (result.issues[ruleId][language][projectWithFilename] === undefined) {
        result.issues[ruleId][language][projectWithFilename] = [];
      }
      result.issues[ruleId][language][projectWithFilename].push(issue.line);
    }
  }
}

/**
 * Write the issues LITS style, if there are any
 */
function writeIssues(projectDir: string, ruleId: string, issues: FileIssues, isJs = true) {
  // we don't write empty files
  if (Object.keys(issues).length === 0) {
    return;
  }
  const issueFilename = path.join(
    projectDir,
    `${isJs ? 'javascript' : 'typescript'}-${handleS124(ruleId, isJs)}.json`,
  );
  fs.writeFileSync(
    issueFilename,
    // we spaces at the beginning of lines
    // and we sort the keys
    JSON.stringify(issues, Object.keys(issues).sort(), 1).replaceAll(/\n\s+/g, '\n') + '\n',
  );

  function handleS124(ruleId: string, isJs = true) {
    if (ruleId !== 'S124') {
      return ruleId;
    }
    if (isJs) {
      return 'CommentRegexTest';
    } else {
      return 'CommentRegexTestTS';
    }
  }
}

/**
 * Loading this through `fs` and not import because the file is absent at compile time
 */
function loadKeysMapping() {
  const pathToKeysMapping = path.join(__dirname, '..', 'data', 'eslint-to-sonar-id.json');
  return JSON.parse(fs.readFileSync(pathToKeysMapping, 'utf8'));
}
