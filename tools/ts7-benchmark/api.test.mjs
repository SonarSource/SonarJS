import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { API } from 'typescript-native/sync';
import { createFileSystem, createFileSystemLayer } from 'typescript-native/fs';
import { isVariableStatement } from 'typescript-native/ast/is';
import { runSmoke } from './smoke.mjs';
import { createNativeFileSystem } from '../../packages/analysis/src/jsts/native/filesystem.mjs';

for (const mode of ['callbacks', 'vfs']) {
  test(`explicit native program resolves an import using ${mode}`, () => {
    const result = runSmoke(mode);
    assert.equal(result.type, 'string');
    assert.equal(result.timing.enabled, true);
    assert.equal(result.timing.totals.sourceFilesFetched, 1);
    assert.ok(result.timing.totals.requestCount > 0);
  });
}

test('snapshot layer updates text while preserving the previous snapshot', () => {
  const cwd = path.resolve('tools/ts7-benchmark/virtual-project');
  const file = path.join(cwd, 'update.ts').replaceAll('\\', '/');
  const oldText = 'export const value: string = "old";';
  const newText = 'export const value: number = 42;';
  const api = new API({ cwd, useCaseSensitiveFileNames: true });
  let original;
  let updated;
  const getType = snapshot => {
    const project = snapshot.getProjects()[0];
    const source = project.program.getSourceFile(file);
    const statement = source.statements.find(isVariableStatement);
    return project.checker.typeToString(
      project.checker.getTypeAtLocation(statement.declarationList.declarations[0].name),
    );
  };
  try {
    original = api.createSnapshot({
      fileSystem: createFileSystem([[file, oldText]]),
      createPrograms: [{ rootFiles: [file], compilerOptions: { noLib: true, noEmit: true } }],
    });
    updated = original.update({
      fileSystem: createFileSystemLayer([[file, newText]]),
      ensurePrograms: true,
      fileNotifications: { invalidateAll: true },
    });
    assert.equal(getType(original), 'string');
    assert.equal(getType(updated), 'number');
    assert.equal(original.getProjects()[0].program.getSourceFile(file).text, oldText);
    assert.equal(updated.getProjects()[0].program.getSourceFile(file).text, newText);
  } finally {
    updated?.dispose();
    original?.dispose();
    api.close();
  }
});

test('native callback error aborts the program request and remains fatal', () => {
  const cwd = path.resolve('tools/ts7-benchmark/virtual-project');
  const file = path.join(cwd, 'missing.ts').replaceAll('\\', '/');
  const miss = Object.assign(new Error('unrecorded compiler read'), {
    code: 'ERR_SONARJS_FS_CACHE_MISS',
  });
  const fail = () => {
    throw miss;
  };
  const adapter = createNativeFileSystem({
    cwd,
    io: { statSync: fail, readFileSync: fail, readdirSync: fail, realpathSync: fail },
  });
  const api = new API({ cwd, fs: adapter.callbacks, useCaseSensitiveFileNames: true });
  try {
    assert.throws(
      () => api.createProgram([file], { noLib: true, noEmit: true }),
      /unrecorded compiler read/,
    );
    assert.throws(
      () => adapter.assertHealthy(),
      error => error === miss,
    );
  } finally {
    api.close();
  }
});
