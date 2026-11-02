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
import fs from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import type { FsCacheArchive } from './archive.js';
import type { CacheNode, FsCacheOutcome } from './archive-types.js';

/** Re-observe the baseline through the active recording hook. Never seed stale observations. */
export function refreshArchive(
  baseline: FsCacheArchive,
  current: FsCacheArchive,
  canChangeContent: (file: string, before: Buffer, after: Buffer) => boolean,
): boolean {
  if (baseline.caseSensitivePaths !== current.caseSensitivePaths) return false;
  for (const key of baseline.missingPaths) {
    const file = current.absolutePathFor(key);
    if (current.keyFor(file) === undefined) return false;
    if (fs.existsSync(file)) return false;
    // An absent path becoming a dangling symlink also changes filesystem resolution.
    try {
      fs.lstatSync(file);
      return false;
    } catch (error) {
      if (!['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? ''))
        return false;
    }
  }
  for (const [key, node] of baseline.entries) {
    const file = current.absolutePathFor(key);
    if (current.keyFor(file) === undefined) return false;
    if (node.exists !== undefined && fs.existsSync(file) !== node.exists) return false;
    for (const [field, values] of Object.entries(node)) {
      if (field === 'exists') continue;
      if (field === 'linkExists') {
        let exists = true;
        try {
          fs.lstatSync(file);
        } catch {
          exists = false;
        }
        if (exists !== values) return false;
        continue;
      }
      const observations =
        field === 'content' ? [['readFile', values] as const] : Object.entries(values);
      for (const [operation, expected] of observations) {
        try {
          observe(file, field, operation);
        } catch {
          /* The hook records filesystem errors too. */
        }
        const actualNode = current.entries.get(current.keyFor(file)!);
        const actual =
          field === 'content'
            ? actualNode?.content
            : (
                actualNode?.[field as keyof CacheNode] as
                  Record<string, FsCacheOutcome<unknown>> | undefined
              )?.[operation];
        const prior = expected as FsCacheOutcome<unknown>;
        if (!actual || actual.ok !== prior.ok) return false;
        if (!actual.ok || !prior.ok) {
          if (!actual.ok && !prior.ok && actual.error.code === prior.error.code) continue;
          return false;
        }
        if (field === 'stats') {
          // Checkout timestamps/inodes are not identities. Retain fresh stats in the new archive.
          const before = prior.value as { types: unknown; fields: Record<string, string> } | null;
          const after = actual.value as typeof before;
          if (!before || !after) {
            if (before !== after) return false;
          } else if (
            !isDeepStrictEqual(before.types, after.types) ||
            before.fields.mode !== after.fields.mode
          )
            return false;
        } else if (!isDeepStrictEqual(prior.value, actual.value)) {
          if (
            field !== 'content' ||
            !canChangeContent(
              file,
              Buffer.from(prior.value as Uint8Array),
              Buffer.from(actual.value as Uint8Array),
            )
          )
            return false;
        }
      }
    }
  }
  return true;
}

function observe(file: string, field: string, operation: string): void {
  switch (field) {
    case 'content':
      fs.readFileSync(file);
      break;
    case 'stats': {
      const [kind, representation] = operation.split(':');
      const options = { bigint: representation === 'bigint' };
      if (kind === 'stat') fs.statSync(file, options);
      else if (kind === 'lstat') fs.lstatSync(file, options);
      else throw new Error('Unsupported baseline stat');
      break;
    }
    case 'access':
      fs.accessSync(file, Number(operation));
      break;
    case 'realpaths':
      if (operation === 'realpath.native') fs.realpathSync.native(file);
      else fs.realpathSync(file);
      break;
    case 'readlinks':
      fs.readlinkSync(file, { encoding: operation as BufferEncoding });
      break;
    case 'directories': {
      const [scope, encoding, kind] = operation.split(':');
      if (scope !== 'flat') throw new Error('Unsupported baseline directory observation');
      if (kind === 'entries')
        fs.readdirSync(file, { encoding: encoding as BufferEncoding, withFileTypes: true });
      else fs.readdirSync(file, { encoding: encoding as BufferEncoding, withFileTypes: false });
      break;
    }
    case 'opens': {
      const descriptor = fs.openSync(file, operation);
      fs.closeSync(descriptor);
      break;
    }
    default:
      throw new Error('Unsupported baseline observation');
  }
}
