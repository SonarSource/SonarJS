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
import { readFile } from 'node:fs/promises';
import {
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../../../../../../shared/src/helpers/files.js';
import type { GeneratedSourceDetector } from '../contracts.js';
import { type ResolvedGeneratedOutputs } from '../detector-api.js';
import {
  addFamilyFiles,
  createDerivedGeneratedSources,
  extractFlagValuesFromTokens,
  isSourceFile,
  resolveLiteralPath,
  safeStat,
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

  async detect({ baseDir, packageDir, taskInvocations, sourceFileMatcher }) {
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
  sourceFileMatcher?: (filePath: NormalizedAbsolutePath) => boolean,
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
      sourceFileMatcher,
    );
  }

  return resolvedOutputs;
}

async function addOpenApiManifestFiles(
  resolvedOutputs: ResolvedGeneratedOutputs,
  baseDir: NormalizedAbsolutePath,
  outputPath: NormalizedAbsolutePath,
  sourceFileMatcher?: (filePath: NormalizedAbsolutePath) => boolean,
) {
  resolvedOutputs.watchedOutputPaths.add(outputPath);

  const stats = await safeStat(outputPath);
  if (!stats?.isDirectory()) {
    return;
  }

  resolvedOutputs.outputDirectories.add(outputPath);
  const manifestEntries = await readOpenApiFilesManifest(outputPath);
  if (!manifestEntries) {
    return;
  }

  for (const manifestEntry of manifestEntries) {
    const resolvedFilePath = resolveLiteralPath(manifestEntry, outputPath, baseDir);
    if (!resolvedFilePath || !isSourceFile(resolvedFilePath, sourceFileMatcher)) {
      continue;
    }

    const fileStats = await safeStat(resolvedFilePath);
    if (fileStats?.isFile()) {
      resolvedOutputs.filePaths.add(resolvedFilePath);
    }
  }
}

async function readOpenApiFilesManifest(outputPath: NormalizedAbsolutePath) {
  const manifestPath = normalizeToAbsolutePath(OPENAPI_GENERATOR_FILES_MANIFEST, outputPath);

  try {
    const manifestContents = await readFile(manifestPath, 'utf8');
    return manifestContents
      .split(/\r?\n/u)
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } catch {
    return undefined;
  }
}
