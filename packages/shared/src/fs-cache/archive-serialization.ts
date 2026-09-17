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
import { sonarjs } from './archive-proto.js';
import {
  type ArchiveDocument,
  type CachedDirectoryEntry,
  type CachedName,
  type CachedStat,
  type CacheNode,
  DIRENT_TYPES,
  type FsCacheErrorSnapshot,
  MAP_FIELDS,
  type OutcomeMap,
  type PortablePath,
  required,
  STAT_TYPES,
} from './archive-types.js';

const protobufArchive = sonarjs.fscache.Archive;

function restoreFsError(error: sonarjs.fscache.FsError.$Properties): FsCacheErrorSnapshot {
  return Object.fromEntries(
    Object.entries(error).filter(([, value]) => value !== null),
  ) as FsCacheErrorSnapshot;
}

function typedVoid(entries: OutcomeMap<null> = {}) {
  return Object.entries(entries).map(([key, outcome]) => ({
    key,
    ...(outcome.ok ? { success: {} } : { error: outcome.error }),
  }));
}

function restoreVoid(entries: sonarjs.fscache.VoidObservation.$Properties[]): OutcomeMap<null> {
  return Object.fromEntries(
    entries.map(entry => [
      entry.key,
      entry.result === 'success'
        ? { ok: true, value: null }
        : { ok: false, error: restoreFsError(required(entry.error, 'void observation error')) },
    ]),
  ) as OutcomeMap<null>;
}

function typedStats(entries: OutcomeMap<CachedStat> = {}) {
  return Object.entries(entries).map(([key, outcome]) => ({
    key,
    ...(outcome.ok
      ? {
          value: {
            ...outcome.value.fields,
            types: STAT_TYPES.reduce(
              (mask, type, index) => mask | (outcome.value.types[type] ? 1 << index : 0),
              0,
            ),
          },
        }
      : { error: outcome.error }),
  }));
}

function restoreStats(
  entries: sonarjs.fscache.StatObservation.$Properties[],
): OutcomeMap<CachedStat> {
  return Object.fromEntries(
    entries.map(entry => {
      if (entry.result !== 'value') {
        return [
          entry.key,
          { ok: false, error: restoreFsError(required(entry.error, 'stat observation error')) },
        ];
      }
      const value = required(entry.value, 'stat observation value');
      return [
        entry.key,
        {
          ok: true,
          value: {
            fields: Object.fromEntries(
              Object.entries(value).filter(
                ([field, fieldValue]) => field !== 'types' && fieldValue !== null,
              ),
            ),
            types: Object.fromEntries(
              STAT_TYPES.map((type, index) => [type, Boolean((value.types ?? 0) & (1 << index))]),
            ),
          },
        },
      ];
    }),
  ) as OutcomeMap<CachedStat>;
}

function typedDirectories(entries: OutcomeMap<CachedDirectoryEntry[]> = {}) {
  return Object.entries(entries).map(([key, outcome]) => ({
    key,
    ...(outcome.ok
      ? {
          value: {
            entries: outcome.value.map(entry => {
              const common = {
                dirent: entry.kind === 'dirent',
                nameIsBuffer: entry.name.kind === 'buffer',
                name: Buffer.from(
                  entry.name.value,
                  entry.name.kind === 'buffer' ? 'base64' : 'utf8',
                ),
              };
              return entry.kind === 'dirent'
                ? {
                    ...common,
                    type: DIRENT_TYPES.indexOf(entry.type),
                    parentPath: {
                      relative: entry.parentPath.kind === 'relative',
                      path: entry.parentPath.path,
                    },
                  }
                : common;
            }),
          },
        }
      : { error: outcome.error }),
  }));
}

function restoreDirectories(
  entries: sonarjs.fscache.DirectoryObservation.$Properties[],
): OutcomeMap<CachedDirectoryEntry[]> {
  return Object.fromEntries(
    entries.map(entry => {
      if (entry.result !== 'value') {
        return [
          entry.key,
          {
            ok: false,
            error: restoreFsError(required(entry.error, 'directory observation error')),
          },
        ];
      }
      const value = required(entry.value, 'directory observation value');
      return [
        entry.key,
        {
          ok: true,
          value: required(value.entries, 'directory entries').map(directoryEntry => ({
            kind: directoryEntry.dirent ? 'dirent' : 'name',
            name: {
              kind: directoryEntry.nameIsBuffer ? 'buffer' : 'string',
              value: Buffer.from(required(directoryEntry.name, 'directory entry name')).toString(
                directoryEntry.nameIsBuffer ? 'base64' : 'utf8',
              ),
            },
            ...(directoryEntry.dirent ? { type: DIRENT_TYPES[directoryEntry.type ?? 0] } : {}),
            ...(directoryEntry.parentPath
              ? {
                  parentPath: {
                    kind: directoryEntry.parentPath.relative ? 'relative' : 'absolute',
                    path: directoryEntry.parentPath.path,
                  },
                }
              : {}),
          })),
        },
      ];
    }),
  ) as OutcomeMap<CachedDirectoryEntry[]>;
}

function typedPaths(entries: OutcomeMap<{ path: PortablePath }> = {}) {
  return Object.entries(entries).map(([key, outcome]) =>
    outcome.ok
      ? {
          key,
          value: {
            relative: outcome.value.path.kind === 'relative',
            path: outcome.value.path.path,
          },
        }
      : { key, error: outcome.error },
  );
}

function restorePaths(
  entries: sonarjs.fscache.PathObservation.$Properties[],
): OutcomeMap<{ path: PortablePath }> {
  return Object.fromEntries(
    entries.map(entry => {
      if (entry.result !== 'value') {
        return [
          entry.key,
          { ok: false, error: restoreFsError(required(entry.error, 'path observation error')) },
        ];
      }
      const value = required(entry.value, 'path observation value');
      return [
        entry.key,
        {
          ok: true,
          value: {
            path: {
              kind: value.relative ? 'relative' : 'absolute',
              path: required(value.path, 'portable path'),
            },
          },
        },
      ];
    }),
  ) as OutcomeMap<{ path: PortablePath }>;
}

function typedNames(entries: OutcomeMap<CachedName> = {}) {
  return Object.entries(entries).map(([key, outcome]) =>
    outcome.ok
      ? {
          key,
          value: {
            buffer: outcome.value.kind === 'buffer',
            value: Buffer.from(
              outcome.value.value,
              outcome.value.kind === 'buffer' ? 'base64' : 'utf8',
            ),
          },
        }
      : { key, error: outcome.error },
  );
}

function restoreNames(
  entries: sonarjs.fscache.NameObservation.$Properties[],
): OutcomeMap<CachedName> {
  return Object.fromEntries(
    entries.map(entry => {
      if (entry.result !== 'value') {
        return [
          entry.key,
          { ok: false, error: restoreFsError(required(entry.error, 'name observation error')) },
        ];
      }
      const value = required(entry.value, 'name observation value');
      return [
        entry.key,
        {
          ok: true,
          value: {
            kind: value.buffer ? 'buffer' : 'string',
            value: Buffer.from(required(value.value, 'name observation bytes')).toString(
              value.buffer ? 'base64' : 'utf8',
            ),
          },
        },
      ];
    }),
  ) as OutcomeMap<CachedName>;
}

export function serializeProtobufDocument(document: ArchiveDocument) {
  const missingPaths = document.entries
    .filter(({ node }) => Object.keys(node).length === 1 && node.exists === false)
    .map(({ path }) => path);
  return protobufArchive
    .encode({
      ...document,
      missingPaths,
      entries: document.entries
        .filter(({ node }) => !(Object.keys(node).length === 1 && node.exists === false))
        .map(({ path, node }) => {
          const { content } = node;
          const unsupportedFields = Object.keys(node).filter(
            field => !['exists', 'linkExists', 'content', ...MAP_FIELDS].includes(field),
          );
          if (unsupportedFields.length > 0) {
            throw new TypeError(
              `Filesystem cache path '${path}' has unsupported fields: ${unsupportedFields.join(', ')}`,
            );
          }
          const entry = {
            path,
            exists: node.exists,
            linkExists: node.linkExists,
            stats: typedStats(node.stats),
            access: typedVoid(node.access),
            opens: typedVoid(node.opens),
            directories: typedDirectories(node.directories),
            realpaths: typedPaths(node.realpaths),
            readlinks: typedNames(node.readlinks),
          };
          if (!content) {
            return entry;
          }
          if (!content.ok) {
            return {
              ...entry,
              contentError: content.error,
            };
          }
          return {
            ...entry,
            content: Buffer.isBuffer(content.value)
              ? content.value
              : Buffer.from(content.value, 'base64'),
          };
        }),
    })
    .finish();
}

export function deserializeProtobufDocument(bytes: Uint8Array) {
  const document = protobufArchive.decode(bytes);
  return {
    magic: document.magic,
    formatVersion: document.formatVersion,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    missingPaths: document.missingPaths,
    entries: document.entries.map(entry => {
      const node: CacheNode = {};
      if (entry.exists !== null) {
        node.exists = entry.exists;
      }
      if (entry.linkExists !== null) {
        node.linkExists = entry.linkExists;
      }
      if (entry.stats?.length) {
        node.stats = restoreStats(entry.stats);
      }
      if (entry.access?.length) {
        node.access = restoreVoid(entry.access);
      }
      if (entry.opens?.length) {
        node.opens = restoreVoid(entry.opens);
      }
      if (entry.directories?.length) {
        node.directories = restoreDirectories(entry.directories);
      }
      if (entry.realpaths?.length) {
        node.realpaths = restorePaths(entry.realpaths);
      }
      if (entry.readlinks?.length) {
        node.readlinks = restoreNames(entry.readlinks);
      }
      if (entry.contentResult === 'content') {
        node.content = {
          ok: true,
          value: Buffer.isBuffer(entry.content)
            ? entry.content
            : Buffer.from(required(entry.content, 'content bytes')),
        };
      } else if (entry.contentResult === 'contentError') {
        node.content = {
          ok: false,
          error: restoreFsError(required(entry.contentError, 'content error')),
        };
      }
      return { path: required(entry.path, 'entry path'), node };
    }),
  };
}
