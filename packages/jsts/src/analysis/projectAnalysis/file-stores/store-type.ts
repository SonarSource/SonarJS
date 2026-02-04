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
import type { NormalizedAbsolutePath } from '../../../rules/helpers/index.js';
import type { Configuration } from '../../../../../shared/src/helpers/configuration.js';

/**
 * Raw input files from HTTP request, keyed by arbitrary string.
 * Values contain unvalidated file data that needs sanitization.
 */
export type RawInputFiles = Record<string, Record<string, unknown>>;

export abstract class FileStore {
  /**
   * Checks if the store is initialized for the given base directory.
   *
   * @param configuration - The project configuration
   * @param inputFiles - Optional raw input files from the request
   */
  abstract isInitialized(
    configuration: Configuration,
    inputFiles?: RawInputFiles,
  ): Promise<boolean>;

  /**
   * Sets up the store for processing files.
   *
   * @param configuration - The project configuration
   */
  abstract setup(configuration: Configuration): void;

  abstract processFile(
    filename: NormalizedAbsolutePath,
    configuration: Configuration,
  ): Promise<void>;

  /**
   * Performs post-processing after all files have been processed.
   *
   * @param configuration - The project configuration
   */
  abstract postProcess(configuration: Configuration): Promise<void>;

  abstract processDirectory?(dir: NormalizedAbsolutePath, configuration: Configuration): void;
}
