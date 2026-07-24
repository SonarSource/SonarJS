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

type ImportMapSpecifier = {
  packageName: string;
  version?: string;
};

// Captures `npm:` payload as: package name (scoped or unscoped), optional version, optional ignored subpath.
const DENO_NPM_IMPORT_PATTERN = /^(@[^/]*\/[^/@]*|[^/@]+)(?:@([^/]*))?(?:\/.*)?$/;

/**
 * Parses an import map URL specifier matching the Deno npm format:
 * npm:<package>[@<version>][/<path>]
 */
export function parseInlineNPMImport(value: string): ImportMapSpecifier | undefined {
  if (!value.startsWith('npm:')) {
    return undefined;
  }

  const match = DENO_NPM_IMPORT_PATTERN.exec(value.slice('npm:'.length));
  if (!match) {
    return undefined;
  }

  const [, packageName, version] = match;
  return {
    packageName,
    version: version || undefined,
  };
}
