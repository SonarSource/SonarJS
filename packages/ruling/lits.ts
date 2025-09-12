/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import fs from 'node:fs/promises';
import path from 'path';
import { ProjectAnalysisOutput } from '../jsts/src/analysis/projectAnalysis/projectAnalysis.js';

/**
 * LITS formatted results with extra intermediate key js/ts
 * to define target file javascript-Sxxxx.json or typescript-Sxxxx.json
 */
type LitsFormattedResult = {
  [ruleId: string]: {
    js: FileIssues;
    ts: FileIssues;
  };
};

type FileIssues = {
  [filename: string]: number[];
};

/**
 * Writes the given `results` in its associated project folder
 */
export async function writeResults(
  projectPath: string,
  projectName: string,
  results: ProjectAnalysisOutput,
  actualPath: string,
) {
  try {
    await fs.rm(actualPath, { recursive: true });
  } catch {}
  await fs.mkdir(actualPath, { recursive: true });
  const litsResults = transformResults(projectPath, projectName, results);
  for (const [ruleId, { js: jsIssues, ts: tsIssues }] of Object.entries(litsResults)) {
    await writeIssues(actualPath, ruleId, jsIssues);
    await writeIssues(actualPath, ruleId, tsIssues, false);
  }
}

/**
 * Transform ProjectAnalysisOutput to LITS format
 */
function transformResults(projectPath: string, project: string, results: ProjectAnalysisOutput) {
  const result: LitsFormattedResult = { S2260: { js: {}, ts: {} } }; // We already add parsing error rule
  for (const [filename, analysisOutput] of Object.entries(results.files)) {
    const relativePath = filename.substring(projectPath.length + 1);
    const projectWithFilename = `${project}:${relativePath}`;
    if ('issues' in analysisOutput) {
      for (const issue of analysisOutput.issues) {
        const { ruleId, language, line } = issue;
        result[ruleId] = result[ruleId] ?? { js: {}, ts: {} };
        result[ruleId][language][projectWithFilename] =
          result[ruleId][language][projectWithFilename] ?? [];
        result[ruleId][language][projectWithFilename].push(line);
      }
    } else if ('parsingError' in analysisOutput) {
      result.S2260.js[projectWithFilename] = [analysisOutput.parsingError.line ?? 0];
    }
  }
  return result;
}

/**
 * Write the issues LITS style, if there are any
 */
async function writeIssues(projectDir: string, ruleId: string, issues: FileIssues, isJs = true) {
  // we don't write empty files
  if (Object.keys(issues).length === 0) {
    return;
  }
  const issueFilename = path.join(
    projectDir,
    `${isJs ? 'javascript' : 'typescript'}-${handleS124(ruleId, isJs)}.json`,
  );
  await fs.writeFile(
    issueFilename,
    // we space at the beginning of lines
    // and we sort the keys
    JSON.stringify(issues, Object.keys(issues).sort(), 1).replaceAll(/\n\s+/g, '\n') + '\n',
  );
}

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
