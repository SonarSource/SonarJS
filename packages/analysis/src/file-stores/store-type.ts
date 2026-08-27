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
import type { File, NormalizedAbsolutePath } from '../../../shared/src/helpers/files.js';
import type { Configuration } from '../common/configuration.js';
import type { AnalyzableFiles } from '../projectAnalysis.js';

/**
 * `deferred-content` processes the path during the walk while preserving any shared content read
 * for a later request from `postProcess`.
 */
export type FileProcessingMode = 'path' | 'content' | 'deferred-content';

export type FileStoreContext = {
  /**
   * Mark a file path so its content is cached on its first `getFile` call.
   * Must be called before the first `getFile` call for that path.
   */
  retainFile(filePath: NormalizedAbsolutePath): void;
  getFile(filePath: NormalizedAbsolutePath, fileContent?: string): Promise<File>;
};

export abstract class FileStore {
  /**
   * Checks if the store is initialized for the given base directory.
   *
   * @param configuration - The project configuration
   * @param inputFiles - Optional authoritative analyzable files
   */
  abstract isInitialized(
    configuration: Configuration,
    inputFiles?: AnalyzableFiles,
  ): Promise<boolean>;

  /**
   * Sets up the store for processing files.
   *
   * @param configuration - The project configuration
   */
  abstract setup(configuration: Configuration): void;

  abstract wantsFile(
    filename: NormalizedAbsolutePath,
    configuration: Configuration,
  ): FileProcessingMode | false;

  abstract processFile(
    filename: NormalizedAbsolutePath,
    configuration: Configuration,
    file?: File,
  ): Promise<void>;

  /**
   * Performs post-processing after all files have been processed.
   *
   * @param configuration - The project configuration
   */
  abstract postProcess(configuration: Configuration, context: FileStoreContext): Promise<void>;

  abstract processDirectory?(dir: NormalizedAbsolutePath, configuration: Configuration): void;
}
