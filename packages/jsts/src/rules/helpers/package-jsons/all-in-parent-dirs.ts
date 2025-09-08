/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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

import { createFindUp, Filesystem } from '../find-up.js';
import type { PackageJson } from 'type-fest';
import { stripBOM } from '../files.js';
import { ComputedCache } from '../../../../../shared/src/helpers/cache.js';
import fs from 'node:fs';
import { PACKAGE_JSON } from './index.js';

export const packageJsonsInParentsCache = new ComputedCache(
  (
    topDir: string | undefined,
    _cache: ComputedCache<any, any, Filesystem>,
    filesystem: Filesystem = fs,
  ) => {
    return createFindUp(PACKAGE_JSON, topDir, filesystem);
  },
);

/**
 * Returns the project manifests that are used to resolve the dependencies imported by
 * the module named `filename`, up to the passed working directory.
 */
export const getManifests = (
  path: string,
  workingDirectory?: string,
  fileSystem?: Filesystem,
): Array<PackageJson> => {
  const files = packageJsonsInParentsCache.get(workingDirectory, fileSystem).get(path);

  return files.map(file => {
    const content = file.content;

    try {
      return JSON.parse(stripBOM(content.toString()));
    } catch (error) {
      console.debug(`Error parsing package.json ${file.path}: ${error}`);

      return {};
    }
  });
};
