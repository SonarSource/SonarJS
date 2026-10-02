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
import type { AnalyzeProjectProtoRequest } from './analyze-project-request.js';
import { InvalidAnalyzeProjectRequestError } from './analyze-project-normalize.js';
import {
  isAbsolutePath,
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../shared/src/helpers/files.js';
import {
  normalizeProjectRoot,
  relativeProjectPath,
} from '../../shared/src/helpers/project-paths.js';

/** Path translation belongs to the transport boundary, not analysis or rule classification. */
export class ReplayProjectPaths {
  private readonly configuration;
  private readonly files;
  private readonly requestBaseDir: NormalizedAbsolutePath;
  private readonly fallbackBaseDir: NormalizedAbsolutePath;
  private readonly originalPaths = new Map<string, string>();

  constructor(private readonly request: AnalyzeProjectProtoRequest) {
    const baseDir = request.configuration?.baseDir;
    if (!baseDir) {
      throw new InvalidAnalyzeProjectRequestError('configuration.base_dir is required');
    }
    this.configuration = { ...request.configuration };
    this.files = request.files;
    this.requestBaseDir = normalizeProjectRoot(baseDir);
    if (
      request.filesystemCache?.fallbackBaseDir &&
      !isAbsolutePath(request.filesystemCache.fallbackBaseDir)
    ) {
      throw new InvalidAnalyzeProjectRequestError(
        'filesystem_cache.fallback_base_dir must be absolute',
      );
    }
    this.fallbackBaseDir = normalizeProjectRoot(
      request.filesystemCache?.fallbackBaseDir || this.requestBaseDir,
    );
  }

  useRecordedBaseDir(
    baseDir: NormalizedAbsolutePath,
    canonicalFile = (file: NormalizedAbsolutePath) => file,
  ): void {
    // Extension bundles and extracted rule files belong to the current runtime, even when
    // their request paths are relative. Resolve them before changing the project namespace.
    this.request.bundles = (this.request.bundles ?? []).map(file =>
      normalizeToAbsolutePath(file, this.fallbackBaseDir),
    );
    if (this.request.rulesWorkdir) {
      this.request.rulesWorkdir = normalizeToAbsolutePath(
        this.request.rulesWorkdir,
        this.fallbackBaseDir,
      );
    }
    this.request.files = this.relocateFiles(baseDir, true, canonicalFile);
    this.request.configuration = { ...this.request.configuration, baseDir };
  }

  restoreSourceOnlyRequest(): void {
    this.request.configuration = { ...this.configuration, baseDir: this.fallbackBaseDir };
    this.originalPaths.clear();
    this.request.files = this.relocateFiles(this.fallbackBaseDir, false);
    this.request.filesystemCache = undefined;
  }

  restoreResponsePaths(pathMap: Map<string, string>): void {
    for (const [logicalPath, originalPath] of this.originalPaths) {
      pathMap.set(logicalPath, originalPath);
    }
  }

  private relocateFiles(
    baseDir: NormalizedAbsolutePath,
    requireContents: boolean,
    canonicalFile = (file: NormalizedAbsolutePath) => file,
  ) {
    return Object.fromEntries(
      Object.entries(this.files ?? {}).map(([file, input]) => {
        const relativePath = relativeProjectPath(file, this.requestBaseDir);
        if (relativePath === undefined) {
          throw new InvalidAnalyzeProjectRequestError(
            'Replay file is outside the project base directory',
          );
        }
        if (requireContents && baseDir !== this.requestBaseDir && input.fileContent == null) {
          throw new InvalidAnalyzeProjectRequestError(
            'Replay files must contain submitted contents',
          );
        }
        const logicalPath = canonicalFile(normalizeToAbsolutePath(relativePath, baseDir));
        if (this.originalPaths.has(logicalPath)) {
          throw new InvalidAnalyzeProjectRequestError(
            'Duplicate replay file after path normalization',
          );
        }
        this.originalPaths.set(logicalPath, file);
        return [logicalPath, input];
      }),
    );
  }
}
