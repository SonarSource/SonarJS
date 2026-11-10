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
import type { CacheNode, CachedDirectoryEntry } from './archive-types.js';
import { hasConflictingEntryType } from './archive-nodes.js';
import path from 'node:path';

type Inventory = Map<string, string | undefined>;
type CanonicalKey = (value: string) => string;

function entryName(entry: CachedDirectoryEntry): string {
  return entry.name.kind === 'buffer'
    ? Buffer.from(entry.name.value, 'base64').toString()
    : entry.name.value;
}

/** Index complete native listings once; recursive baseline listings also describe child directories. */
function directoryInventories(
  entries: Map<string, CacheNode>,
  canonicalKey: CanonicalKey,
  includeRecursive = false,
): Map<string, Inventory> {
  const result = new Map<string, Inventory>();
  for (const recursive of includeRecursive ? [true, false] : [false]) {
    const typedDirectories = new Set<string>();
    for (const [directory, node] of entries) {
      for (const [operation, outcome] of Object.entries(node.directories ?? {})) {
        if (
          !/^(flat|readdir-recursive|opendir-recursive):(utf8|utf-8|buffer):/.test(operation) ||
          operation.startsWith('flat:') === recursive ||
          !outcome.ok
        )
          continue;
        if (!recursive) {
          if (operation.endsWith(':names') && typedDirectories.has(directory)) continue;
          if (operation.endsWith(':entries')) typedDirectories.add(directory);
          result.set(
            directory,
            new Map(
              outcome.value.map(entry => [
                canonicalKey(entryName(entry)),
                entry.kind === 'dirent' ? entry.type : undefined,
              ]),
            ),
          );
          continue;
        }
        const add = (parent: string, name: string, type?: string) => {
          let inventory = result.get(parent);
          if (!inventory) result.set(parent, (inventory = new Map()));
          inventory.set(name, type ?? inventory.get(name));
          const child = parent === '.' ? name : `${parent}/${name}`;
          if (!result.has(child)) result.set(child, new Map());
        };
        if (!result.has(directory)) result.set(directory, new Map());
        for (const entry of outcome.value) {
          const name = canonicalKey(entryName(entry));
          if (entry.kind === 'dirent') {
            if (entry.parentPath.kind === 'relative')
              add(canonicalKey(entry.parentPath.path), name, entry.type);
          } else {
            const parts = (path.sep === '\\' ? name.replaceAll('\\', '/') : name).split('/');
            let parent = directory;
            for (let index = 0; index < parts.length; index++) {
              add(parent, parts[index], index < parts.length - 1 ? 'directory' : undefined);
              parent = parent === '.' ? parts[index] : `${parent}/${parts[index]}`;
            }
          }
        }
      }
    }
  }
  return result;
}

function sameInventory(previous: Inventory, current: Inventory): boolean {
  return (
    previous.size === current.size &&
    [...current].every(
      ([name, type]) =>
        previous.has(name) &&
        (!type ||
          type === 'unknown' ||
          !previous.get(name) ||
          previous.get(name) === 'unknown' ||
          type === previous.get(name)),
    )
  );
}

/** Current complete directory observations reconcile inherited facts without extra filesystem reads. */
export function reconcileDirectoryObservations(
  entries: Map<string, CacheNode>,
  missingPaths: Set<string>,
  observations: Map<string, CacheNode>,
  canonicalKey: CanonicalKey,
): void {
  const currentDirectories = directoryInventories(observations, canonicalKey);
  if (currentDirectories.size === 0) {
    return;
  }
  const previousDirectories = directoryInventories(entries, canonicalKey, true);
  const changedDirectories = new Set<string>();
  for (const [directory, children] of currentDirectories) {
    const previousChildren = previousDirectories.get(directory);
    if (previousChildren && !sameInventory(previousChildren, children))
      changedDirectories.add(directory);
    for (const [name, type] of children) {
      const childPath = directory === '.' ? name : `${directory}/${name}`;
      const previous = entries.get(childPath);
      const exists = type !== undefined && !['symbolicLink', 'unknown'].includes(type);
      const appeared = missingPaths.delete(childPath);
      const changedType = previous && type !== undefined && hasConflictingEntryType(previous, type);
      if (
        appeared ||
        changedType ||
        (previous?.exists === false && (exists || previous.linkExists !== true))
      ) {
        changedDirectories.add(directory);
        entries.set(childPath, { linkExists: true, ...(exists ? { exists: true } : {}) });
      }
    }
  }
  for (const entryPath of entries.keys()) {
    if (entryPath === '.') continue;
    const parts = entryPath.split('/');
    let parent = '.';
    for (let index = 0; index < parts.length; index++) {
      const children = currentDirectories.get(parent);
      const type = children?.get(parts[index]);
      if (
        children &&
        (!children.has(parts[index]) ||
          (index < parts.length - 1 &&
            type !== undefined &&
            !['directory', 'symbolicLink', 'unknown'].includes(type)))
      ) {
        entries.delete(entryPath);
        missingPaths.add(entryPath);
        changedDirectories.add(parent);
        break;
      }
      parent = index === 0 ? parts[index] : `${parent}/${parts[index]}`;
    }
  }
  // Flat listings describe this directory; recursive listings also cover every observed descendant.
  const changedSubtrees = new Set<string>();
  for (const directory of changedDirectories) {
    let parent = directory;
    while (parent !== '.') {
      changedSubtrees.add(parent);
      const slash = parent.lastIndexOf('/');
      parent = slash === -1 ? '.' : parent.slice(0, slash);
    }
    changedSubtrees.add('.');
  }
  for (const [directory, node] of entries) {
    if (!node.directories || !changedSubtrees.has(directory)) continue;
    node.directories = Object.fromEntries(
      Object.entries(node.directories).filter(([operation]) =>
        operation.startsWith('flat:') ? !changedDirectories.has(directory) : false,
      ),
    );
  }
}
