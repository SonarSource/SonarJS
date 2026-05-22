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
import { matchesCommandToken, tokenizeScript } from './shared.js';

export type TaskInvocation = {
  source: string;
  taskName: string;
  commandLine?: string;
  tokens?: readonly string[];
  normalizedCommands: readonly string[];
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
    const normalizedCommandByToken = getNormalizedCommandByToken(packageJson);

    return Object.entries(packageJson.scripts ?? {}).flatMap(([taskName, commandLine]) => {
      if (typeof commandLine !== 'string') {
        return [];
      }

      const tokens = tokenizeScript(commandLine);
      return [
        {
          source: 'package-json-script',
          taskName,
          commandLine,
          tokens,
          normalizedCommands: collectNormalizedCommands(tokens, normalizedCommandByToken),
        } satisfies TaskInvocation,
      ];
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
  return (
    taskInvocation.normalizedCommands.includes(commandName) ||
    taskInvocation.tokens?.some(token => matchesCommandToken(token, commandName)) === true ||
    taskInvocation.commandLine?.includes(commandName) === true
  );
}

function getNormalizedCommandByToken(packageJson: PackageJson) {
  const normalizedCommandByToken = new Map<string, string>();

  if (typeof packageJson.bin !== 'object' || packageJson.bin === null) {
    return normalizedCommandByToken;
  }

  for (const [commandName, commandTarget] of Object.entries(packageJson.bin)) {
    if (typeof commandTarget === 'string') {
      normalizedCommandByToken.set(commandTarget, commandName);
    }
  }

  return normalizedCommandByToken;
}

function collectNormalizedCommands(
  tokens: readonly string[] | undefined,
  normalizedCommandByToken: ReadonlyMap<string, string>,
) {
  if (!tokens) {
    return [];
  }

  const normalizedCommands = new Set<string>();
  for (const token of tokens) {
    const normalizedCommand = normalizedCommandByToken.get(token);
    if (normalizedCommand) {
      normalizedCommands.add(normalizedCommand);
    }
  }

  return [...normalizedCommands].sort((left, right) => left.localeCompare(right));
}
