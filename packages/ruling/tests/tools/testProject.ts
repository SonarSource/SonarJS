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
import { join, basename, dirname } from 'node:path/posix';
import fs from 'node:fs/promises';
import { Minimatch } from 'minimatch';
import { accept } from '../filter/JavaScriptExclusionsFilter.js';
import { writeResults } from './lits.js';
import { analyzeHTML } from '../../../html/src/index.js';
import { isHtmlFile, isJsTsFile, isYamlFile } from './languages.js';
import { analyzeYAML } from '../../../yaml/src/index.js';
import projects from '../data/projects.json' with { type: 'json' };
import { Linter } from '../../../jsts/src/linter/linter.js';
import {
  JsTsFiles,
  ProjectAnalysisOutput,
} from '../../../jsts/src/analysis/projectAnalysis/projectAnalysis.js';
import { analyzeProject } from '../../../jsts/src/analysis/projectAnalysis/projectAnalyzer.js';
import { toUnixPath } from '../../../shared/src/helpers/files.js';
import { AnalysisInput, AnalysisOutput } from '../../../shared/src/types/analysis.js';
import { createParsingIssue, parseParsingError } from '../../../bridge/src/errors/index.js';
import { compare, Result } from 'dir-compare';
import { RuleConfig } from '../../../jsts/src/linter/config/rule-config.js';
import { expect } from 'expect';

const sourcesPath = join(
  toUnixPath(import.meta.dirname),
  '..',
  '..',
  '..',
  '..',
  '..',
  'sonarjs-ruling-sources',
);
const jsTsProjectsPath = join(sourcesPath, 'jsts', 'projects');

const expectedPathBase = join(
  toUnixPath(import.meta.dirname),
  '..',
  '..',
  '..',
  '..',
  'its',
  'ruling',
  'src',
  'test',
  'expected',
  'jsts',
);
const actualPathBase = join(import.meta.dirname, '..', 'actual', 'jsts');

const SETTINGS_KEY = 'SONAR_RULING_SETTINGS';

const DEFAULT_EXCLUSIONS = [
  '**/.*',
  '**/.*/**',
  '**/*.d.ts',
  '**/node_modules/**',
  '**/bower_components/**',
  '**/dist/**',
  '**/vendor/**',
  '**/external/**',
  '**/contrib/**',
].map(pattern => new Minimatch(pattern, { nocase: true, dot: true }));

type ProjectsData = {
  name: string;
  folder: string;
  testDir: string;
  exclusions: string;
};

export function projectName(projectFile: string) {
  const filename = basename(toUnixPath(projectFile));
  return filename.substring(0, filename.length - '.ruling.test.ts'.length);
}

export async function testProject(projectName: string) {
  const settingsPath = process.env[SETTINGS_KEY];
  let params: {
    rules?: RuleConfig[];
    expectedPath?: string;
    actualPath?: string;
  } = {};
  if (settingsPath) {
    params = require(settingsPath);
  }

  const { folder, name, exclusions, testDir } = (projects as ProjectsData[]).find(
    p => p.name === projectName,
  );

  const rules = params?.rules || (await loadRules());
  const expectedPath = join(params?.expectedPath ?? expectedPathBase, name);
  const actualPath = join(params?.actualPath ?? actualPathBase, name);

  const projectPath = join(jsTsProjectsPath, folder ?? name);
  const exclusionsArray = exclusions?.split(',') || [];
  const exclusionsGlobs = exclusionsArray.map(
    pattern => new Minimatch(pattern.trim(), { nocase: true, matchBase: true }),
  );

  const { jsTsFiles, htmlFiles, yamlFiles } = await getFiles(projectPath, testDir, exclusionsGlobs);

  const results = await analyzeProject({
    rules,
    baseDir: projectPath,
    files: jsTsFiles,
  });
  await analyzeFiles(yamlFiles, analyzeYAML, results);

  /* we disable `no-var` for HTML */
  Linter.rulesConfig.forEach(rules => {
    rules['sonarjs/S3504'] = ['off'];
  });
  await analyzeFiles(htmlFiles, analyzeHTML, results);

  await writeResults(projectPath, name, results, actualPath);

  return await compare(expectedPath, actualPath, { compareContent: true });
}

export function ok(diff: Result) {
  expect(
    JSON.stringify(
      diff.diffSet.filter(value => value.state !== 'equal'),
      null,
      2,
    ),
  ).toEqual('[]');
}

/**
 * Stores in `jsTsFiles`, `htmlFiles` and `yamlFiles` the files
 * found in the given `dir`, ignoring the given `exclusions` and
 * assigning the given `type`
 */
async function getFiles(dir: string, testDir: string, exclusions: Minimatch[]) {
  const prefixLength = dir.length + 1;
  const files = await fs.readdir(dir, { recursive: true, withFileTypes: true });
  const jsTsFiles: JsTsFiles = {},
    htmlFiles: JsTsFiles = {},
    yamlFiles: JsTsFiles = {};

  const testPath = testDir ? join(dir, testDir) : null;
  for (const file of files) {
    const filePath = toUnixPath(join(file.parentPath, file.name));
    const relativePath = filePath.substring(prefixLength);
    if (!file.isFile()) continue;
    if (isExcluded(relativePath, exclusions) || isExcluded(filePath, DEFAULT_EXCLUSIONS)) {
      continue;
    }

    const fileType = testPath && dirname(filePath).startsWith(testPath) ? 'TEST' : 'MAIN';
    if (isHtmlFile(filePath)) {
      htmlFiles[filePath] = { fileType, filePath };
    } else if (isYamlFile(filePath)) {
      yamlFiles[filePath] = { fileType, filePath };
    } else if (isJsTsFile(filePath)) {
      const fileContent = await fs.readFile(filePath, 'utf8');
      if (!accept(filePath, fileContent)) {
        continue;
      }
      jsTsFiles[filePath] = { fileType, filePath, fileContent };
    }
  }
  return { jsTsFiles, htmlFiles, yamlFiles };
}

function isExcluded(filePath: string, exclusions: Minimatch[]) {
  return exclusions.some(exclusion => exclusion.match(filePath));
}

/**
 * Analyze files the old school way.
 * Used for HTML and YAML
 */
async function analyzeFiles(
  files: JsTsFiles,
  analyzer: (payload: AnalysisInput) => Promise<AnalysisOutput>,
  results: ProjectAnalysisOutput,
) {
  for (const [filePath, fileData] of Object.entries(files)) {
    try {
      results.files[filePath] = await analyzer(fileData);
    } catch (err) {
      results.files[filePath] = createParsingIssue(parseParsingError(err));
    }
  }
}

/**
 * Loading this through `fs` and not import because the file is absent at compile time
 */
async function loadRules() {
  const rulesPath = join(toUnixPath(import.meta.dirname), '..', 'data', 'rules.json');
  const rulesContent = await fs.readFile(rulesPath, 'utf8');
  return JSON.parse(rulesContent);
}
