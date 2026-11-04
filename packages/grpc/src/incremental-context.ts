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
import { seedFilesystemBaseline } from '../../shared/src/fs-cache/hook.js';
import {
  nativeFs,
  writeFileWithNativePrimitives,
  ARCHIVE_FILE_MODE,
} from '../../shared/src/fs-cache/archive-types.js';
import type { ProgramSelectionArchive } from '../../analysis/src/program-selection/archive.js';
import type { AnalyzeProjectProtoRequest } from './analyze-project-request.js';
import { debug } from '../../shared/src/helpers/logging.js';
import { sonarjs } from './proto/analyze-project.js';

const RECORD = sonarjs.analyzeproject.v1.FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD;
const SNAPSHOT_VERSION = 1;

/** Retain previous observations for publication; RECORD analysis still uses the native filesystem. */
export function prepareIncrementalContext(
  request: AnalyzeProjectProtoRequest,
  programSelection: ProgramSelectionArchive | undefined,
): { baselineAvailable: boolean } {
  const cache = request.filesystemCache;
  if (cache?.mode !== RECORD || !cache.baselineArchivePath) {
    return { baselineAvailable: true };
  }
  try {
    if (
      !cache.baselineAnalysisMetadataPath ||
      !cache.baselineManifestPath ||
      !cache.baselineContextMetadata ||
      !programSelection
    ) {
      throw new Error('Incomplete sensor-cache context baseline');
    }
    const manifest = JSON.parse(nativeFs.readFileSync(cache.baselineManifestPath, 'utf8'));
    if (manifest?.version !== SNAPSHOT_VERSION) {
      throw new Error('Unsupported sensor-cache context baseline');
    }
    seedFilesystemBaseline(cache.baselineArchivePath);
    programSelection.seedFrom(cache.baselineAnalysisMetadataPath, cache.baselineContextMetadata);
    debug('Retaining the sensor-cache context baseline; recording live filesystem observations');
    return { baselineAvailable: true };
  } catch (error) {
    debug('Cannot retain the sensor-cache context baseline: ' + String(error));
    return { baselineAvailable: false };
  }
}

/** This marker confirms successful persistence, not filesystem completeness. */
export function writeSnapshotManifest(request: AnalyzeProjectProtoRequest): void {
  const file = request.filesystemCache?.snapshotManifestPath;
  if (!file || request.filesystemCache?.mode !== RECORD) return;
  nativeFs.mkdirSync(path.dirname(file), { recursive: true });
  writeFileWithNativePrimitives(
    file,
    Buffer.from(JSON.stringify({ version: SNAPSHOT_VERSION })),
    ARCHIVE_FILE_MODE,
  );
}
