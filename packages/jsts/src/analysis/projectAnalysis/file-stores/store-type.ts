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

/**
 * Raw input files from HTTP request, keyed by arbitrary string.
 * Values contain unvalidated file data that needs sanitization.
 */
export type RawInputFiles = Record<string, Record<string, unknown>>;

export abstract class FileStore {
  abstract isInitialized(
    baseDir: NormalizedAbsolutePath,
    inputFiles?: RawInputFiles,
  ): Promise<boolean>;

  abstract setup(baseDir: NormalizedAbsolutePath): void;

  abstract processFile(filename: NormalizedAbsolutePath): Promise<void>;

  abstract postProcess(baseDir: NormalizedAbsolutePath): Promise<void>;

  abstract processDirectory?(dir: NormalizedAbsolutePath): void;
}
