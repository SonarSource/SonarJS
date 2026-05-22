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
import type { NormalizedAbsolutePath } from '../../../../../../shared/src/helpers/files.js';
import type { DependenciesList } from '../dependency-manifests/resolvers/types.js';
import type { TaskInvocation } from './task-invocations.js';

export const GRAPHQL_CODEGEN_FAMILY = '@graphql-codegen/cli';
export const OPENAPI_GENERATOR_FAMILY = '@openapitools/openapi-generator-cli';
export const PROTO_LOADER_GEN_TYPES_FAMILY = 'proto-loader-gen-types';

export const SUPPORTED_GENERATED_SOURCE_FAMILIES = [
  GRAPHQL_CODEGEN_FAMILY,
  OPENAPI_GENERATOR_FAMILY,
  PROTO_LOADER_GEN_TYPES_FAMILY,
] as const;

export type GeneratedSourceFamily = (typeof SUPPORTED_GENERATED_SOURCE_FAMILIES)[number];

export type GeneratedSourceFileMatcher = (filePath: NormalizedAbsolutePath) => boolean;

export type DerivedGeneratedSources = {
  familyByFile: Map<NormalizedAbsolutePath, GeneratedSourceFamily>;
  configPaths: Set<NormalizedAbsolutePath>;
  outputDirectories: Set<NormalizedAbsolutePath>;
};

/**
 * Contract for generated-source detection plugins.
 *
 * Each detector owns one tool family and is responsible for:
 * - declaring cache-invalidating config basenames through `watchedFilenames`
 * - deriving only project-local generated files rooted under `baseDir`
 * - reporting any config files and output directories it inferred so the store can refresh on change
 */
export interface GeneratedSourceDetector {
  readonly family: GeneratedSourceFamily;
  readonly watchedFilenames?: readonly string[];
  detect(context: {
    baseDir: NormalizedAbsolutePath;
    packageDir: NormalizedAbsolutePath;
    getDependencies: () => DependenciesList;
    taskInvocations: readonly TaskInvocation[];
    sourceFileMatcher?: GeneratedSourceFileMatcher;
  }): Promise<DerivedGeneratedSources>;
}
