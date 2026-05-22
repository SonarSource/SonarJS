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
import {
  type File,
  type NormalizedAbsolutePath,
} from '../../../../../../shared/src/helpers/files.js';
import { parsePackageJson } from '../dependency-manifests/parsed-dependency-files.js';
import type { DerivedGeneratedSources } from './contracts.js';
import { GENERATED_SOURCE_DETECTORS } from './detectors/index.js';
import {
  createDerivedGeneratedSources,
  getPackageScripts,
  mergeDerivedGeneratedSources,
} from './shared.js';

export async function deriveGeneratedSources(
  baseDir: NormalizedAbsolutePath,
  packageJsons: ReadonlyMap<NormalizedAbsolutePath, File>,
  analyzableFiles?: ReadonlySet<NormalizedAbsolutePath>,
): Promise<DerivedGeneratedSources> {
  const derived = createDerivedGeneratedSources();

  for (const [packageDir, file] of packageJsons) {
    const packageJson = parsePackageJson(file);
    if (!packageJson) {
      continue;
    }

    const scripts = getPackageScripts(packageJson);
    for (const detector of GENERATED_SOURCE_DETECTORS) {
      mergeDerivedGeneratedSources(
        derived,
        await detector.detect({ baseDir, packageDir, packageJson, scripts, analyzableFiles }),
      );
    }
  }

  return derived;
}

export { extractFlagValues } from './shared.js';
