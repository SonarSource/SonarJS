/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import type { Filesystem } from '../find-up/find-minimatch.js';
import type { PackageJson } from 'type-fest';
import {
  type NormalizedAbsolutePath,
  normalizeToAbsolutePath,
  ROOT_PATH,
  stripBOM,
  dirnamePath,
} from '../files.js';
import { PACKAGE_JSON } from './index.js';
import { patternInParentsCache } from '../find-up/all-in-parent-dirs.js';
import type { Rule } from 'eslint';

/**
 * Returns the project manifests that are used to resolve the dependencies imported by
 * the module named `filename`, up to the passed working directory.
 */
export const getManifests = (
  dir: NormalizedAbsolutePath,
  topDir?: NormalizedAbsolutePath,
  fileSystem?: Filesystem,
): Array<PackageJson> => {
  const files = patternInParentsCache
    .get(PACKAGE_JSON, fileSystem)
    .get(topDir ?? ROOT_PATH)
    .get(dir);

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

export const getManifestsSanitizePaths = (
  context: Rule.RuleContext,
  fileSystem?: Filesystem,
): Array<PackageJson> => {
  return getManifests(
    dirnamePath(normalizeToAbsolutePath(context.filename)),
    normalizeToAbsolutePath(context.cwd),
    fileSystem,
  );
};
