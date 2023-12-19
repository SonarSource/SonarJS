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
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { Minimatch } from 'minimatch';
import { FileType, setContext } from '../../shared/src';
import {
  JsTsFiles,
  ProjectAnalysisInput,
  ProjectAnalysisOutput,
  analyzeProject,
} from '../../jsts/src';
import { accept } from './filter/JavaScriptExclusionsFilter';
const eslintIdToSonarId: Record<string, string> = require('./tools/eslint-to-sonar-id.json');
const sourcesPath = path.join(__dirname, '..', '..', '..', 'its', 'sources');
const jsTsProjectsPath = path.join(sourcesPath, 'jsts', 'projects');

type RulingInput = {
  name: string;
  testDir?: string;
  exclusions?: string;
  folder?: string;
};

type LitsFormattedResult = {
  issues: {
    [ruleId: string]: {
      [filename: string]: number[];
    };
  };
};

// cache for rules
const rules = [];
let projects: RulingInput[] = [];

describe('Ruling', () => {
  beforeAll(() => {
    setContext({
      workDir: path.join(os.tmpdir(), 'sonarjs'),
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
      bundles: [],
    });

    projects = require('./projects')
      // courselit fails for some reason
      .filter(
        project => !project.name.includes('courselit') && !project.name.includes('TypeScript'),
      )
      .filter(project => !project.name.includes('yaml'));
  });

  it(
    `should run the ruling tests`,
    async () => {
      for (const project of projects) {
        const results = await testProject(jsTsProjectsPath, project);
        writeResults(path.join(jsTsProjectsPath, project.name), project.name, results);
      }
    },
    30 * 60 * 1000,
  );
});

/**
 * Writes the given `results` in its associated project folder
 */
function writeResults(
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
      JSON.stringify(issues, Object.keys(issues).sort(), 1).replaceAll(/\n\s+/g, '\n') + '\n',
    );
  }
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

/**
 * Load files and analyze project
 */
function testProject(baseDir: string, rulingInput: RulingInput) {
  const DEFAULT_EXCLUSIONS = '*.d.ts';

  let projectPath;
  if (rulingInput.folder) {
    projectPath = path.join(baseDir, rulingInput.folder);
  } else {
    projectPath = path.join(baseDir, rulingInput.name);
  }
  let exclusions = rulingInput.exclusions;
  if (exclusions) {
    exclusions += ',' + DEFAULT_EXCLUSIONS;
  } else {
    exclusions = DEFAULT_EXCLUSIONS;
  }
  const payload: ProjectAnalysisInput = {
    rules: getRules(),
    baseDir: projectPath,
    files: {},
  };
  const files = {};
  const exclusionsGlob = stringToGlob(exclusions.split(','));
  getFiles(files, projectPath, exclusionsGlob);
  payload.files = files;
  if (rulingInput.testDir != null) {
    const testFolder = path.join(projectPath, rulingInput.testDir);
    getFiles(files, testFolder, exclusionsGlob, 'TEST');
  }

  return analyzeProject(payload);

  function stringToGlob(patterns: string[]): Minimatch[] {
    return patterns.map(pattern => new Minimatch(pattern, { nocase: true, matchBase: true }));
  }
}

/**
 * Stores in `acc` all the JS/TS files in the given `dir`,
 * ignoring the given `exclusions` and assigning the given `type`
 */
function getFiles(acc: JsTsFiles, dir: string, exclusions: Minimatch[], type: FileType = 'MAIN') {
  const files = fs.readdirSync(dir, { recursive: true }) as string[];
  for (const file of files) {
    const absolutePath = path.join(dir, file);
    if (!isJsTsFile(absolutePath)) continue;
    const fileContent = fs.readFileSync(absolutePath, 'utf8');
    if (!accept(absolutePath, fileContent)) continue;
    if (isExcluded(file, exclusions)) continue;

    acc[absolutePath] = { fileType: type, fileContent };
  }

  function isJsTsFile(filePath: string) {
    return fs.statSync(filePath).isFile() && (filePath.endsWith('.js') || filePath.endsWith('.ts'));
  }

  function isExcluded(filePath: string, exclusions: Minimatch[]) {
    return exclusions.some(exclusion => exclusion.match(filePath));
  }
}

/**
 * The rules.json file was generated by running the ruling test with `.setDebugLogs(true)`
 * and capturing the `inputRules` parameter from `packages/jsts/src/linter/linters.ts#initializeLinter()`
 */
function getRules() {
  if (rules.length > 0) return rules;
  rules.push(...JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'rules.json'), 'utf8')));
  return rules;
}
