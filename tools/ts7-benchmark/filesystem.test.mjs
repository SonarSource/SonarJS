import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { createNativeFileSystem } from '../../packages/analysis/src/jsts/native/filesystem.mjs';

const cwd = path.resolve('tools/ts7-benchmark/fixture');
const file = path.join(cwd, 'index.ts');
const notFound = () => {
  throw Object.assign(new Error('absent'), { code: 'ENOENT' });
};
const absentIO = {
  readFileSync: notFound,
  statSync: notFound,
  readdirSync: notFound,
  realpathSync: notFound,
};

test('request text takes precedence over cache and disk, including empty text', () => {
  const captured = [];
  const adapter = createNativeFileSystem({
    cwd,
    requestFiles: new Map([[file, '']]),
    contentCache: new Map([[file, 'stale']]),
    io: absentIO,
    captureProvidedFile: (...args) => captured.push(args),
  });
  assert.equal(adapter.callbacks.readFile(file), '');
  assert.equal(adapter.callbacks.fileExists(file), true);
  assert.equal(adapter.callbacks.directoryExists(cwd), true);
  assert.deepEqual(captured, [[file, '']]);
  assert.equal(adapter.callbacks.stat(file).size, 0);
  assert.equal(adapter.callbacks.realpath(file), file);
});

test('read content is cached even when the file is empty', () => {
  let reads = 0;
  const adapter = createNativeFileSystem({
    cwd,
    io: {
      ...absentIO,
      readFileSync: () => {
        reads++;
        return '';
      },
    },
  });
  assert.equal(adapter.callbacks.readFile(file), '');
  assert.equal(adapter.callbacks.readFile(file), '');
  assert.equal(reads, 1);
});

test('incremental callbacks retain omitted buffers and invalidate disk text and overlay directories', () => {
  const buffer = path.join(cwd, 'buffer.ts');
  const nested = path.join(cwd, 'nested', 'virtual.ts');
  let disk = 'old disk';
  const adapter = createNativeFileSystem({
    cwd,
    requestFiles: new Map([
      [buffer, 'unsaved'],
      [nested, 'virtual'],
    ]),
    io: { ...absentIO, readFileSync: () => disk },
  });
  assert.equal(adapter.callbacks.readFile(file), 'old disk');
  disk = 'new disk';
  adapter.updateRequestFiles(new Map(), [file, path.dirname(nested)]);
  assert.equal(adapter.callbacks.readFile(file), 'new disk');
  assert.equal(adapter.callbacks.readFile(buffer), 'unsaved');
  assert.equal(adapter.callbacks.directoryExists(path.dirname(nested)), false);
  adapter.updateRequestFiles(new Map([[buffer, 'updated']]));
  assert.equal(adapter.callbacks.readFile(buffer), 'updated');
});

test('known missing observations become absent, not fatal errors', () => {
  const adapter = createNativeFileSystem({ cwd, io: absentIO });
  assert.equal(adapter.callbacks.readFile(file), undefined);
  assert.equal(adapter.callbacks.fileExists(file), false);
  assert.equal(adapter.callbacks.directoryExists(cwd), false);
  assert.equal(adapter.callbacks.stat(file), undefined);
  assert.equal(adapter.callbacks.realpath(file), file);
  assert.deepEqual(adapter.callbacks.getAccessibleEntries(cwd), {
    files: [],
    directories: [],
    symlinks: [],
  });
  adapter.assertHealthy();
});

test('unknown replay observation remains fatal even when the caller catches it', () => {
  const miss = Object.assign(new Error('unrecorded read'), { code: 'ERR_SONARJS_FS_CACHE_MISS' });
  const adapter = createNativeFileSystem({
    cwd,
    io: {
      ...absentIO,
      readFileSync() {
        throw miss;
      },
    },
  });
  assert.throws(
    () => adapter.callbacks.readFile(file),
    error => error === miss,
  );
  assert.throws(
    () => adapter.assertHealthy(),
    error => error === miss,
  );
  assert.throws(
    () => adapter.callbacks.fileExists(file),
    error => error === miss,
  );
  assert.equal(adapter.getMetrics().readFile.failures, 1);
});

test('archived content proves file existence without an archived stat', () => {
  const adapter = createNativeFileSystem({ cwd, io: absentIO, hasArchivedFileContent: () => true });
  assert.equal(adapter.callbacks.fileExists(file), true);
});

test('outside-root node_modules are hidden, except explicit compiler libraries', () => {
  const outside = path.resolve(cwd, '..', 'node_modules', 'foreign', 'index.ts');
  const library = path.dirname(outside);
  const io = { ...absentIO, readFileSync: () => 'library' };
  const adapter = createNativeFileSystem({ cwd, io, skipOutsideNodeModules: true });
  assert.equal(adapter.callbacks.readFile(outside), undefined);
  assert.equal(adapter.callbacks.fileExists(outside), false);
  const permitted = createNativeFileSystem({
    cwd,
    io,
    skipOutsideNodeModules: true,
    libraryDirectories: [library],
  });
  assert.equal(permitted.callbacks.readFile(outside), 'library');
});

test('case-insensitive lookup finds authoritative text under another casing', () => {
  const adapter = createNativeFileSystem({
    cwd,
    io: absentIO,
    caseSensitive: false,
    requestFiles: new Map([[file, 'correct']]),
  });
  assert.equal(adapter.callbacks.readFile(file.toUpperCase()), 'correct');
});

test('directory entries merge overlays and classify symlink targets', () => {
  const entry = (name, kind) => ({
    name,
    isFile: () => kind === 'file',
    isDirectory: () => kind === 'directory',
    isSymbolicLink: () => kind === 'link',
  });
  const adapter = createNativeFileSystem({
    cwd,
    caseSensitive: true,
    requestFiles: new Map([
      [file, 'text'],
      [path.join(cwd, 'nested', 'model.ts'), 'text'],
    ]),
    io: {
      ...absentIO,
      readdirSync: () => [entry('disk.ts', 'file'), entry('link', 'link')],
      statSync: () => ({ isFile: () => false, isDirectory: () => true }),
    },
  });
  assert.deepEqual(adapter.callbacks.getAccessibleEntries(cwd), {
    files: ['disk.ts', 'index.ts'],
    directories: ['link', 'nested'],
    symlinks: ['link'],
  });
});

test('overlay directories do not hide an unknown underlying directory listing', () => {
  const miss = Object.assign(new Error('unrecorded directory'), {
    code: 'ERR_SONARJS_FS_CACHE_MISS',
  });
  const adapter = createNativeFileSystem({
    cwd,
    requestFiles: new Map([[file, 'text']]),
    io: {
      ...absentIO,
      readdirSync() {
        throw miss;
      },
    },
  });
  assert.equal(adapter.callbacks.directoryExists(cwd), true);
  assert.throws(
    () => adapter.callbacks.getAccessibleEntries(cwd),
    error => error === miss,
  );
});

test('case-insensitive directory overlays preserve the original filename spelling', () => {
  const adapter = createNativeFileSystem({
    cwd,
    io: absentIO,
    caseSensitive: false,
    requestFiles: new Map([[path.join(cwd, 'Model.ts'), 'text']]),
  });
  assert.deepEqual(adapter.callbacks.getAccessibleEntries(cwd).files, ['Model.ts']);
});

for (const [encoding, bytes] of [
  ['utf8', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('source')])],
  ['utf16le', Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('source', 'utf16le')])],
  [
    'utf16be',
    Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from('source', 'utf16le').swap16()]),
  ],
]) {
  test(`disk reads decode ${encoding} BOM without mutating archived bytes`, () => {
    const original = Buffer.from(bytes);
    const adapter = createNativeFileSystem({ cwd, io: { ...absentIO, readFileSync: () => bytes } });
    assert.equal(adapter.callbacks.readFile(file), 'source');
    assert.deepEqual(bytes, original);
  });
}

test('directory index grows after dependency reads and respects path boundaries', () => {
  const nested = path.join(cwd, 'dependencies', 'nested', 'module.ts');
  const adapter = createNativeFileSystem({
    cwd,
    io: { ...absentIO, readFileSync: () => 'export {};' },
  });
  assert.equal(adapter.callbacks.directoryExists(path.dirname(nested)), false);
  adapter.callbacks.readFile(nested);
  assert.equal(adapter.callbacks.directoryExists(path.dirname(nested)), true);
  assert.equal(adapter.callbacks.directoryExists(path.join(cwd, 'dependencies')), true);
  assert.equal(adapter.callbacks.directoryExists(cwd), true);
  assert.equal(adapter.callbacks.directoryExists(path.join(cwd, 'depend')), false);
  assert.equal(adapter.callbacks.directoryExists(nested), false);
});
