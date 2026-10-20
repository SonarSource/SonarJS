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
    const forbidden = new Set(['createSourceFile', 'createProgram', 'createSemanticDiagnosticsBuilderProgram', 'createWatchProgram']);
    Module._load = function(name, ...args) {
      const loaded = load.call(this, name, ...args);
      if (name !== 'typescript-classic') return loaded;
      return new Proxy(loaded, {get(target, key) {
        if (forbidden.has(key)) return () => { throw new Error('TS6 compiler fallback: ' + key); };
        if (key === 'createCompilerHost') return (...args) => ({...target.createCompilerHost(...args), getSourceFile() { throw new Error('TS6 host parser fallback'); }});
        return target[key];
      }});
    };
    const ts = require('./packages/typescript/index.cjs');
    const {CompilerContractError} = require('./packages/typescript/errors.cjs');
    assert.equal(ts.createSourceFile('test.ts', 'const x = 1;', ts.ScriptTarget.Latest).statements.length, 1);
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
