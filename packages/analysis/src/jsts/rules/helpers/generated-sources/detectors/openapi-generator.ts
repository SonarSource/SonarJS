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
import { type GeneratedSourceDetector, OPENAPI_GENERATOR_FAMILY } from '../contracts.js';
import { createDerivedGeneratedSources } from '../shared.js';
import {
  deriveSourcesFromOutputDirectories,
  resolveOutputDirectoriesFromTaskInvocations,
} from '../detector-api.js';
import { taskInvocationInvokesCommand, type TaskInvocation } from '../task-invocations.js';

export const openApiGeneratorDetector = {
  family: OPENAPI_GENERATOR_FAMILY,

  async detect({ baseDir, packageDir, taskInvocations, sourceFileMatcher }) {
    const matchesTaskInvocation = (taskInvocation: TaskInvocation) =>
      taskInvocationInvokesCommand(taskInvocation, 'openapi-generator-cli generate');
    if (!taskInvocations.some(matchesTaskInvocation)) {
      return createDerivedGeneratedSources();
    }

    const outputDirectories = await resolveOutputDirectoriesFromTaskInvocations({
      baseDir,
      packageDir,
      taskInvocations,
      matchesTaskInvocation,
      flags: ['-o', '--output'],
    });
    return deriveSourcesFromOutputDirectories(
      OPENAPI_GENERATOR_FAMILY,
      outputDirectories,
      true,
      sourceFileMatcher,
    );
  },
} satisfies GeneratedSourceDetector;
