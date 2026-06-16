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
import { basename, extname } from 'node:path/posix';
import { type NormalizedAbsolutePath } from '../../../../../../../shared/src/helpers/files.js';
import type { GeneratedSourceDetector, GeneratedSourceProjectSnapshot } from '../contracts.js';
import {
  hasToolEvidence,
  resolveConfigPaths,
  resolveGeneratedOutputsFromLiteralPaths,
  type ResolvedGeneratedOutputs,
} from '../detector-api.js';
import {
  addFamilyFiles,
  createDerivedGeneratedSources,
  resolveLiteralPath,
  safeStat,
} from '../shared.js';
import { taskInvocationInvokesCommand, type TaskInvocation } from '../task-invocations.js';
import {
  parseGraphqlGenerates,
  parseGraphqlGeneratesFile,
  type GraphqlGenerateTarget,
} from './graphql-codegen-config.js';

const AUTO_DISCOVERED_GRAPHQL_CONFIGS = [
  'package.json',
  '.graphqlrc',
  '.graphqlrc.cjs',
  '.graphqlrc.cts',
  '.graphqlrc.js',
  '.graphqlrc.json',
  '.graphqlrc.mjs',
  '.graphqlrc.mts',
  '.graphqlrc.ts',
  '.graphqlrc.yaml',
  '.graphqlrc.yml',
  '.graphqlconfig',
  '.graphqlconfig.json',
  '.graphqlconfig.yaml',
  '.graphqlconfig.yml',
  'graphql.config.cjs',
  'graphql.config.cts',
  'graphql.config.js',
  'graphql.config.json',
  'graphql.config.mjs',
  'graphql.config.mts',
  'graphql.config.ts',
  'graphql.config.yaml',
  'graphql.config.yml',
  '.codegenrc.js',
  '.codegenrc.json',
  '.codegenrc.ts',
  '.codegenrc.yaml',
  '.codegenrc.yml',
  'codegen.config.js',
  'codegen.yml',
  'codegen.yaml',
  'codegen.json',
  'codegen.ts',
  'codegen.js',
] as const;
// These config names work when passed explicitly via --config / -c, but they are not
// part of GraphQL Codegen's implicit fallback search.
const EXPLICIT_GRAPHQL_CONFIGS = [
  'codegen.config.cjs',
  'codegen.config.cts',
  'codegen.config.mjs',
  'codegen.config.mts',
  'codegen.config.ts',
  'codegen.cts',
  'codegen.mts',
] as const;
const WATCHED_GRAPHQL_CONFIGS = [
  ...AUTO_DISCOVERED_GRAPHQL_CONFIGS,
  ...EXPLICIT_GRAPHQL_CONFIGS,
] as const;
const WATCHED_GRAPHQL_CONFIG_BASENAMES = new Set<string>(WATCHED_GRAPHQL_CONFIGS);
const GRAPHQL_YAML_CONFIG_BASENAMES = new Set(['.graphqlrc', '.graphqlconfig']);
const GRAPHQL_STRUCTURED_CONFIG_EXTENSIONS = new Set(['.json', '.yaml', '.yml']);
const GRAPHQL_SOURCE_CONFIG_EXTENSIONS = new Set(['.cjs', '.cts', '.js', '.mjs', '.mts', '.ts']);
const PACKAGE_JSON_BASENAME = 'package.json';
const GRAPHQL_CONFIG_FLAGS = ['--config', '-c'];
const DEFAULT_NEAR_OPERATION_FILE_EXTENSION = '.generated.ts';
const GRAPHQL_GENERATED_DIRECTORY_SEGMENTS = new Set(['generated', '__generated__', 'gql']);
const GRAPHQL_CODEGEN_FAMILY = '@graphql-codegen/cli';

export const graphqlCodegenDetector = {
  family: GRAPHQL_CODEGEN_FAMILY,
  shouldPreload(filePath: NormalizedAbsolutePath) {
    return WATCHED_GRAPHQL_CONFIG_BASENAMES.has(basename(filePath).toLowerCase());
  },
  watchedFilenames: WATCHED_GRAPHQL_CONFIGS,

  async detect({
    baseDir,
    packageDir,
    hasDependency,
    getDependencies,
    projectSnapshot,
    taskInvocations,
    sourceFileMatcher,
  }) {
    const matchesTaskInvocation = (taskInvocation: TaskInvocation) =>
      taskInvocationInvokesCommand(taskInvocation, 'graphql-codegen');
    if (
      !hasToolEvidence({
        hasDependency,
        getDependencies,
        taskInvocations,
        dependencyName: GRAPHQL_CODEGEN_FAMILY,
        matchesTaskInvocation,
      })
    ) {
      return createDerivedGeneratedSources();
    }

    const configPaths = await filterGraphqlConfigPaths(
      await resolveConfigPaths({
        baseDir,
        packageDir,
        projectSnapshot,
        taskInvocations,
        matchesTaskInvocation,
        flags: GRAPHQL_CONFIG_FLAGS,
        fallbackBasenames: AUTO_DISCOVERED_GRAPHQL_CONFIGS,
      }),
      projectSnapshot,
    );
    if (configPaths.size === 0) {
      return createDerivedGeneratedSources();
    }

    const derived = createDerivedGeneratedSources();
    for (const configPath of [...configPaths].sort((left, right) => left.localeCompare(right))) {
      derived.configPaths.add(configPath);
      const resolvedOutputs = await resolveGraphqlOutputs(
        baseDir,
        packageDir,
        configPath,
        projectSnapshot,
        sourceFileMatcher,
      );
      addFamilyFiles(GRAPHQL_CODEGEN_FAMILY, resolvedOutputs.filePaths, derived);
      for (const watchedOutputPath of resolvedOutputs.watchedOutputPaths) {
        derived.watchedOutputPaths.add(watchedOutputPath);
      }
    }

    return derived;
  },
} satisfies GeneratedSourceDetector;

async function filterGraphqlConfigPaths(
  configPaths: Set<NormalizedAbsolutePath>,
  projectSnapshot?: GeneratedSourceProjectSnapshot,
) {
  const filteredConfigPaths = new Set<NormalizedAbsolutePath>();

  for (const configPath of configPaths) {
    if (!isSupportedGraphqlConfigPath(configPath)) {
      continue;
    }

    if (
      basename(configPath).toLowerCase() !== PACKAGE_JSON_BASENAME ||
      (await getGraphqlGenerateTargets(configPath, projectSnapshot)).length > 0
    ) {
      filteredConfigPaths.add(configPath);
    }
  }

  return filteredConfigPaths;
}

function isSupportedGraphqlConfigPath(configPath: NormalizedAbsolutePath) {
  const configBasename = basename(configPath).toLowerCase();
  if (
    configBasename === PACKAGE_JSON_BASENAME ||
    GRAPHQL_YAML_CONFIG_BASENAMES.has(configBasename)
  ) {
    return true;
  }

  const configExtension = extname(configPath).toLowerCase();
  return (
    GRAPHQL_STRUCTURED_CONFIG_EXTENSIONS.has(configExtension) ||
    GRAPHQL_SOURCE_CONFIG_EXTENSIONS.has(configExtension)
  );
}

async function resolveGraphqlOutputs(
  baseDir: NormalizedAbsolutePath,
  packageDir: NormalizedAbsolutePath,
  configPath: NormalizedAbsolutePath,
  projectSnapshot?: GeneratedSourceProjectSnapshot,
  sourceFileMatcher?: (filePath: NormalizedAbsolutePath) => boolean,
): Promise<ResolvedGeneratedOutputs> {
  const generateTargets = await getGraphqlGenerateTargets(configPath, projectSnapshot);
  const resolvedOutputs: ResolvedGeneratedOutputs = {
    filePaths: new Set(),
    outputDirectories: new Set(),
    watchedOutputPaths: new Set(),
  };

  for (const generateTarget of [...generateTargets].sort((left, right) =>
    left.outputPath.localeCompare(right.outputPath),
  )) {
    mergeResolvedGeneratedOutputs(
      resolvedOutputs,
      await resolveGraphqlGenerateTargetOutputs(
        baseDir,
        packageDir,
        generateTarget,
        projectSnapshot,
        sourceFileMatcher,
      ),
    );
  }

  return resolvedOutputs;
}

async function resolveGraphqlGenerateTargetOutputs(
  baseDir: NormalizedAbsolutePath,
  packageDir: NormalizedAbsolutePath,
  generateTarget: GraphqlGenerateTarget,
  projectSnapshot?: GeneratedSourceProjectSnapshot,
  sourceFileMatcher?: (filePath: NormalizedAbsolutePath) => boolean,
) {
  if (!isGraphqlDirectoryOutput(generateTarget.outputPath)) {
    return resolveGeneratedOutputsFromLiteralPaths(
      baseDir,
      packageDir,
      [generateTarget.outputPath],
      true,
      createGraphqlOutputFileMatcher(generateTarget, sourceFileMatcher),
      projectSnapshot,
    );
  }

  if (isNearOperationFilePreset(generateTarget.preset)) {
    return resolveGeneratedOutputsFromLiteralPaths(
      baseDir,
      packageDir,
      [generateTarget.outputPath],
      true,
      createNearOperationFileMatcher(generateTarget, sourceFileMatcher),
      projectSnapshot,
    );
  }

  if (isGeneratedOnlyGraphqlDirectory(generateTarget.outputPath)) {
    return resolveGeneratedOutputsFromLiteralPaths(
      baseDir,
      packageDir,
      [generateTarget.outputPath],
      true,
      sourceFileMatcher,
      projectSnapshot,
    );
  }

  return watchOnlyGraphqlDirectoryOutput(
    baseDir,
    packageDir,
    generateTarget.outputPath,
    projectSnapshot,
  );
}

function isGraphqlDirectoryOutput(outputPath: string) {
  const normalizedPath = outputPath.replaceAll('\\', '/');
  return normalizedPath.endsWith('/') || extname(normalizedPath) === '';
}

function isNearOperationFilePreset(preset?: string) {
  return preset?.includes('near-operation-file') === true;
}

function isGeneratedOnlyGraphqlDirectory(outputPath: string) {
  return outputPath
    .replaceAll('\\', '/')
    .split('/')
    .some(segment => GRAPHQL_GENERATED_DIRECTORY_SEGMENTS.has(segment));
}

function createGraphqlOutputFileMatcher(
  generateTarget: GraphqlGenerateTarget,
  sourceFileMatcher?: (filePath: NormalizedAbsolutePath) => boolean,
) {
  if (!isNearOperationFilePreset(generateTarget.preset)) {
    return sourceFileMatcher;
  }

  return createNearOperationFileMatcher(generateTarget, sourceFileMatcher);
}

function createNearOperationFileMatcher(
  generateTarget: GraphqlGenerateTarget,
  sourceFileMatcher?: (filePath: NormalizedAbsolutePath) => boolean,
) {
  const generatedFileExtension =
    generateTarget.generatedFileExtension ?? DEFAULT_NEAR_OPERATION_FILE_EXTENSION;

  return (filePath: NormalizedAbsolutePath) =>
    filePath.endsWith(generatedFileExtension) && (sourceFileMatcher?.(filePath) ?? true);
}

async function watchOnlyGraphqlDirectoryOutput(
  baseDir: NormalizedAbsolutePath,
  packageDir: NormalizedAbsolutePath,
  outputPath: string,
  projectSnapshot?: GeneratedSourceProjectSnapshot,
): Promise<ResolvedGeneratedOutputs> {
  const resolvedOutputs: ResolvedGeneratedOutputs = {
    filePaths: new Set(),
    outputDirectories: new Set(),
    watchedOutputPaths: new Set(),
  };
  const resolvedPath = resolveLiteralPath(outputPath, packageDir, baseDir);
  if (!resolvedPath) {
    return resolvedOutputs;
  }

  resolvedOutputs.watchedOutputPaths.add(resolvedPath);

  if (projectSnapshot?.directories.has(resolvedPath)) {
    resolvedOutputs.outputDirectories.add(resolvedPath);
    return resolvedOutputs;
  }

  const stats = await safeStat(resolvedPath);
  if (stats?.isDirectory()) {
    resolvedOutputs.outputDirectories.add(resolvedPath);
  }

  return resolvedOutputs;
}

async function getGraphqlGenerateTargets(
  configPath: NormalizedAbsolutePath,
  projectSnapshot?: GeneratedSourceProjectSnapshot,
) {
  const preloadedFile = projectSnapshot?.preloadedFiles.get(configPath);
  return preloadedFile
    ? parseGraphqlGeneratesFile(preloadedFile)
    : parseGraphqlGenerates(configPath);
}

function mergeResolvedGeneratedOutputs(
  target: ResolvedGeneratedOutputs,
  source: ResolvedGeneratedOutputs,
) {
  for (const filePath of source.filePaths) {
    target.filePaths.add(filePath);
  }

  for (const outputDirectory of source.outputDirectories) {
    target.outputDirectories.add(outputDirectory);
  }

  for (const watchedOutputPath of source.watchedOutputPaths) {
    target.watchedOutputPaths.add(watchedOutputPath);
  }
}
