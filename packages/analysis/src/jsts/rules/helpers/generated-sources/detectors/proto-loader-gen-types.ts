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
import type { PackageJson } from 'type-fest';
import { type GeneratedSourceDetector, PROTO_LOADER_GEN_TYPES_FAMILY } from '../contracts.js';
import { createDerivedGeneratedSources, matchesCommandToken, tokenizeScript } from '../shared.js';
import {
  deriveSourcesFromOutputDirectories,
  hasToolEvidence,
  resolveOutputDirectoriesFromScripts,
} from '../detector-api.js';

export const protoLoaderGenTypesDetector = {
  family: PROTO_LOADER_GEN_TYPES_FAMILY,

  async detect({ baseDir, packageDir, packageJson, scripts, analyzableFiles }) {
    const binTarget = getProtoLoaderBinTarget(packageJson);
    const matchesScript = (script: string) => isProtoLoaderInvocation(script, binTarget);
    if (!hasToolEvidence({ packageJson, scripts, matchesScript })) {
      return createDerivedGeneratedSources();
    }

    const outputDirectories = await resolveOutputDirectoriesFromScripts({
      baseDir,
      packageDir,
      scripts,
      matchesScript,
      flags: ['-O'],
    });
    return deriveSourcesFromOutputDirectories(
      PROTO_LOADER_GEN_TYPES_FAMILY,
      outputDirectories,
      true,
      analyzableFiles,
    );
  },
} satisfies GeneratedSourceDetector;

function getProtoLoaderBinTarget(packageJson: PackageJson) {
  if (typeof packageJson.bin === 'object' && packageJson.bin !== null) {
    const binTarget = packageJson.bin[PROTO_LOADER_GEN_TYPES_FAMILY];
    return typeof binTarget === 'string' ? binTarget : undefined;
  }
  return undefined;
}

function isProtoLoaderInvocation(script: string, binTarget: string | undefined) {
  const tokens = tokenizeScript(script);
  if (!tokens) {
    return false;
  }

  for (const token of tokens) {
    if (matchesCommandToken(token, PROTO_LOADER_GEN_TYPES_FAMILY)) {
      return true;
    }

    if (binTarget && token === binTarget) {
      return true;
    }
  }

  return false;
}
