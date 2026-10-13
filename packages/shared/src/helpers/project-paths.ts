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
import { isWindowsProjectPath, type NormalizedAbsolutePath } from './files.js';
export { isWindowsProjectPath };

/** Recorded roots are data: never resolve a foreign root against the current machine's cwd. */
export function normalizeProjectRoot(value: string): NormalizedAbsolutePath {
  const windows = isWindowsProjectPath(value);
  if (
    (!windows && (!value.startsWith('/') || value.startsWith('//'))) ||
    /^(?:\\\\|\/\/)[?.][/\\]/.test(value)
  ) {
    throw new Error('Project base directory must be fully absolute');
  }
  const normalized = (windows ? path.win32 : path.posix).normalize(value).replaceAll('\\', '/');
  return (
    normalized.endsWith('/') && normalized !== '/' && !/^[a-z]:\/$/i.test(normalized)
      ? normalized.slice(0, -1)
      : normalized
  ) as NormalizedAbsolutePath;
}

export function relativeProjectPath(value: string, root: string): string | undefined {
  const paths = isWindowsProjectPath(root) ? path.win32 : path.posix;
  // Windows drive-relative and root-relative paths are not portable absolute paths.
  if (/^[a-z]:[^/\\]/i.test(value) || /^[a-z]:$/i.test(value)) {
    return undefined;
  }
  if (
    (paths.isAbsolute(value) || isWindowsProjectPath(value)) &&
    isWindowsProjectPath(value) !== isWindowsProjectPath(root)
  ) {
    return undefined;
  }
  const relative = paths.relative(root, paths.resolve(root, value)).replaceAll('\\', '/');
  return relative === '..' || relative.startsWith('../') || paths.isAbsolute(relative)
    ? undefined
    : relative;
}

/** Same-platform replay keeps CI's namespace; foreign namespaces use the physical request root. */
export function replayProjectRoot(
  recordedRoot: string,
  physicalRoot: string,
  platform = process.platform,
): NormalizedAbsolutePath {
  const root = normalizeProjectRoot(recordedRoot);
  return isWindowsProjectPath(root) === (platform === 'win32')
    ? root
    : normalizeProjectRoot(physicalRoot);
}
