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
import type { PackageJson } from 'type-fest';
import type { NormalizedAbsolutePath } from '../../files.js';
import type { Filesystem } from '../../find-up/find-minimatch.js';

// https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap
type ImportMap = Record<string, unknown>;

export type DenoManifest = {
  imports?: ImportMap;
  workspace?: string[] | { members?: string[] };
};

export type DependencyManifest =
  | { type: 'npm'; manifest: PackageJson }
  | { type: 'deno'; manifest: DenoManifest };

/**
 * Strategy interface for resolving dependency manifests of a specific type from a single
 * directory. Implement this interface and register it in {@link MANIFEST_RESOLVERS} to add
 * support for a new package manager or manifest format (e.g., Bun).
 */
export interface ManifestResolver {
  resolve(
    dir: NormalizedAbsolutePath,
    topDir: NormalizedAbsolutePath,
    fileSystem?: Filesystem,
  ): DependencyManifest[];
}
