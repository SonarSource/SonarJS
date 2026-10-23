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
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { it } from 'node:test';

const require = createRequire(process.cwd() + '/package.json');
const { providers } = require('./packages/typescript/providers.json');

function probe(script: string, backend?: string) {
  return execFileSync(process.execPath, ['--input-type=commonjs', '-e', script], {
    env: { ...process.env, SONARJS_TYPESCRIPT_BACKEND: backend },
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

for (const backend of Object.keys(providers)) {
  it(`compiler contract: ${backend} resolves UNC dependencies outside its working directory`, () => {
    probe(
      String.raw`
      const assert = require('node:assert/strict');
      const ts = require('typescript');
      const root = '//server/share/project', main = root + '/main.ts', dependency = root + '/shared/value.ts';
      const files = new Map([[main,"import {value} from '@shared/value'; export const result=value;"],[dependency,'export const value=42;']]);
      const options = {noLib:true, module:ts.ModuleKind.Preserve, moduleResolution:ts.ModuleResolutionKind.Bundler, paths:{'@shared/*':[root+'/shared/*']}};
      const reads = [];
      const host = {...ts.createCompilerHost(options), getCurrentDirectory:()=>process.cwd(),
        getSourceFile(file,version) {const text=files.get(file);return text === undefined ? undefined : ts.createSourceFile(file,text,version,true);},
        readFile(file) {reads.push(file);return files.get(file);}, fileExists:file=>files.has(file),
        directoryExists:dir=>[...files.keys()].some(file=>file.startsWith(dir+'/')),
        readDirectory:dir=>[...files.keys()].filter(file=>file.startsWith(dir+'/')),
        getDirectories:()=>[], realpath:file=>file};
      const program = ts.createProgram({rootNames:[main], options, host});
      const file = program.getSourceFile(main), checker = program.getTypeChecker();
      const expression = file.statements[1].declarationList.declarations[0].initializer;
      assert.equal(checker.typeToString(checker.getTypeAtLocation(expression)), '42');
      assert.equal(program.getSourceFile(dependency).fileName, dependency);
      require('typescript/lifecycle').disposeProgram(program);
      `,
      backend,
    );
  });

  it(`compiler contract: ${backend} parses UNC configs and restores resolved paths`, () => {
    probe(
      String.raw`
      const assert = require('node:assert/strict');
      const ts = require('typescript');
      const root = '//server/share/project';
      const config = {extends:'./base.json', compilerOptions:{baseUrl:'.',outDir:'./dist'}, files:['src/main.ts'], references:[{path:'../library'}]};
      const reads = [];
      const host = {...ts.sys, readFile(file) {
        reads.push(file);
        return file === root + '/base.json' ? '{"compilerOptions":{"strict":true}}' : undefined;
      }, fileExists:file=>file === root + '/base.json', readDirectory:()=>[]};
      const result = ts.parseJsonConfigFileContent(config, host, root, {}, root + '/tsconfig.json');
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.fileNames, [root + '/src/main.ts']);
      assert.equal(result.options.baseUrl, root);
      assert.equal(result.options.outDir, root + '/dist');
      assert.equal(result.options.configFilePath, root + '/tsconfig.json');
      assert.equal(result.options.strict, true);
      assert.equal(result.projectReferences[0].path, '//server/share/library');
      assert.ok(reads.includes(root + '/base.json'), 'filesystem callbacks retain the UNC namespace');
      const empty = ts.parseJsonConfigFileContent({files:[]}, host, root, {}, root + '/tsconfig.json');
      assert.ok(empty.errors.some(error => String(error.messageText).includes(root + '/tsconfig.json')), 'diagnostics retain the UNC config path');
      `,
      backend,
    );
  });

  it(`compiler contract: ${backend} preserves configuration, typed objects, overlays and edits`, () => {
    probe(
      String.raw`
      const assert = require('node:assert/strict');
      const Module = require('node:module');
      const {providers} = require('./packages/typescript/providers.json');
      const selected = providers[process.env.SONARJS_TYPESCRIPT_BACKEND];
      const otherProviders = Object.values(providers).filter(p => p !== selected);
      const otherSdks = otherProviders.flatMap(p => p.sdk ? [p.sdk] : []);
      const load = Module._load;
      Module._load = function(name, ...args) {
        if (otherProviders.some(p => name === p.module) || otherSdks.some(sdk => name === sdk || name.startsWith(sdk + '/')))
          throw new Error('Another compiler SDK was loaded: ' + name);
        return load.call(this, name, ...args);
      };
      const ts = require('./packages/typescript/index.cjs');
      const {assertMembers} = require('typescript/contract');
      const {metadata, disposeProgram, close} = require('typescript/lifecycle');
      assert.equal(metadata.name, process.env.SONARJS_TYPESCRIPT_BACKEND);
      assert.ok(metadata.compilerVersion);
      const constants = require('./packages/typescript/compat/constants.json');
      for (const [name, value] of Object.entries(constants)) assert.deepEqual(ts[name], value);
      assert.equal(ts.convertCompilerOptionsFromJson({target:'ES2020'}, '/virtual').options.target, ts.ScriptTarget.ES2020);
      const invalidOptions = ts.convertCompilerOptionsFromJson({target:'not-a-target'}, '/virtual');
      assert.ok(invalidOptions.errors.length);
      for (const error of invalidOptions.errors) {
        assert.ok(Object.hasOwn(error, 'file'), 'diagnostics include their optional source field');
        assert.equal(typeof error.messageText, 'string');
      }
      assert.deepEqual(ts.parseConfigFileTextToJson('tsconfig.json', '{/*comment*/"compilerOptions":{"strict":true,},}').config, {compilerOptions:{strict:true}});
      const name = '/virtual/main.ts';
      let text = 'export const value = 42;';
      const host = {
        ...ts.createCompilerHost({noLib:true}),
        getCurrentDirectory: () => '/virtual',
        getSourceFile: file => file === name ? ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true) : undefined,
        readFile: () => undefined,
        fileExists: file => file === name,
        directoryExists: dir => dir === '/virtual',
        getDirectories: () => [], readDirectory: () => [], realpath: file => file,
      };
      assert.equal(ts.resolveModuleName('', name, {}, host).resolvedModule, undefined, 'empty imports are unresolved');
      const js = ts.createSourceFile('/virtual/doc.js', '/** @param {String} value @returns {Boolean} */\nfunction f(value) { return true; }', ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      assert.equal(js.statements[0].parameters[0].type, undefined, 'JSDoc parameter types are not syntax annotations');
      assert.equal(js.statements[0].type, undefined, 'JSDoc return types are not syntax annotations');
      for (const annotation of ['@this', '@this {Object}']) {
        const thisFile = ts.createSourceFile('/virtual/this.js', '/** ' + annotation + ' */\nfunction f(value) { return value; }', ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
        assert.equal(thisFile.statements[0].parameters.length, 1, 'JSDoc this parameters are not syntax parameters');
        assert.equal(thisFile.statements[0].parameters[0].name.text, 'value');
      }
      const aliasText = '/** @typedef {Object} Pagination\n * @property {number} page\n */\n/** @import {Thing} from "./types" */\n/** @param {Pagination} input */\nfunction f(input) { return input.page; }';
      const aliasName = '/virtual/typedef.js';
      const aliasFile = ts.createSourceFile(aliasName, aliasText, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      assert.equal(aliasFile.statements.length, 1, 'JSDoc typedefs are not JS statements');
      const syntax = [];
      function visit(node) { syntax.push(node); ts.forEachChild(node, visit); }
      visit(aliasFile);
      assert.ok(syntax.every(node => node.kind !== ts.SyntaxKind.TypeReference), 'JSDoc types are excluded from syntax traversal');
      const genericFile = ts.createSourceFile('/virtual/generic.js', '/** @template T @param {T} value */\nfunction generic(value) { return value; }', ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      const genericSyntax = [];
      function visitGeneric(node) { genericSyntax.push(node); ts.forEachChild(node, visitGeneric, nodes => { nodes.forEach(visitGeneric); }); }
      visitGeneric(genericFile);
      assert.ok(genericSyntax.every(node => ![ts.SyntaxKind.TypeReference, ts.SyntaxKind.TypeParameter].includes(node.kind)), 'array traversal excludes JSDoc types and templates');
      const aliasProgram = ts.createProgram({rootNames:[aliasName], options:{allowJs:true, noLib:true}, host:{...host,
        getSourceFile: file => file === aliasName ? aliasFile : undefined,
        fileExists: file => file === aliasName,
      }});
      const aliasChecker = aliasProgram.getTypeChecker();
      const returned = aliasProgram.getSourceFile(aliasName).statements[0].body.statements[0].expression;
      assert.equal(aliasChecker.typeToString(aliasChecker.getTypeAtLocation(returned)), 'number', 'JSDoc typedefs remain available to the checker');
      require('typescript/lifecycle').disposeProgram(aliasProgram);
      function program() { return ts.createProgram({rootNames:[name], options:{noLib:true}, host}); }
      function value(p) {
        assertMembers(p, 'Program');
        const file = assertMembers(p.getSourceFile(name), 'SourceFile'), checker = assertMembers(p.getTypeChecker(), 'TypeChecker');
        const declaration = file.statements[0].declarationList.declarations[0];
        assert.equal(p.getSourceFile(name), file, 'source identity');
        assert.ok(ts.isIdentifier(declaration.name));
        assert.equal(declaration.name.parent, declaration, 'parent relationships');
        const type = assertMembers(checker.getTypeAtLocation(declaration.name), 'Type');
        assertMembers(checker.getSymbolAtLocation(declaration.name), 'Symbol');
        assert.equal(checker.getTypeAtLocation(declaration.name), type, 'type identity');
        assert.equal(checker.getSymbolAtLocation(declaration.name), checker.getSymbolAtLocation(declaration.name), 'symbol identity');
        assert.deepEqual(file.parseDiagnostics, []);
        assert.equal(p.getSourceFile('/virtual/missing.ts'), undefined, 'denied source');
        return checker.typeToString(type);
      }
      text = 'export function identity(value: number): number { return value; }';
      const functionProgram = program();
      const functionChecker = functionProgram.getTypeChecker();
      const signature = functionChecker.getSignatureFromDeclaration(functionProgram.getSourceFile(name).statements[0]);
      assertMembers(signature, 'Signature');
      assert.ok(Array.isArray(signature.getDocumentationComment(functionChecker)));
      assert.ok(Array.isArray(signature.getJsDocTags(functionChecker)));
      disposeProgram(functionProgram);
      text = 'export const value = 42;';
      const original = program();
      assert.equal(value(original), '42', 'host overlay supplies source content');
      text = 'export const value = "edited";';
      assert.equal(value(program()), '"edited"', 'new program observes edited content');
      assert.equal(value(original), '42', 'old program keeps its own objects');
      for (const target of [ts.ScriptTarget.ES5, ts.ScriptTarget.ES2020, ts.ScriptTarget.ESNext])
        assert.ok(require('node:fs').existsSync(ts.getDefaultLibFilePath({target})), 'selected declaration resources');
      (async () => {
        assert.equal(require('typescript'), ts);
        assert.equal(require('typescript/lib/typescript.js'), ts);
        assert.equal(require('typescript/lib/tsserverlibrary.js'), ts);
        const esm = await import(require('node:url').pathToFileURL(require.resolve('./packages/typescript/index.mjs')).href);
        assert.equal(esm.createProgram, ts.createProgram, 'ESM and CommonJS share the selected provider');
        disposeProgram(original);
        close();
      })().catch(error => { console.error(error); process.exitCode = 1; });
      `,
      backend,
    );
  });
}

it('rejects unknown providers and incomplete implementations without falling back', () => {
  for (const backend of ['unknown', 'constructor', '__proto__']) {
    assert.throws(
      () => probe("require('./packages/typescript/index.cjs')", backend),
      /Unknown compiler provider/,
    );
  }
  assert.throws(
    () =>
      probe(String.raw`
      const Module = require('node:module'), load = Module._load;
      const {defaultProvider, providers} = require('./packages/typescript/providers.json');
      const providerModule = providers[defaultProvider].module;
      Module._load = function(name, ...args) {
        return name === providerModule ? { compiler: {}, compilerVersion: 'test', ownsProgramResources: false, disposeProgram() {}, close() {} } : load.call(this, name, ...args);
      };
      require('./packages/typescript/index.cjs');
      `),
    /does not implement typescript\./,
  );
});

it('loads the owned syntax contract without any compiler SDK', () => {
  probe(String.raw`
    const assert = require('node:assert/strict'), Module = require('node:module');
    const load = Module._load;
    const privateProviders=Object.values(require('./packages/typescript/providers.json').providers);
    Module._load = function(name, ...args) {
      if (privateProviders.some(p=>p.sdk&&(name===p.sdk||name.startsWith(p.sdk+'/'))))
        throw new Error('Syntax helpers loaded a compiler SDK: ' + name);
      return load.call(this, name, ...args);
    };
    const shared = require('./packages/typescript/compat/index.cjs');
    const {names: supported, operations} = require('./packages/typescript/contract.cjs');
    assert.deepEqual(supported.filter(name => !Object.hasOwn(shared, name)), operations);
    assert.ok(operations.every(name => !Object.hasOwn(shared, name)), 'operation ownership is disjoint');
    const identifier = shared.factory.createIdentifier('value');
    assert.ok(shared.isIdentifier(identifier));
    assert.equal(shared.isStringLiteral(identifier), false);
    assert.equal(shared.escapeLeadingUnderscores('__value'), '___value');
  `);
});

// Each probe has a fresh module graph; mutate only the selected provider boundary.
const injectedProvider = String.raw`
  const assert = require('node:assert/strict'), Module = require('node:module');
  const registry = require('./packages/typescript/providers.json');
  const descriptor = registry.providers[registry.defaultProvider];
  const loaded = require('./packages/typescript/' + descriptor.module);
  const actual = loaded.default ?? loaded;
  const implementation = {...actual, ownsProgramResources: true, compiler: {...actual.compiler}};
  const load = Module._load;
  Module._load = function(name, ...args) {
    return name === descriptor.module ? implementation : load.call(this, name, ...args);
  };
`;

it('validates nested members and captures immutable facade bindings', () => {
  probe(
    injectedProvider +
      String.raw`
    const ts = require('typescript');
    const captured = ts.createSourceFile;
    implementation.compiler.createSourceFile = () => { throw new Error('replaced'); };
    assert.equal(ts.createSourceFile, captured);
    assert.ok(Object.isFrozen(ts));
    assert.throws(() => ts.notAnOperation, /Unsupported SonarJS compiler operation/);
    const {assertMembers, specification, defineProvider} = require('typescript/contract');
    assert.throws(() => defineProvider(null), /must supply its compiler bindings/);
    for (const category of Object.keys(specification.members)) {
      assert.throws(() => assertMembers({}, category), new RegExp(category + '[.]'));
    }
    assert.throws(() => assertMembers(null, 'Program'), /did not return Program/);
  `,
  );
  assert.throws(
    () =>
      probe(
        injectedProvider +
          String.raw`
    implementation.compiler.factory = {};
    require('typescript');
  `,
      ),
    /factory.createIdentifier/,
  );
  assert.throws(
    () =>
      probe(
        injectedProvider +
          String.raw`
    implementation.compiler.sys = {};
    require('typescript');
  `,
      ),
    /sys.fileExists/,
  );
});

it('declares optional capabilities independently of throwing backend stubs', () => {
  probe(
    injectedProvider +
      String.raw`
    descriptor.capabilities = {watchPrograms:false, projectService:false};
    for (const name of ['createAbstractBuilder','createWatchCompilerHost','createWatchProgram','server'])
      delete implementation.compiler[name];
    implementation.compilerVersion = 'native-test-version';
    const ts = require('typescript'), {metadata} = require('typescript/lifecycle');
    assert.equal(metadata.compilerVersion, 'native-test-version');
    assert.deepEqual(metadata.capabilities, {watchPrograms:false, projectService:false});
    assert.throws(() => ts.createWatchProgram(), /does not support watchPrograms/);
    assert.throws(() => ts.server.ProjectService, /does not support projectService/);
  `,
  );
  assert.throws(
    () =>
      probe(
        injectedProvider +
          String.raw`
    descriptor.capabilities = {};
    require('typescript');
  `,
      ),
    /must declare capability/,
  );
  assert.throws(
    () =>
      probe(
        injectedProvider +
          String.raw`
    descriptor.capabilities = {watchPrograms:true, projectService:true};
    implementation.compiler.createAbstractBuilder = () => {};
    implementation.compiler.createWatchCompilerHost = () => {};
    implementation.compiler.server = {};
    delete implementation.compiler.createWatchProgram;
    require('typescript');
  `,
      ),
    /does not implement typescript.createWatchProgram/,
  );
  assert.throws(
    () =>
      probe(
        injectedProvider +
          String.raw`
    delete implementation.close;
    require('typescript');
  `,
      ),
    /lifecycle.close/,
  );
});

it('releases scoped programs on success, cancellation and errors, preserving the primary error', () => {
  probe(
    injectedProvider +
      String.raw`
    const released = [], source = implementation.compiler.createProgram;
    let fail;
    implementation.disposeProgram = program => {
      released.push(program);
      if (program === fail) throw new Error('release failed');
    };
    const ts = require('typescript'), lifecycle = require('typescript/lifecycle');
    const create = () => ts.createProgram({rootNames:[], options:{noLib:true}});
    (async () => {
      let first, second;
      await lifecycle.withProgramScope(async () => { first=create(); second=create(); });
      assert.deepEqual(released, [first, second]);
      lifecycle.disposeProgram(first);
      assert.equal(released.length, 2, 'release is idempotent');
      const primary = new Error('analysis cancelled');
      let other;
      await assert.rejects(lifecycle.withProgramScope(async () => {
        fail=create(); other=create(); throw primary;
      }), error => error === primary);
      assert.deepEqual(released.slice(-2), [fail, other], 'all releases attempted');
      await assert.rejects(lifecycle.withProgramScope(async () => { fail=create(); create(); }), AggregateError);
      const outside = create();
      await lifecycle.withProgramScope(async () => {});
      assert.ok(!released.includes(outside), 'IDE cache retains ownership');
      const order=[];
      await Promise.all([1,2].map(id=>lifecycle.withProgramScope(async () => {
        const p=create(); await new Promise(r=>setImmediate(r));
        assert.ok(!released.includes(p), 'concurrent scopes retain their own programs');
        order.push(id);
      })));
      assert.equal(order.length, 2);
      lifecycle.close();
    })().catch(error=>{ console.error(error); process.exitCode=1; });
  `,
  );
});

it('leaves garbage-collected backend programs unretained by batch scopes', () => {
  probe(
    injectedProvider +
      String.raw`
    implementation.ownsProgramResources = false;
    let releases = 0;
    implementation.disposeProgram = () => { releases++; };
    const ts = require('typescript'), lifecycle = require('typescript/lifecycle');
    (async () => {
      let program;
      await lifecycle.withProgramScope(async () => {
        program = ts.createProgram({rootNames:[], options:{noLib:true}});
      });
      assert.equal(releases, 0);
      lifecycle.disposeProgram(program);
      assert.equal(releases, 1);
      lifecycle.close();
    })().catch(error => { console.error(error); process.exitCode=1; });
  `,
  );
});

it('releases replaced, evicted and cleared IDE cache programs', () => {
  probe(
    injectedProvider +
      String.raw`
    const released=[];
    let failing;
    implementation.disposeProgram = p => { released.push(p); if(p === failing) throw new Error('release'); };
    (async () => {
      const {ProgramCacheManager} = await import('./lib/analysis/src/jsts/program/cache/programCache.js');
      const cache = new ProgramCacheManager(2);
      const p = id => ({ getSourceFiles:()=>[{fileName:'/' + id + '.ts'}] });
      const a=p('a'), b=p('b'), c=p('c'), d=p('d');
      const builder = program => ({getProgram:()=>program});
      const store = program => cache.storeProgram({rootNames:[]}, builder(program), {});
      store(a); store(b); store(c);
      assert.deepEqual(released, [a]);
      const key=cache.findProgramForFile('/b.ts').cacheKey;
      cache.updateProgramInCache(key, builder(b));
      assert.deepEqual(released, [a], 'same identity retained');
      cache.updateProgramInCache(key, builder(d));
      assert.deepEqual(released, [a,b]);
      failing=c;
      assert.throws(()=>cache.clear(), AggregateError);
      assert.deepEqual(new Set(released), new Set([a,b,c,d]));
      assert.equal(cache.getCacheStats().size, 0);
      cache.clear();
      require('typescript/lifecycle').close();
    })().catch(error=>{ console.error(error); process.exitCode=1; });
  `,
  );
});
