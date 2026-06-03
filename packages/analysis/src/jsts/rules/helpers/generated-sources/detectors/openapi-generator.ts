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
} from '../shared.js';
import { taskInvocationInvokesCommand, type TaskInvocation } from '../task-invocations.js';

const OPENAPI_GENERATOR_FAMILY = '@openapitools/openapi-generator-cli';
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
    if (!taskInvocations.some(matchesTaskInvocation)) {
      return createDerivedGeneratedSources();
    }

    const outputPaths = taskInvocations.flatMap(taskInvocation => {
      if (!matchesTaskInvocation(taskInvocation)) {
        return [];
      }

      return extractFlagValuesFromTokens(taskInvocation.args, OPENAPI_OUTPUT_FLAGS);
    });
    const resolvedOutputs = await resolveGeneratedOutputsFromLiteralPaths(
      baseDir,
      packageDir,
      outputPaths,
      false,
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
