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
      const constants = require('./packages/typescript/compat/constants.json');
      for (const [name, value] of Object.entries(constants)) assert.deepEqual(ts[name], value);
      assert.equal(ts.convertCompilerOptionsFromJson({target:'ES2020'}, '/virtual').options.target, ts.ScriptTarget.ES2020);
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
      function program() { return ts.createProgram({rootNames:[name], options:{noLib:true}, host}); }
      function value(p) {
        const file = p.getSourceFile(name), checker = p.getTypeChecker();
        const declaration = file.statements[0].declarationList.declarations[0];
        assert.equal(p.getSourceFile(name), file, 'source identity');
        assert.ok(ts.isIdentifier(declaration.name));
        assert.equal(declaration.name.parent, declaration, 'parent relationships');
        const type = checker.getTypeAtLocation(declaration.name);
        assert.equal(checker.getTypeAtLocation(declaration.name), type, 'type identity');
        assert.equal(checker.getSymbolAtLocation(declaration.name), checker.getSymbolAtLocation(declaration.name), 'symbol identity');
        assert.deepEqual(file.parseDiagnostics, []);
        assert.equal(p.getSourceFile('/virtual/missing.ts'), undefined, 'denied source');
        return checker.typeToString(type);
      }
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
        return name === providerModule ? {} : load.call(this, name, ...args);
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
    Module._load = function(name, ...args) {
      if (/typescript-classic|native-preview|tsc-ts-source/.test(name))
        throw new Error('Syntax helpers loaded a compiler SDK: ' + name);
      return load.call(this, name, ...args);
    };
    const shared = require('./packages/typescript/compat/index.cjs');
    const supported = require('./packages/typescript/supported-exports.json');
    const operations = require('./packages/typescript/compat/provider-operations.json');
    assert.deepEqual(supported.filter(name => !Object.hasOwn(shared, name)), operations);
    assert.ok(operations.every(name => !Object.hasOwn(shared, name)), 'operation ownership is disjoint');
    const identifier = shared.factory.createIdentifier('value');
    assert.ok(shared.isIdentifier(identifier));
    assert.equal(shared.isStringLiteral(identifier), false);
    assert.equal(shared.escapeLeadingUnderscores('__value'), '___value');
  `);
});
