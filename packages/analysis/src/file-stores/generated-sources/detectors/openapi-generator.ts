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
import { basename, dirname } from 'node:path/posix';
import {
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../../../../shared/src/helpers/files.js';
import type {
  GeneratedSourceDetector,
  GeneratedSourceFileMatcher,
  GeneratedSourceProjectSnapshot,
} from '../contracts.js';
import { type ResolvedGeneratedOutputs } from '../detector-api.js';
import {
  addFamilyFiles,
  createDerivedGeneratedSources,
  extractFlagValuesFromTokens,
  isSourceFile,
  resolveLiteralPath,
} from '../shared.js';
import { taskInvocationInvokesCommand, type TaskInvocation } from '../task-invocations.js';

const OPENAPI_GENERATOR_FAMILY = '@openapitools/openapi-generator-cli';
const OPENAPI_GENERATOR_FILES_MANIFEST = '.openapi-generator/FILES';
const JS_TS_OPENAPI_GENERATORS = new Set([
  'graphql-nodejs-express-server',
  'k6',
  'nodejs-express-server',
]);
const OPENAPI_GENERATOR_NAME_FLAGS = ['-g', '--generator-name'];
const OPENAPI_OUTPUT_FLAGS = ['-o', '--output'];

export const openApiGeneratorDetector = {
  family: OPENAPI_GENERATOR_FAMILY,
  shouldPreload(filePath: NormalizedAbsolutePath) {
    return (
      basename(filePath).toLowerCase() === 'files' &&
      dirname(filePath).endsWith('/.openapi-generator')
    );
  },

  async detect({ baseDir, packageDir, projectSnapshot, taskInvocations, sourceFileMatcher }) {
    const matchesTaskInvocation = (taskInvocation: TaskInvocation) =>
      taskInvocationInvokesCommand(taskInvocation, 'openapi-generator-cli') &&
      taskInvocation.args[0] === 'generate' &&
      extractFlagValuesFromTokens(taskInvocation.args, OPENAPI_GENERATOR_NAME_FLAGS).some(
        isJsTsOpenApiGenerator,
      );
    const matchingInvocations = taskInvocations.filter(matchesTaskInvocation);
    if (matchingInvocations.length === 0) {
      return createDerivedGeneratedSources();
    }

    const outputPaths = matchingInvocations.flatMap(taskInvocation =>
      extractFlagValuesFromTokens(taskInvocation.args, OPENAPI_OUTPUT_FLAGS),
    );
    const resolvedOutputs = await resolveOpenApiOutputsFromFilesManifests(
      baseDir,
      packageDir,
      outputPaths,
      projectSnapshot,
      sourceFileMatcher,
    );
    const derived = createDerivedGeneratedSources();
    addFamilyFiles(OPENAPI_GENERATOR_FAMILY, resolvedOutputs.filePaths, derived);
    for (const watchedOutputPath of resolvedOutputs.watchedOutputPaths) {
      derived.watchedOutputPaths.add(watchedOutputPath);
    }
    return derived;
  },
} satisfies GeneratedSourceDetector;

function isJsTsOpenApiGenerator(generatorName: string) {
  return (
    generatorName.startsWith('javascript') ||
    generatorName.startsWith('typescript') ||
    JS_TS_OPENAPI_GENERATORS.has(generatorName)
  );
}

async function resolveOpenApiOutputsFromFilesManifests(
  baseDir: NormalizedAbsolutePath,
  packageDir: NormalizedAbsolutePath,
  outputPaths: Iterable<string>,
  projectSnapshot?: GeneratedSourceProjectSnapshot,
  sourceFileMatcher?: GeneratedSourceFileMatcher,
): Promise<ResolvedGeneratedOutputs> {
  const resolvedOutputs: ResolvedGeneratedOutputs = {
    filePaths: new Set(),
    outputDirectories: new Set(),
    watchedOutputPaths: new Set(),
  };

  for (const outputPath of outputPaths) {
    const resolvedOutputPath = resolveLiteralPath(outputPath, packageDir, baseDir);
    if (!resolvedOutputPath || resolvedOutputs.watchedOutputPaths.has(resolvedOutputPath)) {
      continue;
    }

    await addOpenApiManifestFiles(
      resolvedOutputs,
      baseDir,
      resolvedOutputPath,
      projectSnapshot,
      sourceFileMatcher,
    );
  }

  return resolvedOutputs;
}

async function addOpenApiManifestFiles(
  resolvedOutputs: ResolvedGeneratedOutputs,
  baseDir: NormalizedAbsolutePath,
  outputPath: NormalizedAbsolutePath,
  projectSnapshot?: GeneratedSourceProjectSnapshot,
  sourceFileMatcher?: GeneratedSourceFileMatcher,
) {
  resolvedOutputs.watchedOutputPaths.add(outputPath);

  if (!projectSnapshot?.directories.has(outputPath)) {
    return;
  }

  resolvedOutputs.outputDirectories.add(outputPath);
  const manifestEntries = await readOpenApiFilesManifest(outputPath, projectSnapshot);
  if (!manifestEntries) {
    return;
  }

  for (const manifestEntry of manifestEntries) {
    const resolvedFilePath = resolveLiteralPath(manifestEntry, outputPath, baseDir);
    if (!resolvedFilePath || !isSourceFile(resolvedFilePath, sourceFileMatcher)) {
      continue;
    }

    if (projectSnapshot?.sourceFiles.has(resolvedFilePath)) {
      resolvedOutputs.filePaths.add(resolvedFilePath);
    }
  }
}

async function readOpenApiFilesManifest(
  outputPath: NormalizedAbsolutePath,
  projectSnapshot?: GeneratedSourceProjectSnapshot,
) {
  const manifestPath = normalizeToAbsolutePath(OPENAPI_GENERATOR_FILES_MANIFEST, outputPath);
  const preloadedFile = projectSnapshot?.preloadedFiles.get(manifestPath);

  if (preloadedFile) {
    return parseOpenApiFilesManifestContents(
      typeof preloadedFile.content === 'string'
        ? preloadedFile.content
        : preloadedFile.content.toString('utf8'),
    );
  }

  return undefined;
}

function parseOpenApiFilesManifestContents(manifestContents: string) {
  return manifestContents
    .split(/\r?\n/u)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}
