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
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import {
  FsCacheArchive,
  FsCacheArchiveError,
  createNode,
  mergeNodes,
  sortedNode,
} from './archive.mjs';

const DISK_ARCHIVE_MAGIC = 'sonarjs-filesystem-cache-disk';
const DISK_ARCHIVE_FORMAT_VERSION = 2;
const HEADER_MAGIC = Buffer.from('SJFSCB01');
const FOOTER_MAGIC = Buffer.from('SJFSCEND');
const FOOTER_LENGTH = FOOTER_MAGIC.length + 16;
const ARCHIVE_FILE_MODE = 0o600;
const COPY_BUFFER_SIZE = 64 * 1024;
const LOCK_RETRY_DELAY_MS = 10;
const LOCK_RETRY_LIMIT = 1_000;
const LOCK_STALE_AGE_MS = LOCK_RETRY_DELAY_MS * LOCK_RETRY_LIMIT;
const BLOB_REFERENCE = '$sonarjsFsCacheBlob';

const nativeFs = {
  closeSync: fs.closeSync.bind(fs),
  existsSync: fs.existsSync.bind(fs),
  fstatSync: fs.fstatSync.bind(fs),
  mkdirSync: fs.mkdirSync.bind(fs),
  openSync: fs.openSync.bind(fs),
  readSync: fs.readSync.bind(fs),
  renameSync: fs.renameSync.bind(fs),
  statSync: fs.statSync.bind(fs),
  unlinkSync: fs.unlinkSync.bind(fs),
  writeSync: fs.writeSync.bind(fs),
};

function writeAll(descriptor, bytes, position = null) {
  let offset = 0;
  while (offset < bytes.length) {
    const written = nativeFs.writeSync(
      descriptor,
      bytes,
      offset,
      bytes.length - offset,
      position === null ? null : position + offset,
    );
    if (written === 0) {
      throw new FsCacheArchiveError('Could not make progress writing filesystem cache archive');
    }
    offset += written;
  }
}

function readExact(descriptor, length, position) {
  const bytes = Buffer.allocUnsafe(length);
  let offset = 0;
  while (offset < length) {
    const read = nativeFs.readSync(descriptor, bytes, offset, length - offset, position + offset);
    if (read === 0) {
      throw new FsCacheArchiveError('Filesystem cache archive ended unexpectedly');
    }
    offset += read;
  }
  return bytes;
}

function encodeVarint(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new FsCacheArchiveError(`Cannot encode invalid protobuf integer: ${value}`);
  }
  const bytes = [];
  do {
    let byte = value % 128;
    value = Math.floor(value / 128);
    if (value !== 0) {
      byte |= 0x80;
    }
    bytes.push(byte);
  } while (value !== 0);
  return Buffer.from(bytes);
}

function encodeLengthDelimited(field, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return Buffer.concat([encodeVarint((field << 3) | 2), encodeVarint(bytes.length), bytes]);
}

function encodeUnsigned(field, value) {
  return Buffer.concat([encodeVarint(field << 3), encodeVarint(value)]);
}

function encodeEntry(entry) {
  return Buffer.concat([
    encodeLengthDelimited(1, entry.path),
    encodeLengthDelimited(2, Buffer.from(JSON.stringify(entry.node))),
  ]);
}

function encodeIndex(document) {
  const fields = [
    encodeLengthDelimited(1, document.magic),
    encodeUnsigned(2, document.formatVersion),
  ];
  if (document.analyzerVersion) {
    fields.push(encodeLengthDelimited(3, document.analyzerVersion));
  }
  fields.push(
    encodeLengthDelimited(4, document.createdAt),
    encodeLengthDelimited(5, document.updatedAt),
  );
  for (const entry of document.entries) {
    fields.push(encodeLengthDelimited(6, encodeEntry(entry)));
  }
  return Buffer.concat(fields);
}

class ProtobufReader {
  constructor(bytes) {
    this.bytes = bytes;
    this.offset = 0;
  }

  get done() {
    return this.offset === this.bytes.length;
  }

  readVarint() {
    let result = 0;
    let multiplier = 1;
    for (let index = 0; index < 10; index++) {
      if (this.offset >= this.bytes.length) {
        throw new FsCacheArchiveError('Filesystem cache protobuf ended unexpectedly');
      }
      const byte = this.bytes[this.offset++];
      result += (byte & 0x7f) * multiplier;
      if ((byte & 0x80) === 0) {
        if (!Number.isSafeInteger(result)) {
          throw new FsCacheArchiveError('Filesystem cache protobuf integer exceeds safe range');
        }
        return result;
      }
      multiplier *= 128;
    }
    throw new FsCacheArchiveError('Filesystem cache protobuf contains an invalid integer');
  }

  readBytes() {
    const length = this.readVarint();
    const end = this.offset + length;
    if (end > this.bytes.length) {
      throw new FsCacheArchiveError('Filesystem cache protobuf field exceeds its message');
    }
    const value = this.bytes.subarray(this.offset, end);
    this.offset = end;
    return value;
  }

  skip(wireType) {
    if (wireType === 0) {
      this.readVarint();
      return;
    }
    if (wireType === 1) {
      this.offset += 8;
    } else if (wireType === 2) {
      this.offset += this.readVarint();
    } else if (wireType === 5) {
      this.offset += 4;
    } else {
      throw new FsCacheArchiveError(`Unsupported filesystem cache protobuf wire type: ${wireType}`);
    }
    if (this.offset > this.bytes.length) {
      throw new FsCacheArchiveError('Filesystem cache protobuf field exceeds its message');
    }
  }
}

function decodeEntry(bytes) {
  const reader = new ProtobufReader(bytes);
  const entry = {};
  while (!reader.done) {
    const tag = reader.readVarint();
    const field = tag >>> 3;
    const wireType = tag & 7;
    if (field === 1 && wireType === 2) {
      entry.path = reader.readBytes().toString('utf8');
    } else if (field === 2 && wireType === 2) {
      entry.node = JSON.parse(reader.readBytes().toString('utf8'));
    } else {
      reader.skip(wireType);
    }
  }
  return entry;
}

function decodeIndex(bytes) {
  const reader = new ProtobufReader(bytes);
  const document = { entries: [] };
  while (!reader.done) {
    const tag = reader.readVarint();
    const field = tag >>> 3;
    const wireType = tag & 7;
    if (field === 1 && wireType === 2) {
      document.magic = reader.readBytes().toString('utf8');
    } else if (field === 2 && wireType === 0) {
      document.formatVersion = reader.readVarint();
    } else if (field === 3 && wireType === 2) {
      document.analyzerVersion = reader.readBytes().toString('utf8');
    } else if (field === 4 && wireType === 2) {
      document.createdAt = reader.readBytes().toString('utf8');
    } else if (field === 5 && wireType === 2) {
      document.updatedAt = reader.readBytes().toString('utf8');
    } else if (field === 6 && wireType === 2) {
      document.entries.push(decodeEntry(reader.readBytes()));
    } else {
      reader.skip(wireType);
    }
  }
  return document;
}

function blobReference(outcome) {
  return outcome?.ok && outcome.value?.[BLOB_REFERENCE];
}

function withBlobSource(node, sourcePath) {
  const blob = blobReference(node.content);
  if (blob) {
    blob.sourcePath = sourcePath;
  }
  return node;
}

function portableNode(node) {
  const result = sortedNode(node);
  const blob = blobReference(result.content);
  if (blob) {
    const { offset, compressedLength, rawLength } = blob;
    result.content = {
      ok: true,
      value: { [BLOB_REFERENCE]: { offset, compressedLength, rawLength } },
    };
  }
  return result;
}

function removeStaleLock(lockPath) {
  try {
    const age = Date.now() - nativeFs.statSync(lockPath).mtimeMs;
    if (age < LOCK_STALE_AGE_MS) {
      return false;
    }
    nativeFs.unlinkSync(lockPath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return true;
    }
    throw error;
  }
}

function acquireLock(lockPath, archivePath) {
  const waiter = new Int32Array(new SharedArrayBuffer(4));
  for (let attempt = 0; attempt < LOCK_RETRY_LIMIT; attempt++) {
    try {
      return nativeFs.openSync(lockPath, 'wx', ARCHIVE_FILE_MODE);
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        throw error;
      }
      if (removeStaleLock(lockPath)) {
        continue;
      }
      if (attempt === LOCK_RETRY_LIMIT - 1) {
        throw new FsCacheArchiveError(
          `Timed out waiting to write filesystem cache archive: ${archivePath}`,
          { cause: error },
        );
      }
      Atomics.wait(waiter, 0, 0, LOCK_RETRY_DELAY_MS);
    }
  }
  throw new FsCacheArchiveError(
    `Timed out waiting to write filesystem cache archive: ${archivePath}`,
  );
}

function readIndex(archivePath) {
  const descriptor = nativeFs.openSync(archivePath, 'r');
  try {
    const size = nativeFs.fstatSync(descriptor).size;
    if (size < HEADER_MAGIC.length + FOOTER_LENGTH) {
      throw new FsCacheArchiveError('Filesystem cache disk archive is too small');
    }
    if (!readExact(descriptor, HEADER_MAGIC.length, 0).equals(HEADER_MAGIC)) {
      throw new FsCacheArchiveError('Filesystem cache disk archive has an invalid header');
    }
    const footer = readExact(descriptor, FOOTER_LENGTH, size - FOOTER_LENGTH);
    if (!footer.subarray(0, FOOTER_MAGIC.length).equals(FOOTER_MAGIC)) {
      throw new FsCacheArchiveError('Filesystem cache disk archive has an invalid footer');
    }
    const indexOffset = Number(footer.readBigUInt64LE(FOOTER_MAGIC.length));
    const indexLength = Number(footer.readBigUInt64LE(FOOTER_MAGIC.length + 8));
    if (
      !Number.isSafeInteger(indexOffset) ||
      !Number.isSafeInteger(indexLength) ||
      indexOffset < HEADER_MAGIC.length ||
      indexLength < 0 ||
      indexOffset + indexLength !== size - FOOTER_LENGTH
    ) {
      throw new FsCacheArchiveError('Filesystem cache disk archive index is out of bounds');
    }
    return decodeIndex(gunzipSync(readExact(descriptor, indexLength, indexOffset)));
  } finally {
    nativeFs.closeSync(descriptor);
  }
}

function cachedDescriptor(descriptors, sourcePath) {
  let descriptor = descriptors.get(sourcePath);
  if (descriptor === undefined) {
    descriptor = nativeFs.openSync(sourcePath, 'r');
    descriptors.set(sourcePath, descriptor);
  }
  return descriptor;
}

function closeDescriptors(descriptors) {
  for (const descriptor of descriptors.values()) {
    nativeFs.closeSync(descriptor);
  }
  descriptors.clear();
}

function copyBlob(source, targetDescriptor, targetOffset, sourceDescriptors) {
  const sourceDescriptor = cachedDescriptor(sourceDescriptors, source.sourcePath);
  const buffer = Buffer.allocUnsafe(Math.min(COPY_BUFFER_SIZE, source.compressedLength));
  let copied = 0;
  while (copied < source.compressedLength) {
    const length = Math.min(buffer.length, source.compressedLength - copied);
    const read = nativeFs.readSync(sourceDescriptor, buffer, 0, length, source.offset + copied);
    if (read === 0) {
      throw new FsCacheArchiveError('Filesystem cache compressed content ended unexpectedly');
    }
    writeAll(targetDescriptor, buffer.subarray(0, read), targetOffset + copied);
    copied += read;
  }
}

/**
 * Disk-backed archive whose content blobs are compressed as soon as they are observed.
 *
 * Only semantic metadata and blob offsets stay in memory. The final file contains compressed
 * blobs followed by a protobuf index and a fixed-size footer pointing at that index.
 */
export class DiskFsCacheArchive extends FsCacheArchive {
  constructor(options) {
    super(options);
    const memoryLimitMb = Number(options.diskMemoryLimitMb ?? 0);
    if (!Number.isFinite(memoryLimitMb) || memoryLimitMb < 0) {
      throw new FsCacheArchiveError(
        `Invalid disk filesystem cache memory limit: ${options.diskMemoryLimitMb}`,
      );
    }
    this.contentCacheLimit = Math.floor(memoryLimitMb * 1024 * 1024);
    this.contentCache = new Map();
    this.contentCacheBytes = 0;
    this.sourceDescriptors = new Map();
    this.spoolPath = `${this.archivePath}.${process.pid}.${randomUUID()}.spool`;
    this.spoolDescriptor = undefined;
    this.spoolOffset = 0;
  }

  load() {
    if (!nativeFs.existsSync(this.archivePath)) {
      if (this.mode === 'replay') {
        throw new FsCacheArchiveError(
          `Filesystem cache archive does not exist: ${this.archivePath}`,
        );
      }
      return;
    }

    let document;
    try {
      document = readIndex(this.archivePath);
    } catch (error) {
      if (error instanceof FsCacheArchiveError) {
        throw error;
      }
      throw new FsCacheArchiveError(`Cannot read filesystem cache archive: ${this.archivePath}`, {
        cause: error,
      });
    }
    if (document.magic !== DISK_ARCHIVE_MAGIC) {
      throw new FsCacheArchiveError(`Not a SonarJS disk filesystem cache: ${this.archivePath}`);
    }
    if (document.formatVersion !== DISK_ARCHIVE_FORMAT_VERSION) {
      throw new FsCacheArchiveError(
        `Unsupported disk filesystem cache format ${document.formatVersion}; expected ${DISK_ARCHIVE_FORMAT_VERSION}`,
        { incompatible: true },
      );
    }
    if (this.analyzerVersion && document.analyzerVersion !== this.analyzerVersion) {
      throw new FsCacheArchiveError(
        `Filesystem cache analyzer version ${document.analyzerVersion || '<unspecified>'} does not match ${this.analyzerVersion}`,
        { incompatible: true },
      );
    }
    this.createdAt = document.createdAt || this.createdAt;
    this.entries = new Map();
    for (const entry of document.entries) {
      if (
        !entry ||
        typeof entry.path !== 'string' ||
        !entry.node ||
        typeof entry.node !== 'object'
      ) {
        throw new FsCacheArchiveError('Filesystem cache archive contains an invalid entry');
      }
      this.entries.set(entry.path, withBlobSource(createNode(entry.node), this.archivePath));
    }
  }

  get(key, operation) {
    const outcome = super.get(key, operation);
    const blob = operation === 'readFile' ? blobReference(outcome) : undefined;
    if (!blob) {
      return outcome;
    }
    const cacheKey = this.contentCacheKey(blob);
    let content = this.contentCache.get(cacheKey);
    if (content !== undefined) {
      this.contentCache.delete(cacheKey);
      this.contentCache.set(cacheKey, content);
      return { ok: true, value: content };
    }
    const descriptor = cachedDescriptor(this.sourceDescriptors, blob.sourcePath);
    const compressed = readExact(descriptor, blob.compressedLength, blob.offset);
    content = gunzipSync(compressed);
    if (content.length !== blob.rawLength) {
      throw new FsCacheArchiveError(
        `Filesystem cache content length ${content.length} does not match ${blob.rawLength}`,
      );
    }
    this.cacheContent(cacheKey, content);
    return { ok: true, value: content };
  }

  set(key, operation, outcome) {
    if (operation === 'readFile' && outcome?.ok && typeof outcome.value === 'string') {
      const content = Buffer.from(outcome.value, 'base64');
      const compressed = gzipSync(content, { mtime: 0 });
      if (this.spoolDescriptor === undefined) {
        nativeFs.mkdirSync(path.dirname(this.spoolPath), { recursive: true });
        this.spoolOffset = nativeFs.existsSync(this.spoolPath)
          ? nativeFs.statSync(this.spoolPath).size
          : 0;
        this.spoolDescriptor = nativeFs.openSync(this.spoolPath, 'a', ARCHIVE_FILE_MODE);
      }
      const offset = this.spoolOffset;
      writeAll(this.spoolDescriptor, compressed);
      this.spoolOffset += compressed.length;
      outcome = {
        ok: true,
        value: {
          [BLOB_REFERENCE]: {
            sourcePath: this.spoolPath,
            offset,
            compressedLength: compressed.length,
            rawLength: content.length,
          },
        },
      };
      this.cacheContent(this.contentCacheKey(outcome.value[BLOB_REFERENCE]), content);
    }
    super.set(key, operation, outcome);
  }

  contentCacheKey(blob) {
    return `${blob.sourcePath}\0${blob.offset}\0${blob.compressedLength}\0${blob.rawLength}`;
  }

  cacheContent(key, content) {
    if (this.contentCacheLimit === 0 || content.length > this.contentCacheLimit) {
      return;
    }
    const previous = this.contentCache.get(key);
    if (previous !== undefined) {
      this.contentCacheBytes -= previous.length;
      this.contentCache.delete(key);
    }
    this.contentCache.set(key, content);
    this.contentCacheBytes += content.length;
    while (this.contentCacheBytes > this.contentCacheLimit) {
      const oldestKey = this.contentCache.keys().next().value;
      const oldest = this.contentCache.get(oldestKey);
      this.contentCache.delete(oldestKey);
      this.contentCacheBytes -= oldest.length;
    }
  }

  clearContentCache() {
    this.contentCache.clear();
    this.contentCacheBytes = 0;
  }

  getStatistics() {
    return {
      ...super.getStatistics(),
      contentCacheBytes: this.contentCacheBytes,
      contentCacheLimitBytes: this.contentCacheLimit,
    };
  }

  closeSpool() {
    if (this.spoolDescriptor !== undefined) {
      nativeFs.closeSync(this.spoolDescriptor);
      this.spoolDescriptor = undefined;
    }
  }

  close() {
    this.closeSpool();
    closeDescriptors(this.sourceDescriptors);
    this.clearContentCache();
  }

  flush() {
    if (this.mode !== 'record' || !this.dirty) {
      return;
    }
    this.closeSpool();
    closeDescriptors(this.sourceDescriptors);
    const directory = path.dirname(this.archivePath);
    nativeFs.mkdirSync(directory, { recursive: true });
    const lockPath = `${this.archivePath}.lock`;
    const lockDescriptor = acquireLock(lockPath, this.archivePath);
    const temporaryPath = `${this.archivePath}.${process.pid}.${randomUUID()}.tmp`;
    try {
      let mergedEntries = new Map();
      if (nativeFs.existsSync(this.archivePath)) {
        try {
          const existing = new DiskFsCacheArchive({
            archivePath: this.archivePath,
            rootDir: this.rootDir,
            mode: 'replay',
            analyzerVersion: this.analyzerVersion,
          });
          existing.load();
          mergedEntries = existing.entries;
        } catch (error) {
          if (!error?.incompatible) {
            throw error;
          }
        }
      }
      for (const [entryPath, node] of this.entries) {
        mergedEntries.set(entryPath, mergeNodes(mergedEntries.get(entryPath), node));
      }

      const descriptor = nativeFs.openSync(temporaryPath, 'w', ARCHIVE_FILE_MODE);
      const sourceDescriptors = new Map();
      try {
        writeAll(descriptor, HEADER_MAGIC, 0);
        let offset = HEADER_MAGIC.length;
        const entries = [];
        for (const [entryPath, node] of [...mergedEntries.entries()].sort(([left], [right]) =>
          left.localeCompare(right),
        )) {
          const outputNode = portableNode(node);
          const source = blobReference(node.content);
          const output = blobReference(outputNode.content);
          if (source && output) {
            copyBlob(source, descriptor, offset, sourceDescriptors);
            output.offset = offset;
            offset += output.compressedLength;
          }
          entries.push({ path: entryPath, node: outputNode });
        }
        const index = gzipSync(
          encodeIndex({
            magic: DISK_ARCHIVE_MAGIC,
            formatVersion: DISK_ARCHIVE_FORMAT_VERSION,
            analyzerVersion: this.analyzerVersion,
            createdAt: this.createdAt,
            updatedAt: new Date().toISOString(),
            entries,
          }),
          { mtime: 0 },
        );
        writeAll(descriptor, index, offset);
        const footer = Buffer.alloc(FOOTER_LENGTH);
        FOOTER_MAGIC.copy(footer);
        footer.writeBigUInt64LE(BigInt(offset), FOOTER_MAGIC.length);
        footer.writeBigUInt64LE(BigInt(index.length), FOOTER_MAGIC.length + 8);
        writeAll(descriptor, footer, offset + index.length);
      } finally {
        closeDescriptors(sourceDescriptors);
        nativeFs.closeSync(descriptor);
      }
      nativeFs.renameSync(temporaryPath, this.archivePath);
      if (nativeFs.existsSync(this.spoolPath)) {
        nativeFs.unlinkSync(this.spoolPath);
      }
      this.spoolPath = `${this.archivePath}.${process.pid}.${randomUUID()}.spool`;
      this.spoolOffset = 0;
      this.clearContentCache();
      this.load();
      this.dirty = false;
    } finally {
      if (nativeFs.existsSync(temporaryPath)) {
        nativeFs.unlinkSync(temporaryPath);
      }
      nativeFs.closeSync(lockDescriptor);
      if (nativeFs.existsSync(lockPath)) {
        nativeFs.unlinkSync(lockPath);
      }
    }
  }
}
