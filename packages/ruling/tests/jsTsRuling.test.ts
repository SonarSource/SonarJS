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
import { writeResults } from './lits';
import { HtmlAnalysisInput, analyzeHTML } from '@sonar/html';
const sourcesPath = path.join(__dirname, '..', '..', '..', 'its', 'sources');
const jsTsProjectsPath = path.join(sourcesPath, 'jsts', 'projects');

type RulingInput = {
  name: string;
  testDir?: string;
  exclusions?: string;
  folder?: string;
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

    projects = require('./data/projects')
      // courselit fails for some reason
      .filter(project => project.name == 'ag-grid')
      .filter(project => !project.name.includes('courselit'))
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
 * Load files and analyze project
 */
async function testProject(baseDir: string, rulingInput: RulingInput) {
  const projectPath = setProjectPath(baseDir, rulingInput.name, rulingInput.folder);
  const exclusions = setExclusions(rulingInput.exclusions, rulingInput.testDir);

  const projectFiles = setFiles(rulingInput, {}, projectPath, exclusions);
  const htmlFiles = extractHtmlFiles(projectFiles);

  const payload: ProjectAnalysisInput = {
    rules: getRules(),
    baseDir: projectPath,
    files: setFiles(rulingInput, {}, projectPath, exclusions),
  };

  const jsTsResults = await analyzeProject(payload);
  const htmlResults = await analyzeHtmlFiles(htmlFiles);
  const results = mergeIssues(jsTsResults, htmlResults);

  return results;
}

function setProjectPath(baseDir: string, name: string, folder?: string) {
  let projectPath;
  if (folder) {
    projectPath = path.join(baseDir, folder);
  } else {
    projectPath = path.join(baseDir, name);
  }
  return projectPath;
}

function setExclusions(exclusions: string, testDir?: string) {
  const DEFAULT_EXCLUSIONS = '**/.*,**/*.d.ts';
  if (exclusions) {
    exclusions += ',' + DEFAULT_EXCLUSIONS;
  } else {
    exclusions = DEFAULT_EXCLUSIONS;
  }
  if (testDir && testDir !== '') {
    exclusions += `,${testDir}/**/*`;
  }
  const exclusionsGlob = stringToGlob(exclusions.split(',').map(pattern => pattern.trim()));
  return exclusionsGlob;

  function stringToGlob(patterns: string[]): Minimatch[] {
    return patterns.map(pattern => new Minimatch(pattern, { nocase: true, matchBase: true }));
  }
}

function setFiles(
  rulingInput: RulingInput,
  files: JsTsFiles,
  projectPath: string,
  exclusions: Minimatch[],
) {
  getFiles(files, projectPath, exclusions);

  if (rulingInput.testDir != null) {
    const testFolder = path.join(projectPath, rulingInput.testDir);
    getFiles(files, testFolder, exclusions, 'TEST');
  }
  return files;
}

function extractHtmlFiles(files: JsTsFiles) {
  const htmlFiles: JsTsFiles = {};
  for (const filePath of Object.keys(files)) {
    if (filePath.endsWith('.html')) {
      htmlFiles[filePath] = files[filePath];
      delete files[filePath];
    }
  }
  return htmlFiles;
}

async function analyzeHtmlFiles(files: JsTsFiles) {
  const htmlResults = { files: {} };
  for (const [filePath, fileData] of Object.entries(files)) {
    const payload: HtmlAnalysisInput = {
      filePath,
      fileContent: fileData.fileContent,
    };
    try {
      const result = await analyzeHTML(payload);
      htmlResults.files[filePath] = result;
    } catch (err) {
      console.log(`Error analyzing ${filePath}: ${err}`);
    }
  }
  return htmlResults;
}

function mergeIssues(...resultsSet: ProjectAnalysisOutput[]) {
  const allResults = { files: {} };
  for (const results of resultsSet) {
    for (const [filePath, fileData] of Object.entries(results.files)) {
      if (!allResults.files[filePath]) {
        allResults.files[filePath] = { issues: [] };
      }
      allResults.files[filePath].issues.push(...fileData.issues);
    }
  }
  return allResults;
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
    return (
      (fs.statSync(filePath).isFile() &&
        (filePath.endsWith('.js') ||
          filePath.endsWith('.ts') ||
          filePath.endsWith('.tsx') ||
          filePath.endsWith('.jsx'))) ||
      filePath.endsWith('.vue') ||
      filePath.endsWith('.html') ||
      filePath.endsWith('.yml') ||
      filePath.endsWith('.yaml')
    );
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
  rules.push(...JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'rules.json'), 'utf8')));
  return rules;
}
