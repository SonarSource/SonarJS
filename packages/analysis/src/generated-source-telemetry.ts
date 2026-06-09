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

export type GeneratedSourceFamilyTelemetry = {
  family: string;
  resolvedFileCount: number;
  taggedFileCount: number;
  outOfScopeFileCount: number;
  excludedFileCount: number;
};

export type GeneratedSourcesTelemetry = {
  familyCount: number;
  resolvedFileCount: number;
  taggedFileCount: number;
  outOfScopeFileCount: number;
  excludedFileCount: number;
  families: GeneratedSourceFamilyTelemetry[];
};

export function createEmptyGeneratedSourcesTelemetry(): GeneratedSourcesTelemetry {
  return {
    familyCount: 0,
    resolvedFileCount: 0,
    taggedFileCount: 0,
    outOfScopeFileCount: 0,
    excludedFileCount: 0,
    families: [],
  };
}

export function cloneGeneratedSourcesTelemetry(
  telemetry: GeneratedSourcesTelemetry,
): GeneratedSourcesTelemetry {
  return {
    ...telemetry,
    families: telemetry.families.map(family => ({ ...family })),
  };
}
