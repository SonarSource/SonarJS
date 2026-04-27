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
import * as semver from 'semver';
import { getPackageJsonManifests } from './dependency-manifests/all-in-parent-dirs.js';
import type { NormalizedAbsolutePath } from './files.js';

/**
 * Minimum version per reference
 */
type MinimumVersions = {
  node?: string;
};

/**
 * Checks if context where the filename is located supports the provided
 * minimum versions.
 */
export function isSupported(
  dirname: NormalizedAbsolutePath,
  minVersions: MinimumVersions,
): boolean {
  validateVersions(minVersions);
  return isSupportedNodeVersion(dirname, minVersions.node);
}

/**
 * Check if the versions are valid semver
 */
function validateVersions(versions: MinimumVersions) {
  for (const [ref, version] of Object.entries(versions)) {
    if (semver.valid(version) === null) {
      throw new Error(`Invalid semver version: "${version}" for "${ref}"`);
    }
  }
}

/**
 * Check if the feature is supported by the minimum Node.js version of the project.
 *
 * @param dirname
 * @param requiredVersion
 * @returns
 */
function isSupportedNodeVersion(
  dirname: NormalizedAbsolutePath,
  requiredVersion?: string,
): boolean {
  if (!requiredVersion) {
    return true;
  }
  const packageJsons = getPackageJsonManifests(dirname);
  const versionRange = packageJsons.find(pj => pj.engines?.node)?.engines?.node;
  if (!versionRange) {
    return true;
  }
  const projectMinVersion = getProjectMinVersion(versionRange);
  if (!projectMinVersion) {
    return true;
  }
  return semver.gte(projectMinVersion, requiredVersion);
}

function getProjectMinVersion(versionRange: string) {
  try {
    return semver.minVersion(versionRange);
  } catch {
    // Some projects publish non-canonical engine ranges such as ">=10.00.0".
    // Loose parsing keeps the rule resilient instead of crashing the whole analysis.
    try {
      return semver.minVersion(versionRange, { loose: true });
    } catch {
      return null;
    }
  }
}
