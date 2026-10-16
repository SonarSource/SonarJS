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
import type ts from 'typescript';
import { isAbsolutePath, type NormalizedAbsolutePath } from '../../../shared/src/helpers/files.js';
import { normalizeProjectRoot } from '../../../shared/src/helpers/project-paths.js';
import { objectFromStruct } from './analysis-metadata-struct.js';

const PROJECT_RELATIVE_PATH_PREFIX = '\0project-relative:';
const COMPILER_OPTION_PATHS = new Set([
  'baseUrl',
  'configFilePath',
  'declarationDir',
  'mapRoot',
  'outDir',
  'pathsBasePath',
  'rootDir',
  'sourceRoot',
  'tsBuildInfoFile',
]);
const COMPILER_OPTION_PATH_LISTS = new Set(['rootDirs', 'typeRoots']);

/**
 * Converts TypeScript compiler option paths to and from a project-relative representation so
 * that recorded program selections remain portable across machines.
 */
export class CompilerOptionPaths {
  constructor(
    private readonly toRelative: (absolutePath: NormalizedAbsolutePath) => string,
    private readonly fromRelative: (relativePath: string) => NormalizedAbsolutePath,
    private readonly getBaseDir: () => NormalizedAbsolutePath,
  ) {}

  forStorage(options: ts.CompilerOptions): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(options).map(([key, value]) => {
        if (COMPILER_OPTION_PATHS.has(key) && typeof value === 'string') {
          return [key, this.portablePath(value)];
        }
        if (COMPILER_OPTION_PATH_LISTS.has(key) && Array.isArray(value)) {
          return [
            key,
            value.map(item => (typeof item === 'string' ? this.portablePath(item) : item)),
          ];
        }
        if (key === 'paths' && value && typeof value === 'object') {
          return [key, this.mapPaths(value, item => this.portablePath(item))];
        }
        return [key, value];
      }),
    );
  }

  restore(struct: { fields?: Record<string, unknown> | null }): ts.CompilerOptions {
    const options = objectFromStruct(struct);
    for (const [key, value] of Object.entries(options)) {
      if (COMPILER_OPTION_PATHS.has(key) && typeof value === 'string') {
        options[key] = this.restorePath(value);
      } else if (COMPILER_OPTION_PATH_LISTS.has(key) && Array.isArray(value)) {
        options[key] = value.map(item =>
          typeof item === 'string' ? this.restorePath(item) : item,
        );
      } else if (key === 'paths' && value && typeof value === 'object') {
        options[key] = this.mapPaths(value, item => this.restorePath(item));
      }
    }
    return options as ts.CompilerOptions;
  }

  private portablePath(value: string): string {
    if (!isAbsolutePath(value)) {
      return value;
    }
    const normalized = normalizeProjectRoot(value);
    try {
      return PROJECT_RELATIVE_PATH_PREFIX + this.toRelative(normalized);
    } catch {
      return value;
    }
  }

  private restorePath(value: string): string {
    if (!value.startsWith(PROJECT_RELATIVE_PATH_PREFIX)) {
      return value;
    }
    const relativePath = value.slice(PROJECT_RELATIVE_PATH_PREFIX.length);
    return relativePath === '' ? this.getBaseDir() : this.fromRelative(relativePath);
  }

  private mapPaths(value: object, transform: (path: string) => string): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).map(([key, paths]) => [
        key,
        Array.isArray(paths)
          ? paths.map(item => (typeof item === 'string' ? transform(item) : item))
          : paths,
      ]),
    );
  }
}
