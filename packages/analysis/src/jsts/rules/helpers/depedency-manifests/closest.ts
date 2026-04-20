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
import { type NormalizedAbsolutePath, ROOT_PATH } from '../files.js';
import { DEPENDENCY_MANIFESTS } from './index.js';
import { closestPatternCache } from '../find-up/closest.js';

/**
 * Finds the closest directory containing at least one dependency manifest.
 */
export function getClosestDependencyManifestDir(
  dir: NormalizedAbsolutePath,
  topDir?: NormalizedAbsolutePath,
): NormalizedAbsolutePath | undefined {
  for (const manifestName of DEPENDENCY_MANIFESTS) {
    const manifestPath = closestPatternCache
      .get(manifestName)
      .get(topDir ?? ROOT_PATH)
      .get(dir)?.path;

    if (manifestPath) {
      return dir;
    }
  }
}
