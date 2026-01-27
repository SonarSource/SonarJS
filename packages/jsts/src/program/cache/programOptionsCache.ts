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
import { debug } from '../../../../shared/src/helpers/logging.js';
import type { ProgramOptions } from '../tsconfig/options.js';

/**
 * Cache for createProgramOptions() results
 * Key: tsConfig path + tsconfigContents (if provided)
 */
const programOptionsCache = new Map<string, ProgramOptions>();

function buildCacheKey(tsConfig: string, tsconfigContents?: string): string {
  return `${tsConfig}:${tsconfigContents}`;
}

/**
 * Get cached ProgramOptions from createProgramOptions()
 */
export function getCachedProgramOptions(
  tsConfig: string,
  tsconfigContents?: string,
): ProgramOptions | undefined {
  return programOptionsCache.get(buildCacheKey(tsConfig, tsconfigContents));
}

/**
 * Store ProgramOptions in cache for createProgramOptions()
 */
export function setCachedProgramOptions(
  tsConfig: string,
  options: ProgramOptions,
  tsconfigContents?: string,
): void {
  programOptionsCache.set(buildCacheKey(tsConfig, tsconfigContents), options);
}

/**
 * Clear both program options caches
 */
export function clearProgramOptionsCache(): void {
  programOptionsCache.clear();
  debug('Cleared program options caches');
}
