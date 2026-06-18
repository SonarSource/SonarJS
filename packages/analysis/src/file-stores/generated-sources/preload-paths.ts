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
import type { NormalizedAbsolutePath } from '../../../../shared/src/helpers/files.js';
import { GENERATED_SOURCE_DETECTORS } from './detectors/index.js';
import type { GeneratedSourcePackageContext } from './package-contexts.js';

export async function collectGeneratedSourceDeclaredPreloadPaths(
  baseDir: NormalizedAbsolutePath,
  packageContexts: readonly GeneratedSourcePackageContext[],
) {
  const declaredPreloadPaths = new Set<NormalizedAbsolutePath>();

  for (const packageContext of packageContexts) {
    mergeDeclaredPreloadPaths(
      declaredPreloadPaths,
      await collectGeneratedSourceDeclaredPreloadPathsForPackage(baseDir, packageContext),
    );
  }

  return declaredPreloadPaths;
}

async function collectGeneratedSourceDeclaredPreloadPathsForPackage(
  baseDir: NormalizedAbsolutePath,
  { packageDir, taskInvocations }: GeneratedSourcePackageContext,
) {
  const declaredPreloadPaths = new Set<NormalizedAbsolutePath>();

  for (const detector of GENERATED_SOURCE_DETECTORS) {
    mergeDeclaredPreloadPaths(
      declaredPreloadPaths,
      await detector.resolveDeclaredPreloadPaths?.({
        baseDir,
        packageDir,
        taskInvocations,
      }),
    );
  }

  return declaredPreloadPaths;
}

function mergeDeclaredPreloadPaths(
  target: Set<NormalizedAbsolutePath>,
  source: Iterable<NormalizedAbsolutePath> | undefined,
) {
  if (!source) {
    return;
  }

  for (const filePath of source) {
    target.add(filePath);
  }
}
