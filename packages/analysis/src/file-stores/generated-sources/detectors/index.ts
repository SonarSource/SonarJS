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
import type { NormalizedAbsolutePath } from '../../../../../shared/src/helpers/files.js';
import type { GeneratedSourceDetector } from '../contracts.js';
import { graphqlCodegenDetector } from './graphql-codegen.js';
import { openApiGeneratorDetector } from './openapi-generator.js';
import { protoLoaderGenTypesDetector } from './proto-loader-gen-types.js';

export const GENERATED_SOURCE_DETECTORS: readonly GeneratedSourceDetector[] = [
  graphqlCodegenDetector,
  openApiGeneratorDetector,
  protoLoaderGenTypesDetector,
];

export function getGeneratedSourceWatchedFilenames(
  detectors: readonly GeneratedSourceDetector[] = GENERATED_SOURCE_DETECTORS,
) {
  return [
    ...new Set(
      detectors.flatMap(detector =>
        (detector.watchedFilenames ?? []).map(filename => filename.toLowerCase()),
      ),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

export function shouldPreloadGeneratedSourcePath(
  filePath: NormalizedAbsolutePath,
  detectors: readonly GeneratedSourceDetector[] = GENERATED_SOURCE_DETECTORS,
) {
  return detectors.some(detector => detector.shouldPreload?.(filePath) === true);
}
