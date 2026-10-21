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
import { execFileSync } from 'node:child_process';
import { it } from 'node:test';

it('uses Vercel in process, preserves host overlays and denies implicit disk reads', () => {
  execFileSync(
    process.execPath,
    [
      '--input-type=commonjs',
      '-e',
      String.raw`
    const assert = require('node:assert/strict');
    const Module = require('node:module');
    const load = Module._load;
    Module._load = function(name, ...args) {
      if (/typescript-classic/.test(name)) throw new Error('TS6 runtime loaded: ' + name);
      return load.call(this, name, ...args);
    };
    const ts = require('./packages/typescript/index.cjs');
    const {CompilerContractError} = require('./packages/typescript/errors.cjs');
    assert.equal(ts.convertCompilerOptionsFromJson({target:'ES2020'}, '/virtual').options.target, ts.ScriptTarget.ES2020);
    assert.deepEqual(ts.parseConfigFileTextToJson('tsconfig.json', '{/*comment*/\"compilerOptions\":{\"strict\":true,},}').config, {compilerOptions:{strict:true}});
    assert.equal(ts.createSourceFile('test.ts', 'const x = 1;', ts.ScriptTarget.Latest).statements.length, 1);
    const compilerHost = ts.createCompilerHost({noLib: true});
    compilerHost.readFile = () => 'const fromHost = 1;';
    assert.equal(compilerHost.getSourceFile('host.ts', ts.ScriptTarget.Latest).text, 'const fromHost = 1;');
    assert.equal(ts.createProgram([], {noLib:true}).getSourceFiles().length, 0);
    assert.throws(() => ts.createWatchProgram({}), CompilerContractError);
    assert.throws(() => ts.server.toNormalizedPath('test'), CompilerContractError);
    const name = '/virtual/main.ts';
    let text = 'export const value = 42;';
    const host = {
      getCurrentDirectory: () => '/virtual', useCaseSensitiveFileNames: () => true,
      getDefaultLibFileName: () => '/virtual/lib.d.ts',
      // getSourceFile is the request overlay; readFile deliberately has stale text.
      getSourceFile: file => file === name ? {text} : undefined,
      readFile: file => file === name ? 'export const value = false;' : undefined,
      fileExists: file => file === name, directoryExists: dir => dir === '/virtual',
      getDirectories: () => [], readDirectory: () => [], realpath: file => file,
    };
    function program() { return ts.createProgram({rootNames:[name], options:{noLib:true}, host}); }
    function valueType(p) {
      const c = p.getTypeChecker(), node = p.getSourceFile(name).statements[0].declarationList.declarations[0].name;
      const type = c.getTypeAtLocation(node);
      assert.equal(c.getTypeAtLocation(node), type, 'type views preserve identity');
      return c.typeToString(type);
    }
    const original = program();
    assert.equal(valueType(original), '42');
    text = 'export const value = "edited";';
    assert.equal(valueType(program()), '"edited"');
    assert.equal(valueType(original), '42', 'old program views stay valid');
    const denied = process.cwd().replaceAll('\\', '/') + '/packages/analysis/src/jsts/frontend/parser.ts';
    assert.equal(ts.createProgram({rootNames:[denied], options:{noLib:true}, host}).getSourceFile(denied), undefined);
    assert.throws(() => original.getTypeChecker().getAmbientModules(), CompilerContractError);
  `,
    ],
    {
      env: { ...process.env, SONARJS_TYPESCRIPT_BACKEND: 'vercel' },
      stdio: 'pipe',
    },
  );
});

it('reports missing exports through legacy module resolution without crashing', () => {
  execFileSync(
    process.execPath,
    [
      '--input-type=commonjs',
      '-e',
      String.raw`
    const assert = require('node:assert/strict');
    const ts = require('./packages/typescript/index.cjs');
    const files = new Map([
      ['/virtual/main.ts', "import { missing } from './dependency'; export const result = missing;"],
      ['/virtual/dependency.ts', 'export const value = 42;'],
    ]);
    const host = {
      ...ts.createCompilerHost({}),
      getCurrentDirectory: () => '/virtual',
      getSourceFile: file => files.has(file) ? {text: files.get(file)} : undefined,
      readFile: file => files.get(file), fileExists: file => files.has(file),
      directoryExists: () => true, realpath: file => file,
      getDirectories: () => [], readDirectory: () => [],
    };
    for (const moduleResolution of [ts.ModuleResolutionKind.Node10, ts.ModuleResolutionKind.Classic]) {
      const program = ts.createProgram({rootNames: ['/virtual/main.ts'], options: {noLib: true, moduleResolution}, host});
      const file = program.getSourceFile('/virtual/main.ts');
      assert.doesNotThrow(() => program.getTypeChecker().getSuggestionDiagnostics(file));
      assert.ok(program.getSemanticDiagnostics(file).some(diagnostic => diagnostic.code === 2305));
    }
  `,
    ],
    { env: { ...process.env, SONARJS_TYPESCRIPT_BACKEND: 'vercel' }, stdio: 'pipe' },
  );
});

it('preserves TS6 parser diagnostics for existing source syntax', () => {
  execFileSync(
    process.execPath,
    [
      '--input-type=commonjs',
      '-e',
      String.raw`
    const assert = require('node:assert/strict');
    const ts = require('./packages/typescript/index.cjs');
    const files = new Map([
      ['/virtual/main.ts', "import data from './data.json' assert {type:'json'}; export const result = data;"],
      ['/virtual/overloads.js', 'class C { m(n: number): void; m(s: string): void; }'],
      ['/virtual/invalid.ts', 'const = ;'],
    ]);
    const host = {
      ...ts.createCompilerHost({}), getCurrentDirectory: () => '/virtual',
      getSourceFile: file => files.has(file) ? {text: files.get(file)} : undefined,
      readFile: file => files.get(file), fileExists: file => files.has(file),
      directoryExists: () => true, realpath: file => file,
      getDirectories: () => [], readDirectory: () => [],
    };
    const program = ts.createProgram({rootNames: [...files.keys()], options: {allowJs:true, noLib:true}, host});
    for (const name of ['/virtual/main.ts', '/virtual/overloads.js']) {
      const source = program.getSourceFile(name);
      assert.deepEqual(source.parseDiagnostics, []);
      assert.deepEqual(ts.createSourceFile(name, files.get(name), ts.ScriptTarget.Latest, true).parseDiagnostics, []);
    }
    assert.ok(program.getSyntacticDiagnostics(program.getSourceFile('/virtual/overloads.js')).some(d => d.code === 8017), 'program grammar diagnostics remain available');
    assert.deepEqual(program.getSyntacticDiagnostics(program.getSourceFile('/virtual/main.ts')), []);
    assert.ok(program.getSourceFile('/virtual/main.ts').statements[0].attributes);
    assert.ok(program.getSourceFile('/virtual/invalid.ts').parseDiagnostics.some(d => d.code === 1134), 'actual parser errors remain fatal');
  `,
    ],
    { env: { ...process.env, SONARJS_TYPESCRIPT_BACKEND: 'vercel' }, stdio: 'pipe' },
  );
});

it('preserves well-known symbol identities for async resources and iterables', () => {
  execFileSync(
    process.execPath,
    [
      '--input-type=commonjs',
      '-e',
      String.raw`
    const assert = require('node:assert/strict');
    const ts = require('./packages/typescript/index.cjs');
    const {getWellKnownSymbolPropertyOfType} = require('ts-api-utils');
    const name = process.cwd().replaceAll('\\', '/') + '/virtual-symbols.ts';
    const text = 'declare const disposable: AsyncDisposable; declare const iterable: AsyncIterable<number>; declare const __user: number; disposable; iterable; __user;';
    const options = {target: ts.ScriptTarget.ESNext};
    const host = ts.createCompilerHost(options);
    const read = host.readFile.bind(host), exists = host.fileExists.bind(host);
    host.readFile = file => file === name ? text : read(file);
    host.fileExists = file => file === name || exists(file);
    const program = ts.createProgram([name], options, host), checker = program.getTypeChecker();
    const statements = program.getSourceFile(name).statements;
    for (const [index, symbol] of [[3, 'asyncDispose'], [4, 'asyncIterator']]) {
      const type = checker.getTypeAtLocation(statements[index].expression);
      assert.ok(getWellKnownSymbolPropertyOfType(type, symbol, checker), symbol + ' must retain its unique symbol identity');
    }
    assert.equal(checker.getSymbolAtLocation(statements[5].expression).escapedName, '___user', 'user underscores remain escaped');
  `,
    ],
    { env: { ...process.env, SONARJS_TYPESCRIPT_BACKEND: 'vercel' }, stdio: 'pipe' },
  );
});

it('allows released programs and their default-library ASTs to be collected', () => {
  execFileSync(
    process.execPath,
    [
      '--expose-gc',
      '--input-type=commonjs',
      '-e',
      String.raw`
    const assert = require('node:assert/strict');
    const ts = require('./packages/typescript/index.cjs');
    async function check() {
      const reference = (() => {
        const name = process.cwd().replaceAll('\\', '/') + '/virtual-provider-lifetime.ts';
        const host = ts.createCompilerHost({});
        const readFile = host.readFile.bind(host), fileExists = host.fileExists.bind(host);
        host.readFile = file => file === name ? 'export const value = 1;' : readFile(file);
        host.fileExists = file => file === name || fileExists(file);
        const program = ts.createProgram([name], {}, host);
        program.getSourceFiles();
        return new WeakRef(program.getSourceFile(name));
      })();
      // Yield between collections so WeakRef's current-job keepalive has expired.
      for (let attempt = 0; attempt < 12; attempt++) {
        await new Promise(setImmediate);
        global.gc();
        await new Promise(setImmediate);
      }
      assert.equal(reference.deref(), undefined, 'global compiler caches retained a released program');
    }
    check().catch(error => { console.error(error); process.exitCode = 1; });
  `,
    ],
    { env: { ...process.env, SONARJS_TYPESCRIPT_BACKEND: 'vercel' }, stdio: 'pipe' },
  );
});

it('uses existing TS7 declaration resources for each supported script target', () => {
  execFileSync(
    process.execPath,
    [
      '--input-type=commonjs',
      '-e',
      String.raw`
    const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
    const ts = require('./packages/typescript/index.cjs');
    for (const target of [ts.ScriptTarget.ES5, ts.ScriptTarget.ES2015, ts.ScriptTarget.ES2020, ts.ScriptTarget.ES2025, ts.ScriptTarget.ESNext]) {
      const lib = ts.getDefaultLibFilePath({target});
      assert.ok(lib.includes('/providers/vercel/lib/'), lib);
      assert.ok(fs.existsSync(lib), lib);
    }
    assert.equal(path.basename(ts.getDefaultLibFilePath({target:ts.ScriptTarget.ES2015})), 'lib.es6.d.ts');
  `,
    ],
    { env: { ...process.env, SONARJS_TYPESCRIPT_BACKEND: 'vercel' }, stdio: 'pipe' },
  );
});
