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
import path from 'node:path';
import {
  nativeFs,
  writeFileWithNativePrimitives,
  ARCHIVE_FILE_MODE,
} from '../../shared/src/fs-cache/archive-types.js';
import type { AnalyzeProjectProtoRequest } from './analyze-project-request.js';
import { sonarjs } from './proto/analyze-project.js';

const RECORD = sonarjs.analyzeproject.v1.FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD;
const SNAPSHOT_VERSION = 1;

/** This marker confirms successful persistence, not filesystem completeness. */
export function writeSnapshotManifest(request: AnalyzeProjectProtoRequest): void {
  const file = request.filesystemCache?.snapshotManifestPath;
  if (!file || request.filesystemCache?.mode !== RECORD) {
    return;
  }
  nativeFs.mkdirSync(path.dirname(file), { recursive: true });
  writeFileWithNativePrimitives(
    file,
    Buffer.from(JSON.stringify({ version: SNAPSHOT_VERSION })),
    ARCHIVE_FILE_MODE,
  );
}
