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
import {
  type CachedDirectoryEntry,
  type CacheNode,
  FsCacheArchiveError,
  type FsCacheOutcome,
  MAP_FIELDS,
  type MapField,
  type OperationSlot,
  type OutcomeMap,
} from './archive-types.js';

export function createNode(node: CacheNode = {}): CacheNode {
  const result: CacheNode = {};
  if (node.exists !== undefined) {
    result.exists = node.exists;
  }
  if (node.linkExists !== undefined) {
    result.linkExists = node.linkExists;
  }
  if (node.content !== undefined) {
    result.content = node.content;
  }
  for (const field of MAP_FIELDS) {
    if (node[field] && typeof node[field] === 'object') {
      copyMapField(result, node, field);
    }
  }
  return result;
}

export function mergeNodes(base: CacheNode = {}, update: CacheNode = {}): CacheNode {
  const result = { ...base, ...update };
  for (const field of MAP_FIELDS) {
    if (base[field] || update[field]) {
      mergeMapField(result, base, update, field);
    }
  }
  return result;
}

export function sortedNode(node: CacheNode): CacheNode {
  const result: CacheNode = {};
  if (node.exists !== undefined) {
    result.exists = node.exists;
  }
  if (node.linkExists !== undefined) {
    result.linkExists = node.linkExists;
  }
  if (node.content !== undefined) {
    result.content = node.content;
  }
  for (const field of MAP_FIELDS) {
    if (node[field]) {
      sortMapField(result, node, field);
    }
  }
  return result;
}

function copyMapField<K extends MapField>(target: CacheNode, source: CacheNode, field: K): void {
  target[field] = { ...source[field] } as CacheNode[K];
}

function mergeMapField<K extends MapField>(
  target: CacheNode,
  base: CacheNode,
  update: CacheNode,
  field: K,
): void {
  target[field] = { ...base[field], ...update[field] } as CacheNode[K];
}

function sortMapField<K extends MapField>(target: CacheNode, source: CacheNode, field: K): void {
  const entries = source[field];
  if (!entries) {
    return;
  }
  target[field] = Object.fromEntries(
    Object.entries(entries).sort(([left], [right]) => left.localeCompare(right)),
  ) as CacheNode[K];
}

export function operationSlot(operation: string): OperationSlot {
  const [name, ...parts] = operation.split(':');
  switch (name) {
    case 'readFile':
      return { field: 'content' };
    case 'stat':
    case 'lstat':
      return { field: 'stats', key: `${name}:${parts[0] || 'number'}` };
    case 'fstat':
      return { field: 'stats', key: `stat:${parts[0] || 'number'}` };
    case 'readdir': {
      const [encoding = 'utf8', withFileTypes = 'false', recursive = 'false'] = parts;
      const scope = recursive === 'true' ? 'readdir-recursive' : 'flat';
      const kind = withFileTypes === 'true' ? 'entries' : 'names';
      return { field: 'directories', key: `${scope}:${encoding}:${kind}` };
    }
    case 'opendir': {
      const [encoding = 'utf8', recursive = 'false'] = parts;
      const scope = recursive === 'true' ? 'opendir-recursive' : 'flat';
      return { field: 'directories', key: `${scope}:${encoding}:entries` };
    }
    case 'access':
      return { field: 'access', key: parts[0] || '0' };
    case 'realpath':
    case 'realpath.native':
      return { field: 'realpaths', key: name };
    case 'readlink':
      return { field: 'readlinks', key: parts[0] || 'utf8' };
    case 'open':
      return { field: 'opens', key: parts.join(':') || 'r' };
    default:
      throw new FsCacheArchiveError(`Unsupported filesystem cache operation: ${operation}`);
  }
}

export function readSlot(
  node: CacheNode,
  slot: OperationSlot,
): FsCacheOutcome<unknown> | undefined {
  return slot.field === 'content' ? node.content : node[slot.field]?.[slot.key];
}

export function writeSlot<T>(node: CacheNode, slot: OperationSlot, outcome: FsCacheOutcome<T>) {
  if (slot.field === 'content') {
    node.content = outcome as FsCacheOutcome<Buffer | string>;
    return;
  }
  const mapFields = node as Record<MapField, OutcomeMap<unknown> | undefined>;
  let entries = mapFields[slot.field] as OutcomeMap<T> | undefined;
  if (!entries) {
    entries = {};
    mapFields[slot.field] = entries as OutcomeMap<unknown>;
  }
  entries[slot.key] = outcome;
}

export function isMissingOutcome(operation: string, outcome: FsCacheOutcome<unknown>) {
  return (
    (!outcome.ok && outcome.error?.code === 'ENOENT') ||
    ((operation.startsWith('stat:') || operation.startsWith('lstat:')) &&
      outcome.ok &&
      outcome.value === null)
  );
}

export function observesLink(operation: string) {
  return operation.startsWith('lstat:') || operation.startsWith('readlink:');
}

export function updateExistence(
  node: CacheNode,
  operation: string,
  outcome: FsCacheOutcome<unknown>,
  missing: boolean,
) {
  const linkOperation = observesLink(operation);
  if (operation === 'exists' && outcome.ok) {
    node.exists = Boolean(outcome.value);
    if (outcome.value) {
      node.linkExists = true;
    }
    return;
  }
  if (missing) {
    node.exists = false;
    if (linkOperation) {
      // A missing directory entry also means there is no target to follow.
      node.linkExists = false;
    }
    return;
  }
  if (outcome.ok) {
    node.linkExists = true;
    if (!linkOperation) {
      node.exists = true;
    }
  }
}

export function namesFromEntries(
  outcome: FsCacheOutcome<CachedDirectoryEntry[]> | undefined,
): FsCacheOutcome<CachedDirectoryEntry[]> | undefined {
  if (!outcome?.ok) {
    return outcome;
  }
  return {
    ok: true,
    value: outcome.value.map(entry => ({ kind: 'name', name: entry.name })),
  };
}
