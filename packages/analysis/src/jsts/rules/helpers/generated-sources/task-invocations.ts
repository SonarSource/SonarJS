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
import type { PackageJson } from 'type-fest';
import type { NormalizedAbsolutePath } from '../../../../../../shared/src/helpers/files.js';
import { matchesCommandToken, parseDirectCommandSegments } from './shared.js';

export type TaskInvocation = {
  source: string;
  taskName: string;
  commandLine: string;
  command: string;
  args: readonly string[];
};

interface TaskInvocationProvider {
  readonly kind: string;
  collect(context: {
    baseDir: NormalizedAbsolutePath;
    packageDir: NormalizedAbsolutePath;
    packageJson: PackageJson;
  }): Promise<readonly TaskInvocation[]> | readonly TaskInvocation[];
}

const packageJsonTaskInvocationProvider = {
  kind: 'package-json-scripts',

  collect({ packageJson }) {
    return Object.entries(packageJson.scripts ?? {}).flatMap(([taskName, commandLine]) => {
      if (typeof commandLine !== 'string') {
        return [];
      }

      return parseDirectCommandSegments(commandLine).map(
        segment =>
          ({
            source: 'package-json-script',
            taskName,
            ...segment,
          }) satisfies TaskInvocation,
      );
    });
  },
} satisfies TaskInvocationProvider;

export const GENERATED_SOURCE_TASK_INVOCATION_PROVIDERS = [
  packageJsonTaskInvocationProvider,
] as const satisfies readonly TaskInvocationProvider[];

export async function collectGeneratedSourceTaskInvocations(context: {
  baseDir: NormalizedAbsolutePath;
  packageDir: NormalizedAbsolutePath;
  packageJson: PackageJson;
}) {
  const taskInvocations: TaskInvocation[] = [];

  for (const provider of GENERATED_SOURCE_TASK_INVOCATION_PROVIDERS) {
    taskInvocations.push(...(await Promise.resolve(provider.collect(context))));
  }

  return taskInvocations;
}

export function taskInvocationInvokesCommand(taskInvocation: TaskInvocation, commandName: string) {
  return matchesCommandToken(taskInvocation.command, commandName);
}
