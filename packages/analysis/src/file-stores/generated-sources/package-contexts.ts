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
import type { File, NormalizedAbsolutePath } from '../../../../shared/src/helpers/files.js';
import { parsePackageJson } from '../../jsts/rules/helpers/dependency-manifests/parsed-dependency-files.js';
import { collectGeneratedSourceTaskInvocations, type TaskInvocation } from './task-invocations.js';

export type GeneratedSourcePackageContext = {
  packageDir: NormalizedAbsolutePath;
  packageJson: PackageJson;
  taskInvocations: readonly TaskInvocation[];
};

export async function collectGeneratedSourcePackageContexts(
  baseDir: NormalizedAbsolutePath,
  packageJsons: ReadonlyMap<NormalizedAbsolutePath, File>,
) {
  const packageContexts: GeneratedSourcePackageContext[] = [];

  for (const [packageDir, file] of [...packageJsons.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const packageJson = parsePackageJson(file);
    if (!packageJson) {
      continue;
    }

    packageContexts.push({
      packageDir,
      packageJson,
      taskInvocations: await collectGeneratedSourceTaskInvocations({
        baseDir,
        packageDir,
        packageJson,
      }),
    });
  }

  return packageContexts;
}

export function createGeneratedSourcePackageJsonMap(
  packageContexts: readonly GeneratedSourcePackageContext[],
) {
  return new Map(packageContexts.map(({ packageDir, packageJson }) => [packageDir, packageJson]));
}
