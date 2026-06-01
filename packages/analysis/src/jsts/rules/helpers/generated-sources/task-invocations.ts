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
import {
  isDirectCommandToken,
  matchesCommandToken,
  parseDirectCommandSegments,
  type ParsedCommandSegment,
} from './shared.js';

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
            ...normalizePackageJsonTaskInvocation(segment),
          }) satisfies TaskInvocation,
      );
    });
  },
} satisfies TaskInvocationProvider;

// The package.json script parser intentionally recognizes only simple command chains.
// Shell preambles such as `NODE_ENV=production tool ...`, command separators other than
// `&&`, and runner options such as `npx --yes tool ...` are left out until a detector
// needs that broader shell surface and can justify the parsing rules.
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

type InvocationTokens = Pick<TaskInvocation, 'command' | 'args'>;
type PackageJsonRunnerWrapperNormalizer = (
  tokens: InvocationTokens,
) => InvocationTokens | undefined;

// Keep normalization limited to wrappers that unambiguously execute a nested binary.
// Package-manager shorthands like `yarn <script>` or `npm run <script>` may resolve to
// user-defined scripts, so they stay raw until we can distinguish them safely.
const PACKAGE_JSON_RUNNER_WRAPPER_NORMALIZERS = [
  normalizeNpxTaskInvocation,
  normalizePnpmExecTaskInvocation,
] as const satisfies readonly PackageJsonRunnerWrapperNormalizer[];

function normalizePackageJsonTaskInvocation(segment: ParsedCommandSegment): ParsedCommandSegment {
  let normalized: InvocationTokens = {
    command: segment.command,
    args: segment.args,
  };

  while (true) {
    const next = unwrapKnownRunnerWrapper(normalized);
    if (!next) {
      return {
        ...segment,
        ...normalized,
      };
    }

    normalized = next;
  }
}

function unwrapKnownRunnerWrapper(tokens: InvocationTokens) {
  for (const normalizeWrapper of PACKAGE_JSON_RUNNER_WRAPPER_NORMALIZERS) {
    const normalized = normalizeWrapper(tokens);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

function normalizeNpxTaskInvocation(tokens: InvocationTokens) {
  return matchesCommandToken(tokens.command, 'npx')
    ? unwrapNestedCommandTokens(tokens.args)
    : undefined;
}

function normalizePnpmExecTaskInvocation(tokens: InvocationTokens) {
  return matchesCommandToken(tokens.command, 'pnpm') && tokens.args[0] === 'exec'
    ? unwrapNestedCommandTokens(tokens.args.slice(1))
    : undefined;
}

function unwrapNestedCommandTokens(args: readonly string[]): InvocationTokens | undefined {
  const commandIndex = args[0] === '--' ? 1 : 0;
  const command = args[commandIndex];

  if (!command || !isDirectCommandToken(command) || isOptionToken(command)) {
    return undefined;
  }

  return {
    command,
    args: args.slice(commandIndex + 1),
  };
}

function isOptionToken(token: string) {
  return token.startsWith('-') && token !== '-';
}
