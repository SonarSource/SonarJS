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
import type { GeneratedSourceDetector } from '../contracts.js';
import { resolveGeneratedOutputsFromLiteralPaths } from '../detector-api.js';
import {
  addFamilyFiles,
  createDerivedGeneratedSources,
  extractFlagValuesFromTokens,
  resolveLiteralPath,
} from '../shared.js';
import { taskInvocationInvokesCommand, type TaskInvocation } from '../task-invocations.js';

const PROTO_LOADER_GEN_TYPES_FAMILY = 'proto-loader-gen-types';
const PROTO_LOADER_OUTPUT_FLAGS = ['-O', '--outDir'];
const PROTO_LOADER_GENERATED_DIRECTORY_SEGMENT_PATTERN =
  /^(generated|generated[-_].+|.+[-_]generated)$/;

function isGeneratedLikeProtoLoaderDirectory(outputPath: string) {
  return outputPath
    .replaceAll('\\', '/')
    .split('/')
    .some(segment => PROTO_LOADER_GENERATED_DIRECTORY_SEGMENT_PATTERN.test(segment));
}

export const protoLoaderGenTypesDetector = {
  family: PROTO_LOADER_GEN_TYPES_FAMILY,

  async detect({ baseDir, packageDir, taskInvocations, sourceFileMatcher }) {
    const matchesTaskInvocation = (taskInvocation: TaskInvocation) =>
      taskInvocationInvokesCommand(taskInvocation, PROTO_LOADER_GEN_TYPES_FAMILY);
    const matchingInvocations = taskInvocations.filter(matchesTaskInvocation);
    if (matchingInvocations.length === 0) {
      return createDerivedGeneratedSources();
    }

    const outputPaths = matchingInvocations.flatMap(taskInvocation =>
      extractFlagValuesFromTokens(taskInvocation.args, PROTO_LOADER_OUTPUT_FLAGS),
    );
    const derived = createDerivedGeneratedSources();
    const recursiveOutputPaths = outputPaths.filter(isGeneratedLikeProtoLoaderDirectory);
    if (recursiveOutputPaths.length > 0) {
      const resolvedOutputs = await resolveGeneratedOutputsFromLiteralPaths(
        baseDir,
        packageDir,
        recursiveOutputPaths,
        true,
        sourceFileMatcher,
      );
      addFamilyFiles(PROTO_LOADER_GEN_TYPES_FAMILY, resolvedOutputs.filePaths, derived);
      for (const watchedOutputPath of resolvedOutputs.watchedOutputPaths) {
        derived.watchedOutputPaths.add(watchedOutputPath);
      }
    }

    for (const outputPath of outputPaths) {
      if (isGeneratedLikeProtoLoaderDirectory(outputPath)) {
        continue;
      }

      const resolvedPath = resolveLiteralPath(outputPath, packageDir, baseDir);
      if (resolvedPath) {
        derived.watchedOutputPaths.add(resolvedPath);
      }
    }

    return derived;
  },
} satisfies GeneratedSourceDetector;
