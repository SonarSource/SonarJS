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
import type { File, NormalizedAbsolutePath } from '../../../../shared/src/helpers/files.js';
import type { DependenciesList } from '../../jsts/rules/helpers/dependency-manifests/resolvers/types.js';
import type { TaskInvocation } from './task-invocations.js';

export type GeneratedSourceFileMatcher = (filePath: NormalizedAbsolutePath) => boolean;

export type GeneratedSourceProjectSnapshot = {
  directories: ReadonlySet<NormalizedAbsolutePath>;
  sourceFiles: ReadonlySet<NormalizedAbsolutePath>;
  preloadedFiles: ReadonlyMap<NormalizedAbsolutePath, File>;
};

export type DerivedGeneratedSources = {
  familyByFile: Map<NormalizedAbsolutePath, string>;
  configPaths: Set<NormalizedAbsolutePath>;
  watchedOutputPaths: Set<NormalizedAbsolutePath>;
};

/**
 * Contract for generated-source detection plugins.
 *
 * Each detector owns one tool family and is responsible for:
 * - declaring cache-invalidating config basenames through `watchedFilenames`
 * - deriving only project-local generated files rooted under `baseDir`
 * - reporting any config files and declared output paths it inferred so the store can refresh on change
 */
export interface GeneratedSourceDetector {
  readonly family: string;
  readonly watchedFilenames?: readonly string[];
  readonly shouldPreload?: (filePath: NormalizedAbsolutePath) => boolean;
  readonly resolveDeclaredPreloadPaths?: (context: {
    baseDir: NormalizedAbsolutePath;
    packageDir: NormalizedAbsolutePath;
    taskInvocations: readonly TaskInvocation[];
  }) => Promise<ReadonlySet<NormalizedAbsolutePath>> | ReadonlySet<NormalizedAbsolutePath>;
  detect(context: {
    baseDir: NormalizedAbsolutePath;
    packageDir: NormalizedAbsolutePath;
    hasDependency?: (dependencyName: string) => boolean;
    getDependencies: () => DependenciesList;
    taskInvocations: readonly TaskInvocation[];
    projectSnapshot?: GeneratedSourceProjectSnapshot;
    sourceFileMatcher?: GeneratedSourceFileMatcher;
  }): Promise<DerivedGeneratedSources> | DerivedGeneratedSources;
}
