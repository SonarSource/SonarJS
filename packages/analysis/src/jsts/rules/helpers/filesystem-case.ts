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
// Kept free of analyzer dependencies: the fs hook must load before TypeScript.
let archivedCaseSensitivity: boolean | undefined;

export function setArchivedFileSystemCaseSensitivity(value: boolean | undefined): void {
  archivedCaseSensitivity = value;
}

export function getArchivedFileSystemCaseSensitivity(): boolean | undefined {
  return archivedCaseSensitivity;
}

export function canonicalPath<T extends string>(fileName: T, caseSensitive: boolean): T {
  // Match TypeScript's canonical filename folding: these Unicode characters must not
  // expand or collapse into a different filesystem name (notably dotted/dotless I).
  return (
    caseSensitive
      ? fileName
      : fileName.replace(/[^\u0130\u0131\u00DFa-z0-9\\/:\-_. ]+/g, part => part.toLowerCase())
  ) as T;
}
