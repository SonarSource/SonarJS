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
import ts from 'typescript';

/** Returns the effective strict-null setting for the TypeScript compiler used by this analyzer. */
export function isStrictNullChecksEnabled(
  options: ts.CompilerOptions,
  compilerVersion = ts.versionMajorMinor,
): boolean {
  return options.strictNullChecks ?? options.strict ?? Number.parseInt(compilerVersion, 10) >= 6;
}
