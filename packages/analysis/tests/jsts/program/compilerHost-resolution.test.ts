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
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { CompilerOptions, CompilerHost, Program, Node } from 'typescript';
import { captureProvidedFile, installFsCache } from '../../../../shared/src/fs-cache/hook.js';

// TypeScript captures fs.realpathSync.native at import time, just as in the analysis worker.
installFsCache();
const { default: ts } = await import('typescript');
const { IncrementalCompilerHost } = await import('../../../src/jsts/program/compilerHost.js');
const { clearSourceFileContentCache, setSourceFilesContext } =
  await import('../../../src/jsts/program/cache/sourceFileCache.js');
const { isFileSystemCaseSensitive } = await import('../../../src/common/filesystem.js');
const { normalizePath, normalizeToAbsolutePath } =
  await import('../../../../shared/src/helpers/files.js');

// Keep compiler-host resolution assertions independent of rules which tolerate missing types.
describe('compiler host type resolution', () => {
  let temporary: string;
  let root: ReturnType<typeof normalizeToAbsolutePath>;
  const options: CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    types: [],
  };

  beforeEach(() => {
    clearSourceFileContentCache();
    temporary = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'compiler-resolution-')),
    );
    root = normalizeToAbsolutePath(path.join(temporary, 'project'));
    fs.mkdirSync(root);
  });

  afterEach(() => {
    clearSourceFileContentCache();
    fs.rmSync(temporary, { recursive: true, force: true });
  });

  function write(relative: string, content: string) {
    const file = normalizeToAbsolutePath(relative, root);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
  }

  function program(
    compilerOptions = options,
    host: CompilerHost = new IncrementalCompilerHost(compilerOptions, root),
  ) {
    return ts.createProgram([`${root}/consumer.ts`], compilerOptions, host);
  }

  function result(value: Program) {
    const source = value.getSourceFile(`${root}/consumer.ts`)!;
    const checker = value.getTypeChecker();
    const types: string[] = [];
    function visit(node: Node) {
      if (ts.isVoidExpression(node)) {
        types.push(checker.typeToString(checker.getTypeAtLocation(node.expression)));
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    return {
      types,
      diagnostics: value.getSemanticDiagnostics(source).map(d => d.code),
      declarations: value
        .getSourceFiles()
        .map(f => normalizePath(path.relative(root, f.fileName)))
        .filter(f => f.includes('query-core')),
    };
  }

  function replay(check: () => void) {
    const archivePath = path.join(temporary, 'fs.pb.gz');
    const cache = installFsCache();
    const record = cache.beginAnalysis({
      archivePath,
      rootDir: root,
      mode: 'record',
      caseSensitivePaths: isFileSystemCaseSensitive(),
    });
    try {
      check();
    } finally {
      assert.equal(record.end(), true);
    }
    fs.rmSync(root, { recursive: true });
    root = normalizeToAbsolutePath(path.join(temporary, 'relocated'));
    clearSourceFileContentCache();
    const replaySession = cache.beginAnalysis({
      archivePath,
      rootDir: root,
      mode: 'replay',
      caseSensitivePaths: isFileSystemCaseSensitive(),
    });
    try {
      check();
    } finally {
      assert.equal(replaySession.end(), true);
    }
  }

  for (const typeRoot of ['node_modules/@types', 'custom-types']) {
    it(`discovers wildcard packages in ${typeRoot} during recording and relocated replay`, () => {
      write(`${typeRoot}/localglobals/index.d.ts`, 'declare const localGlobal: string;');
      write('consumer.ts', 'void localGlobal;');
      const compilerOptions = { ...options, types: ['*'] };
      replay(() => {
        // Rebase configured type roots with the checkout.
        const configured = { ...compilerOptions, typeRoots: [`${root}/${typeRoot}`] };
        const value = program(configured);
        assert.deepEqual(result(value).types, ['string']);
        assert.deepEqual(result(value).diagnostics, []);
        assert.ok(
          value
            .getSourceFiles()
            .some(f => f.fileName.endsWith(`/${typeRoot}/localglobals/index.d.ts`)),
        );
      });
    });
  }

  it('continues to load explicitly named packages', () => {
    write('node_modules/@types/localglobals/index.d.ts', 'declare const localGlobal: number;');
    write('consumer.ts', 'void localGlobal;');
    replay(() => {
      const value = program({ ...options, types: ['localglobals'] });
      assert.deepEqual(result(value).types, ['number']);
      assert.deepEqual(result(value).diagnostics, []);
    });
  });

  // Minimal pnpm isolated-linker layout: query-core is intentionally not hoisted.
  function pnpmLayout() {
    write(
      'node_modules/.pnpm/react-query/node_modules/@tanstack/react-query/package.json',
      '{"name":"@tanstack/react-query","types":"index.d.ts"}',
    );
    write(
      'node_modules/.pnpm/react-query/node_modules/@tanstack/react-query/index.d.ts',
      'export { QueryClient } from "@tanstack/query-core";',
    );
    write(
      'node_modules/.pnpm/query-core/node_modules/@tanstack/query-core/package.json',
      '{"name":"@tanstack/query-core","types":"index.d.ts"}',
    );
    write(
      'node_modules/.pnpm/query-core/node_modules/@tanstack/query-core/index.d.ts',
      'export declare class QueryClient { invalidateQueries(options: { queryKey: string[] }): Promise<void>; }',
    );
    fs.mkdirSync(`${root}/node_modules/@tanstack`);
    fs.symlinkSync(
      '../.pnpm/react-query/node_modules/@tanstack/react-query',
      `${root}/node_modules/@tanstack/react-query`,
      'junction',
    );
    fs.symlinkSync(
      '../../../query-core/node_modules/@tanstack/query-core',
      `${root}/node_modules/.pnpm/react-query/node_modules/@tanstack/query-core`,
      'junction',
    );
    write(
      'consumer.ts',
      fs.readFileSync(new URL('./fixtures/pnpm-isolated/src/index.ts', import.meta.url), 'utf8'),
    );
  }

  for (const preserveSymlinks of [false, true]) {
    it(`matches ordinary TypeScript pnpm resolution with preserveSymlinks=${preserveSymlinks}`, () => {
      pnpmLayout();
      const compilerOptions = { ...options, preserveSymlinks };
      const expected = result(
        program(compilerOptions, ts.createCompilerHost(compilerOptions, true)),
      );
      assert.deepEqual(expected.types, [preserveSymlinks ? 'any' : 'Promise<void>']);
      assert.equal(fs.existsSync(`${root}/node_modules/@tanstack/query-core`), false);
      if (!preserveSymlinks) {
        const directoriesOnly: CompilerHost = new IncrementalCompilerHost(compilerOptions, root);
        directoriesOnly.realpath = undefined;
        assert.deepEqual(result(program(compilerOptions, directoriesOnly)).types, ['any']);
        clearSourceFileContentCache();
        const realpathOnly: CompilerHost = new IncrementalCompilerHost(compilerOptions, root);
        realpathOnly.directoryExists = undefined;
        realpathOnly.getDirectories = undefined;
        assert.deepEqual(result(program(compilerOptions, realpathOnly)), expected);
        clearSourceFileContentCache();
      }
      replay(() => {
        assert.deepEqual(result(program(compilerOptions)), expected);
      });
      if (!preserveSymlinks) {
        assert.ok(expected.declarations.length > 0);
        assert.deepEqual(expected.diagnostics, []);
      }
    });
  }

  const pnpmFixture = path.join(import.meta.dirname, 'fixtures/pnpm-isolated');
  it(
    'resolves the installed pnpm reproducer during recording and relocated replay',
    {
      skip:
        process.platform === 'win32' || !fs.existsSync(path.join(pnpmFixture, 'node_modules'))
          ? 'Install the pnpm fixture on a platform with relative symlinks to run this integration check'
          : false,
    },
    () => {
      fs.cpSync(pnpmFixture, root, { recursive: true, verbatimSymlinks: true });
      write('consumer.ts', fs.readFileSync(`${root}/src/index.ts`, 'utf8'));
      const config = JSON.parse(fs.readFileSync(`${root}/tsconfig.json`, 'utf8'));
      const compilerOptions = ts.convertCompilerOptionsFromJson(
        config.compilerOptions,
        root,
      ).options;
      assert.equal(fs.existsSync(`${root}/node_modules/@tanstack/query-core`), false);
      const expected = result(
        program(compilerOptions, ts.createCompilerHost(compilerOptions, true)),
      );
      assert.deepEqual(expected.types, ['Promise<void>']);
      assert.equal(expected.declarations.length, 12);
      assert.deepEqual(expected.diagnostics, []);
      replay(() => assert.deepEqual(result(program(compilerOptions)), expected));
    },
  );

  it('resolves imports from a request-only Vue source in a missing directory', () => {
    const file = `${root}/Component.vue`;
    const dependency = `${root}/virtual/dependencies/value.ts`;
    setSourceFilesContext({
      [file]: {
        fileContent:
          '<script lang="ts">import { value } from "./virtual/dependencies/value"; void value;</script>',
      },
      [dependency]: { fileContent: 'export const value = 42;' },
    });
    const value = ts.createProgram(
      [file],
      { ...options, allowNonTsExtensions: true },
      new IncrementalCompilerHost(options, root),
    );
    const source = value.getSourceFile(file)!;
    assert.deepEqual(value.getSemanticDiagnostics(source), []);
    assert.ok(value.getSourceFile(dependency));
    assert.ok(source.text.includes('void value'));
  });

  it('shares canonical dependency SourceFiles across symlink imports and cached programs', () => {
    pnpmLayout();
    fs.symlinkSync(
      '../.pnpm/react-query/node_modules/@tanstack/react-query',
      `${root}/node_modules/@tanstack/alias`,
      'junction',
    );
    fs.appendFileSync(
      `${root}/consumer.ts`,
      '\nimport { QueryClient as Alias } from "@tanstack/alias"; const alias = new Alias(); void alias.invalidateQueries({ queryKey: [] });',
    );
    const first = program();
    assert.deepEqual(result(first).types, ['Promise<void>', 'Promise<void>']);
    const declarations = first
      .getSourceFiles()
      .filter(f => f.fileName.endsWith('/react-query/index.d.ts'));
    assert.equal(declarations.length, 1);
    const second = program();
    assert.equal(second.getSourceFile(declarations[0].fileName), declarations[0]);
    assert.deepEqual(result(second), result(first));
    const core = first.getSourceFiles().find(f => f.fileName.includes('/query-core/index.d.ts'))!;
    setSourceFilesContext({
      [core.fileName]: { fileContent: core.text.replace('Promise<void>', 'Promise<number>') },
    });
    const edited = program();
    assert.deepEqual(result(edited).types, ['Promise<number>', 'Promise<number>']);
    assert.notEqual(edited.getSourceFile(core.fileName), core);
  });

  it('keeps external node_modules excluded after resolving symlinks', () => {
    const declaration = write(
      '../node_modules/external/index.d.ts',
      'export declare const value: number;',
    );
    fs.mkdirSync(`${root}/node_modules`);
    fs.symlinkSync(path.dirname(declaration), `${root}/node_modules/external`, 'junction');
    write('consumer.ts', 'import { value } from "external"; void value;');
    const ordinary = program();
    assert.deepEqual(result(ordinary).types, ['number']);
    clearSourceFileContentCache();
    const host = new IncrementalCompilerHost(options, root, true);
    assert.equal(host.directoryExists(path.dirname(declaration)), false);
    assert.deepEqual(host.getDirectories(path.dirname(declaration)), []);
    assert.equal(host.directoryExists(`${root}/node_modules`), true);
    assert.deepEqual(result(program(options, host)).types, ['any']);
  });

  it('keeps dependencies inside a symlinked project root available with external lookup disabled', () => {
    pnpmLayout();
    const alias = normalizeToAbsolutePath(path.join(temporary, 'project-link'));
    fs.symlinkSync(root, alias, 'junction');
    root = alias;
    const host = new IncrementalCompilerHost(options, root, true);
    assert.deepEqual(result(program(options, host)).types, ['Promise<void>']);
  });

  for (const [name, aliasPath, nativeRoot] of [
    ['POSIX', '/workspace/project-link', '/workspace/project'],
    ['Windows drive', 'C:/workspace/project-link', String.raw`C:\workspace\project`],
    ['mixed separators', 'C:/workspace/project-link', String.raw`C:\workspace/project`],
    ['UNC share', '//server/share/project-link', String.raw`\\server\share\project`],
  ]) {
    it(`normalizes the physical project root for ${name} paths`, t => {
      const alias = normalizeToAbsolutePath(aliasPath);
      const physicalRoot = normalizeToAbsolutePath(nativeRoot);
      const dependency = `${physicalRoot}/node_modules/local/index.d.ts`;
      const outside = `${physicalRoot}-sibling/node_modules/local/index.d.ts`;
      const content = 'export declare const value: number;';
      setSourceFilesContext({
        [dependency]: { fileContent: content },
        [outside]: { fileContent: content },
      });
      // These synthetic paths must not probe the native filesystem or a UNC server.
      t.mock.method(ts.sys, 'directoryExists', () => false);
      const host = new IncrementalCompilerHost(options, alias, true);
      const realpath = t.mock.method(host, 'realpath', (file: string) => {
        assert.equal(file, alias);
        return nativeRoot;
      });

      assert.equal(host.directoryExists(path.posix.dirname(dependency)), true);
      assert.equal(host.fileExists(dependency), true);
      assert.equal(host.readFile(dependency), content);
      const source = host.getSourceFile(dependency, ts.ScriptTarget.ESNext)!;
      assert.equal(source.fileName, dependency);
      assert.equal(source.text, content);
      assert.equal(host.directoryExists(path.posix.dirname(outside)), false);
      assert.deepEqual(host.getDirectories(path.posix.dirname(outside)), []);
      assert.equal(host.fileExists(outside), false);
      assert.equal(host.readFile(outside), undefined);
      setSourceFilesContext({});
      assert.equal(host.getSourceFile(dependency, ts.ScriptTarget.ESNext), source);
      const editedContent = content.replace('number', 'string');
      assert.equal(host.updateFile(normalizeToAbsolutePath(dependency), editedContent), true);
      assert.equal(host.getFileVersion(dependency), '1');
      const edited = host.getSourceFile(dependency, ts.ScriptTarget.ESNext)!;
      assert.notEqual(edited, source);
      assert.equal(edited.text, editedContent);
      assert.equal(realpath.mock.callCount(), 1);
    });
  }

  for (const caseSensitivePaths of [false, true]) {
    it(`indexes request directories with recorded case semantics (${caseSensitivePaths}) and resets between requests`, () => {
      const archivePath = path.join(temporary, 'case.pb.gz');
      const cache = installFsCache();
      const recording = cache.beginAnalysis({
        archivePath,
        rootDir: root,
        mode: 'record',
        caseSensitivePaths,
      });
      fs.existsSync(root);
      captureProvidedFile(
        `${root}/Archived/Deep/value.d.ts`,
        'export declare const value: number;',
      );
      recording.end();
      const session = cache.beginAnalysis({
        archivePath,
        rootDir: root,
        mode: 'replay',
        caseSensitivePaths: !caseSensitivePaths,
      });
      try {
        setSourceFilesContext({ [`${root}/Virtual/Nested/file.ts`]: {} });
        const host = new IncrementalCompilerHost(options, root);
        assert.equal(host.directoryExists(`${root}/Archived/Deep`), true);
        assert.equal(host.directoryExists(`${root}/archived/deep`), !caseSensitivePaths);
        assert.throws(() => fs.statSync(`${root}/Archived/Deep`), {
          code: 'ERR_SONARJS_FS_CACHE_MISS',
        });
        assert.equal(host.directoryExists(`${root}/Virtual/Nested`), true);
        assert.equal(host.directoryExists(`${root}/virtual/nested`), !caseSensitivePaths);
        assert.equal(host.directoryExists(`${root}/VirtualSibling`), false);
        setSourceFilesContext({ [`${root}/Other/file.ts`]: {} });
        assert.equal(host.directoryExists(`${root}/Virtual/Nested`), false);
        assert.equal(host.directoryExists(`${root}/Other`), true);
        clearSourceFileContentCache();
        assert.equal(host.directoryExists(`${root}/Other`), false);
      } finally {
        session.end();
      }
    });
  }
});
