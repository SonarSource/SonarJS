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
import { type GeneratedSourceDetector, OPENAPI_GENERATOR_FAMILY } from '../contracts.js';
import { createDerivedGeneratedSources } from '../shared.js';
import {
  deriveSourcesFromOutputDirectories,
  hasToolEvidence,
  resolveOutputDirectoriesFromScripts,
} from '../detector-api.js';

export const openApiGeneratorDetector = {
  family: OPENAPI_GENERATOR_FAMILY,

  async detect({ baseDir, packageDir, packageJson, scripts, analyzableFiles }) {
    const matchesScript = (script: string) => script.includes('openapi-generator-cli generate');
    if (
      !hasToolEvidence({
        packageJson,
        scripts,
        dependencyName: OPENAPI_GENERATOR_FAMILY,
        matchesScript,
      })
    ) {
      return createDerivedGeneratedSources();
    }

    const outputDirectories = await resolveOutputDirectoriesFromScripts({
      baseDir,
      packageDir,
      scripts,
      matchesScript,
      flags: ['-o', '--output'],
    });
    return deriveSourcesFromOutputDirectories(
      OPENAPI_GENERATOR_FAMILY,
      outputDirectories,
      false,
      analyzableFiles,
    );
  },
} satisfies GeneratedSourceDetector;
