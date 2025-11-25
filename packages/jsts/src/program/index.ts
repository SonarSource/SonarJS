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
/**
 * Main entry point for TypeScript program management
 *
 * This module provides an API to take control over TypeScript's Program instances
 * in the context of program-based analysis for JavaScript / TypeScript.
 *
 * A TypeScript's Program instance is used by TypeScript ESLint parser
 * to make available TypeScript's type checker for rules willing to use type
 * information for the sake of precision.
 */

// Cache management
export {
  setSourceFilesContext,
  getSourceFileContentCache,
  getCurrentFilesContext,
  clearSourceFileContentCache,
} from './cache/sourceFileCache.js';
export { clearTsConfigContentCache } from './cache/tsconfigCache.js';
export { clearProgramOptionsCache } from './cache/programOptionsCache.js';
export { getProgramCacheManager } from './cache/programCache.js';

// TSConfig options (compiler options + parsing)
export {
  defaultCompilerOptions,
  mergeProgramOptions,
  createProgramOptions,
  createProgramOptionsFromJson,
  type ProgramOptions,
} from './tsconfig/options.js';

// Program factory
export {
  createBuilderProgramAndHost,
  createBuilderProgramWithHost,
  createStandardProgram,
  createProgramFromSingleFile,
  createOrGetCachedProgramForFile,
} from './factory.js';

// TSConfig utilities
export { sanitizeProgramReferences } from './tsconfig/utils.js';
