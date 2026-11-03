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
import { escape as escapeGlob } from 'minimatch';
import { normalizeProjectRoot } from '../../../shared/src/helpers/project-paths.js';

/** `directory:` denotes a literal filesystem directory; `file:` keeps scanner glob semantics. */
export function parsePathPattern(pattern: string) {
  const prefix = /^(?:file|directory):/i.exec(pattern)?.[0] ?? '';
  return {
    prefix,
    value: pattern.slice(prefix.length),
    isDirectory: prefix.toLowerCase() === 'directory:',
  };
}

export function escapeGlobPath(value: string) {
  return normalizeProjectRoot(
    escapeGlob(value, { windowsPathsNoEscape: true, magicalBraces: true }),
  );
}
