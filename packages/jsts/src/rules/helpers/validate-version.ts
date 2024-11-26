/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
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
import { getManifests } from './package-json.js';

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
export function isSupported(dirname: string, minVersions: MinimumVersions): boolean {
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
 * @param filename
 * @param requiredVersion
 * @returns
 */
function isSupportedNodeVersion(dirname: string, requiredVersion?: string): boolean {
  if (!requiredVersion) {
    return true;
  }
  const packageJsons = getManifests(dirname);
  const versionRange = packageJsons.find(pj => pj.engines?.node)?.engines?.node;
  if (!versionRange) {
    return true;
  }
  const projectMinVersion = semver.minVersion(versionRange);
  if (!projectMinVersion) {
    return true;
  }
  return semver.gte(projectMinVersion, requiredVersion);
}
