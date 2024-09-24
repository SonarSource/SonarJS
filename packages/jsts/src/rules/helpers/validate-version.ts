/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import { getNearestPackageJsons } from './package-json.ts';
import * as semver from 'semver';

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
export function isSupported(filename: string, minVersions: MinimumVersions): boolean {
  validateVersions(minVersions);
  return isSupportedNodeVersion(filename, minVersions.node);
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
 * @param filename
 * @param requiredVersion
 * @returns
 */
function isSupportedNodeVersion(filename: string, requiredVersion?: string): boolean {
  if (!requiredVersion) {
    return true;
  }
  const packageJsons = getNearestPackageJsons(filename);
  const versionRange = packageJsons.find(pj => pj.contents.engines?.node)?.contents.engines?.node;
  if (!versionRange) {
    return true;
  }
  const projectMinVersion = semver.minVersion(versionRange);
  if (!projectMinVersion) {
    return true;
  }
  return semver.gte(projectMinVersion, requiredVersion);
}
