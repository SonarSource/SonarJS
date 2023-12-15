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
import { FileType, setContext } from '../../shared/src';
import {
  JsTsFiles,
  ProjectAnalysisInput,
  ProjectAnalysisOutput,
  analyzeProject,
} from '../../jsts/src';
import { Minimatch } from 'minimatch';

// cache for rules
const rules = [];
let projects;

describe('Ruling', () => {
  beforeAll(() => {
    const sourcesPath = path.join(__dirname, '..', '..', '..', 'its', 'sources');
    const jsTsProjectsPath = path.join(sourcesPath, 'jsts', 'projects');
    projects = getFolders(jsTsProjectsPath).filter(project => !project.includes('TypeScript'));
  });
  it(
    'should run the ruling tests',
    async () => {
      await runRuling();
    },
    20 * 60 * 1000,
  );
  it.skip('should fix results', () => {
    const res = require('./actual/jsts/amplify/results.json');
    //const litsRes = transformResults('/Users/ilia.kebets/Dev/Sonar/SonarJS/its/sources/jsts/projects/amplify', 'wazaa', res);
    writeResults(
      'wazaa',
      res,
      '/Users/ilia.kebets/Dev/Sonar/SonarJS/its/sources/jsts/projects/amplify',
    );
  });
});

async function runRuling() {
  for (const project of projects) {
    console.log(`Testing project ${project}`);
    const results = await testProject(project);
    writeResults(pickLastFolder(project), results, project);
  }
}

function pickLastFolder(projectPath: string) {
  return projectPath.split(path.posix.sep).at(-1);
}

/**
 * Writes the given `results` in its associated `project` folder
 *
 * @param project
 * @param results
 * @param isJsTs
 * @param baseDir
 */
function writeResults(
  project: string,
  results: ProjectAnalysisOutput,
  sourceDir: string,
  isJsTs: boolean = true,
  baseDir: string = path.join(__dirname, 'actual'),
) {
  const projectDir = path.join(baseDir, isJsTs ? 'jsts' : 'css', project);
  fs.mkdirSync(projectDir, { recursive: true });
  const litsResults = transformResults(sourceDir, project, results);
  for (const [ruleId, { js: jsIssues, ts: tsIssues }] of Object.entries(litsResults.issues)) {
    writeIssues(projectDir, ruleId, jsIssues);
    writeIssues(projectDir, ruleId, tsIssues, false);
  }

  function writeIssues(projectDir: string, ruleId: string, issues, isJs: boolean = true) {
    if (Object.keys(issues).length === 0) return;
    const issueFilename = path.join(
      projectDir,
      `${isJs ? 'javascript' : 'typescript'}-${ruleId}.json`,
    );
    fs.writeFileSync(issueFilename, JSON.stringify(issues, null, 2));
  }
}

type LitsFormattedResult = {
  issues: {
    [ruleId: string]: {
      [filename: string]: number[];
    };
  };
};

function transformResults(
  projectsSourceDir: string,
  project: string,
  results: ProjectAnalysisOutput,
) {
  const litsResult: LitsFormattedResult = {
    issues: {},
  };
  for (const [filename, fileData] of Object.entries(results.files)) {
    const filenamePathInProject = retrieveFilename(projectsSourceDir.length + 1, filename);
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
 * Returns all the folders in the given `dir`
 *
 * @param dir
 * @returns
 */
function getFolders(dir: string) {
  const ignore = new Set(['.github']);
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !ignore.has(dirent.name))
    .map(dirent => path.join(dir, dirent.name));
}

/**
 * Load files and analyze project
 *
 * @param projectPath
 * @param exclusions
 * @returns
 */
function testProject(projectPath: string, exclusions: string = '') {
  const payload: ProjectAnalysisInput = {
    rules: getRules(),
    environments: [],
    globals: [],
    baseDir: projectPath,
    files: {},
  };
  const files = {};
  const exclusionsGlob = stringToGlob(exclusions.split(','));
  getFiles(files, projectPath, exclusionsGlob);
  payload.files = files;
  //getFiles(files, projectPath, exclusionsGlob, 'TEST');
  return analyzeProject(payload);

  function stringToGlob(patterns: string[]): Minimatch[] {
    return patterns.map(pattern => new Minimatch(pattern, { nocase: true, matchBase: true }));
  }
}

/**
 * Stores in `acc` all the JS/TS files in the given `dir`,
 * ignoring the given `exclusions` and assigning the given `type`
 *
 * @param acc
 * @param dir
 * @param exclusions
 * @param type
 */
function getFiles(acc: JsTsFiles, dir: string, exclusions: Minimatch[], type: FileType = 'MAIN') {
  const files = fs.readdirSync(dir, { recursive: true }) as string[];
  for (const file of files) {
    if (!isJsTsFile(path.join(dir, file))) continue;
    if (!isExcluded(file, exclusions)) {
      acc[path.join(dir, file)] = { fileType: type };
    }
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
