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
import { FsCacheArchive, FsCacheArchiveError } from './archive.mjs';
import { DiskFsCacheArchive } from './disk-archive.mjs';

export const DEFAULT_FS_CACHE_ARCHIVE_BACKEND = 'json';

export function createFsCacheArchive(options) {
  const backend = options.archiveBackend || DEFAULT_FS_CACHE_ARCHIVE_BACKEND;
  if (backend === 'json') {
    return new FsCacheArchive(options);
  }
  if (backend === 'disk') {
    return new DiskFsCacheArchive(options);
  }
  throw new FsCacheArchiveError(`Unsupported filesystem cache archive backend: ${backend}`);
}
