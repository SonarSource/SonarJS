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

/**
 * Global cache for tsconfig file contents to avoid repeated disk reads
 * Persists across analysis runs (especially useful for SonarLint)
 */
const tsconfigContentCache = new Map<string, { contents: string; missing: boolean }>();

/**
 * Get the tsconfig content cache (for parser access)
 */
export function getTsConfigContentCache(): typeof tsconfigContentCache {
  return tsconfigContentCache;
}

/**
 * Clear the tsconfig content cache (called when tsconfig files change)
 */
export function clearTsConfigContentCache(): void {
  tsconfigContentCache.clear();
  debug('Cleared tsconfig content cache');
}
