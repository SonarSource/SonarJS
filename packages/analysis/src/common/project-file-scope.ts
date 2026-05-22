/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import path from 'node:path';
import { createConfiguration, getFilterPathParams, isAnalyzableFile } from './configuration.js';
import { findFiles } from './find-files.js';
import { filterPathAndGetFileType, isJsTsExcluded } from './filter/filter-path.js';
import {
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../../shared/src/helpers/files.js';

export type SonarProperties = Map<string, string>;

type RelativePathScopeStatus =
  | 'MAIN'
  | 'TEST'
  | 'OUTSIDE_SONAR_PATHS'
  | 'EXCLUDED_BY_SCAN_SETTINGS'
  | 'NOT_ANALYZABLE';

interface RelativePathClassification {
  absolutePath: NormalizedAbsolutePath;
  filePath: string;
  status: RelativePathScopeStatus;
}

function runWithoutDebugLogs<T>(action: () => T): T {
  const originalConsoleLog = console.log;

  console.log = (...argumentsList) => {
    if (argumentsList[0]?.startsWith?.('DEBUG ')) {
      return;
    }
    originalConsoleLog(...argumentsList);
  };

  try {
    return action();
  } finally {
    console.log = originalConsoleLog;
  }
}

async function runWithoutDebugLogsAsync<T>(action: () => Promise<T>): Promise<T> {
  const originalConsoleLog = console.log;

  console.log = (...argumentsList) => {
    if (argumentsList[0]?.startsWith?.('DEBUG ')) {
      return;
    }
    originalConsoleLog(...argumentsList);
  };

  try {
    return await action();
  } finally {
    console.log = originalConsoleLog;
  }
}

function splitCsv(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}

function combineCsv(...values: Array<string | undefined>) {
  return values.flatMap(value => splitCsv(value));
}

function optionalCsv(value: string | undefined) {
  const entries = splitCsv(value);
  return entries.length > 0 ? entries : undefined;
}

function optionalCombinedCsv(...values: Array<string | undefined>) {
  const entries = combineCsv(...values);
  return entries.length > 0 ? entries : undefined;
}

function toPosixPath(filePath: string) {
  return filePath.split(path.sep).join(path.posix.sep);
}

function createProjectConfiguration(projectDir: string, properties: SonarProperties) {
  return createConfiguration({
    baseDir: projectDir,
    sources: splitCsv(properties.get('sonar.sources')),
    inclusions: splitCsv(properties.get('sonar.inclusions')),
    exclusions: splitCsv(properties.get('sonar.exclusions')),
    tests: splitCsv(properties.get('sonar.tests')),
    testInclusions: splitCsv(properties.get('sonar.test.inclusions')),
    testExclusions: splitCsv(properties.get('sonar.test.exclusions')),
    jsTsExclusions: optionalCombinedCsv(
      properties.get('sonar.javascript.exclusions'),
      properties.get('sonar.typescript.exclusions'),
    ),
    jsSuffixes: optionalCsv(properties.get('sonar.javascript.file.suffixes')),
    tsSuffixes: optionalCsv(properties.get('sonar.typescript.file.suffixes')),
    cssSuffixes: optionalCsv(properties.get('sonar.css.file.suffixes')),
    htmlSuffixes: optionalCsv(properties.get('sonar.javascript.html.file.suffixes')),
    yamlSuffixes: optionalCsv(properties.get('sonar.javascript.yaml.file.suffixes')),
    cssAdditionalSuffixes: optionalCsv(
      properties.get('sonar.javascript.css.additional.file.suffixes'),
    ),
    detectBundles: properties.get('sonar.javascript.detectBundles')
      ? properties.get('sonar.javascript.detectBundles')?.toLowerCase() !== 'false'
      : undefined,
    detectGeneratedCode: properties.get('sonar.javascript.detectGeneratedCode')
      ? properties.get('sonar.javascript.detectGeneratedCode')?.toLowerCase() !== 'false'
      : undefined,
  });
}

function fileIsUnder(filePath: NormalizedAbsolutePath, paths: NormalizedAbsolutePath[]) {
  return paths.some(candidate => filePath === candidate || filePath.startsWith(`${candidate}/`));
}

export function classifyRelativePath(
  projectDir: string,
  properties: SonarProperties,
  relativePath: string,
): RelativePathClassification {
  const normalizedRelativePath = toPosixPath(relativePath);
  const absolutePath = normalizeToAbsolutePath(path.resolve(projectDir, normalizedRelativePath));
  const configuration = createProjectConfiguration(projectDir, properties);
  const filterPathParams = getFilterPathParams(configuration);

  return runWithoutDebugLogs(() => {
    if (!isAnalyzableFile(absolutePath, configuration)) {
      return {
        absolutePath,
        filePath: normalizedRelativePath,
        status: 'NOT_ANALYZABLE',
      } as const;
    }

    if (isJsTsExcluded(absolutePath, configuration.jsTsExclusions)) {
      return {
        absolutePath,
        filePath: normalizedRelativePath,
        status: 'EXCLUDED_BY_SCAN_SETTINGS',
      } as const;
    }

    const fileType = filterPathAndGetFileType(absolutePath, filterPathParams);
    if (fileType) {
      return {
        absolutePath,
        filePath: normalizedRelativePath,
        status: fileType,
      } as const;
    }

    const underSources = fileIsUnder(absolutePath, filterPathParams.sourcesPaths);
    const underTests = fileIsUnder(absolutePath, filterPathParams.testPaths);

    return {
      absolutePath,
      filePath: normalizedRelativePath,
      status: underSources || underTests ? 'EXCLUDED_BY_SCAN_SETTINGS' : 'OUTSIDE_SONAR_PATHS',
    } as const;
  });
}

export async function classifyProjectFiles(projectDir: string, properties: SonarProperties) {
  const configuration = createProjectConfiguration(projectDir, properties);
  const filterPathParams = getFilterPathParams(configuration);
  const sourceFiles: string[] = [];
  const testFiles: string[] = [];
  await runWithoutDebugLogsAsync(async () => {
    await findFiles(projectDir, configuration.jsTsExclusions, async (entry, filePath) => {
      if (!entry.isFile() || !isAnalyzableFile(filePath, configuration)) {
        return;
      }

      const fileType = filterPathAndGetFileType(filePath, filterPathParams);
      if (!fileType) {
        return;
      }

      const relativePath = toPosixPath(path.relative(projectDir, filePath));
      if (fileType === 'TEST') {
        testFiles.push(relativePath);
      } else {
        sourceFiles.push(relativePath);
      }
    });
  });

  sourceFiles.sort((left, right) => left.localeCompare(right));
  testFiles.sort((left, right) => left.localeCompare(right));
  return { sourceFiles, testFiles };
}
