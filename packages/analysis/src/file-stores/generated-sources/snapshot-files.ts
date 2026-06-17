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
import { basename, extname } from 'node:path/posix';
import type { NormalizedAbsolutePath } from '../../../../shared/src/helpers/files.js';
import { PACKAGE_JSON } from '../../jsts/rules/helpers/dependency-manifests/index.js';
import { shouldPreloadGeneratedSourcePath } from './detectors/index.js';

const GENERATED_SOURCE_SOURCE_CONFIG_EXTENSIONS = new Set([
  '.cjs',
  '.cts',
  '.js',
  '.mjs',
  '.mts',
  '.ts',
]);
const GENERATED_SOURCE_STRUCTURED_CONFIG_EXTENSIONS = new Set(['.json', '.yaml', '.yml']);

export function shouldCaptureGeneratedSourceSnapshotPath(filePath: NormalizedAbsolutePath) {
  if (basename(filePath).toLowerCase() === PACKAGE_JSON) {
    return false;
  }

  if (shouldPreloadGeneratedSourcePath(filePath)) {
    return true;
  }

  const extension = extname(filePath).toLowerCase();
  return (
    GENERATED_SOURCE_SOURCE_CONFIG_EXTENSIONS.has(extension) ||
    GENERATED_SOURCE_STRUCTURED_CONFIG_EXTENSIONS.has(extension)
  );
}
