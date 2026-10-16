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
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

const output = path.resolve('tools/ts7-benchmark/out');
const entry = pathToFileURL(path.resolve('packages/typescript/control.mjs')).href;

function run(source: string, fixtures: Record<string, string> = {}) {
  fs.mkdirSync(output, { recursive: true });
  const directory = fs.mkdtempSync(path.join(output, 'dependency-gateway-'));
  try {
    const files = {
      'node_modules/consumer/package.json': '{"name":"consumer","type":"commonjs"}',
      ...fixtures,
    };
    for (const [name, content] of Object.entries(files)) {
      const file = path.join(directory, name);
      assert.ok(file.startsWith(directory + path.sep));
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
    }
    const script = path.join(directory, 'run.mjs');
    fs.writeFileSync(
      script,
      `
      import assert from 'node:assert/strict';
      import {createRequire, registerHooks} from 'node:module';
      import {pathToFileURL} from 'node:url';
      import {installCompilerGateway} from ${JSON.stringify(entry)};
      const require=createRequire(import.meta.url);
      const fake={name:'test-non-ts6', packageMetadata:{name:'typescript',version:'99.0.0'}, implementationRoots:[], exports:{
        version:'test-provider', ping:(value)=>'selected:'+value,
        Box:class Box { constructor(value){this.value=value;} },
        SyntaxKind:Object.freeze({Identifier:8123})
      }};
      ${source}
    `,
    );
    const result = spawnSync(process.execPath, ['--import', 'tsx', script], {
      cwd: process.cwd(),
      encoding: 'utf8',
      windowsHide: true,
      timeout: 30000,
    });
    assert.equal(result.status, 0, result.stdout + result.stderr + (result.error ?? ''));
  } finally {
    assert.ok(directory.startsWith(output + path.sep));
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('CJS, ESM default/named imports and transitive dependency aliases share the selected provider', () => {
  run(
    `
    const gateway=installCompilerGateway(fake);
    const cjs=require('consumer');
    const esm=await import('consumer/esm.mjs');
    assert.equal(require('consumer/alias.js'),cjs);
    assert.equal(cjs.ping('cjs'),'selected:cjs');
    assert.equal(esm.answer,'selected:esm');
    assert.equal(esm.default,cjs);
    assert.equal(esm.ping,cjs.ping);
    assert.equal(new cjs.Box(42).value,42);
    assert.equal(cjs.SyntaxKind.Identifier,8123);
    assert.equal(gateway.facade,cjs);
    assert.equal(installCompilerGateway(fake),gateway);
    assert.ok(gateway.observations().length>=3);
    assert.throws(()=>installCompilerGateway({...fake,name:'wasm'}),/separate worker/);
    gateway.assertHealthy();
  `,
    {
      'node_modules/consumer/index.js': "module.exports=require('intermediary');",
      'node_modules/intermediary/package.json': '{"name":"intermediary"}',
      'node_modules/intermediary/index.js': "module.exports=require('typescript');",
      'node_modules/consumer/esm.mjs':
        "import ts, {ping} from 'typescript'; export {ping}; export default ts; export const answer=ping('esm');",
      'node_modules/consumer/node_modules/typescript/package.json':
        '{"name":"typescript","main":"index.js"}',
      'node_modules/consumer/node_modules/typescript/index.js':
        "throw new Error('Nested compiler must never load');",
      'node_modules/consumer/alias.js':
        "module.exports=require('typescript-classic/lib/typescript.js');",
    },
  );
});

test('supported SDK subpath imports reach the same facade rather than a compiler copy', () => {
  run(
    `
    const gateway=installCompilerGateway(fake);
    assert.equal(require('consumer'),require('consumer/alias.js'));
    assert.equal(gateway.observations().length,2);
  `,
    {
      'node_modules/consumer/index.js': "module.exports=require('typescript/lib/typescript');",
      'node_modules/consumer/alias.js':
        "module.exports=require('typescript-classic/lib/typescript.js');",
    },
  );
});

test('unknown compiler entry points fail closed and remain fatal after a dependency catches them', () => {
  run(
    `
    const gateway=installCompilerGateway(fake);
    assert.equal(require('consumer'),'caught');
    assert.throws(()=>gateway.assertHealthy(),/Unsupported dependency compiler entry/);
    assert.throws(()=>gateway.facade.ping('after'),/Unsupported dependency compiler entry/);
  `,
    {
      'node_modules/consumer/index.js':
        "try{require('typescript/lib/tsc')}catch{module.exports='caught'}",
    },
  );
});

test('unsupported compiler operations do not become undefined or a silent fallback', () => {
  run(
    `
    const gateway=installCompilerGateway(fake);
    assert.throws(()=>require('consumer'),/does not implement createProgram/);
    assert.throws(()=>gateway.assertHealthy(),{code:'unsupported-operation',operation:'createProgram'});
  `,
    { 'node_modules/consumer/index.js': "module.exports=require('typescript').createProgram;" },
  );
});

test('cached compiler functions preserve identity, receivers, constructor semantics and sticky errors', () => {
  run(`
    const {TypeScriptFailure}=await import('typescript/errors');
    const recoverable=new Error('source error');
    const fatal=new TypeScriptFailure('unsupported-operation','unsupported nested operation');
    class Box { constructor(value) { this.value=value; } }
    const exports={marker:42, Box, receiver(){return this.marker;}, fail(error){throw error;}};
    const gateway=installCompilerGateway({...fake,exports});
    const compiler=require('typescript');
    const receiver=compiler.receiver;
    assert.equal(receiver,compiler.receiver);
    assert.equal(receiver.call({marker:0}),42);
    class Derived extends compiler.Box {}
    const instance=new Derived(7);
    assert.ok(instance instanceof Derived);
    assert.ok(instance instanceof Box);
    assert.equal(instance.value,7);
    assert.throws(()=>compiler.fail(recoverable),error=>error===recoverable);
    gateway.assertHealthy();
    assert.equal(receiver(),42);
    assert.throws(()=>compiler.fail(fatal),error=>error===fatal);
    assert.throws(()=>receiver(),error=>error===fatal);
    assert.throws(()=>gateway.assertHealthy(),error=>error===fatal);
  `);
});

for (const mode of ['alias', 'absolute', 'relative']) {
  test(`a ${mode} import of a physical compiler cannot bypass the gateway`, () => {
    const specifier =
      mode === 'alias'
        ? 'hidden-compiler'
        : mode === 'relative'
          ? '../hidden-compiler/dist/index.js'
          : undefined;
    run(
      `
      const gateway=installCompilerGateway(fake);
      assert.throws(()=>require('consumer'),/bypasses compiler gateway/);
      assert.throws(()=>gateway.assertHealthy(),/bypasses compiler gateway/);
    `,
      {
        'node_modules/consumer/index.js': specifier
          ? `module.exports=require(${JSON.stringify(specifier)});`
          : "module.exports=require(require.resolve('hidden-compiler'));",
        'node_modules/hidden-compiler/package.json': '{"name":"typescript","main":"dist/index.js"}',
        'node_modules/hidden-compiler/dist/package.json': '{"type":"commonjs"}',
        'node_modules/hidden-compiler/dist/index.js':
          "throw new Error('Physical compiler must never execute');",
      },
    );
  });
}

test('the real typescript-eslint parser reaches a non-TS6 provider with TS6 loading forbidden', () => {
  run(`
    registerHooks({resolve(specifier,context,next){
      if(/^(typescript|typescript-classic)(\\/|$)/.test(specifier)) throw new Error('Direct compiler load tripwire: '+specifier);
      return next(specifier,context);
    }});
    // This is a routing probe, not a parser implementation or WASM conformance test.
    const gateway=installCompilerGateway({...fake,exports:{versionMajorMinor:'99.0'}});
    assert.throws(()=>require('@typescript-eslint/parser'),/typescript-eslint does not support TS 7/);
    assert.ok(gateway.observations().some(item=>item.importer.includes('@typescript-eslint/parser')));
    gateway.assertHealthy();
  `);
});

test('a real typescript-eslint helper executes against provider methods without loading TS6', () => {
  run(`
    registerHooks({resolve(specifier,context,next){
      if(/^(typescript|typescript-classic)(\\/|$)/.test(specifier)) throw new Error('Direct compiler load tripwire: '+specifier);
      return next(specifier,context);
    }});
    const node={providerOwned:true}; const modifier={selected:true}; const calls=[];
    const gateway=installCompilerGateway({...fake,exports:{
      version:'99.0.0',
      canHaveModifiers:(value)=>{assert.equal(value,node);calls.push('canHaveModifiers');return true;},
      getModifiers:(value)=>{assert.equal(value,node);calls.push('getModifiers');return [modifier];}
    }});
    const entry=require.resolve('@typescript-eslint/typescript-estree/package.json');
    const {getModifiers}=require(entry.replace('package.json','dist/getModifiers.js'));
    assert.deepEqual(getModifiers(node),[modifier]);
    assert.deepEqual(calls,['canHaveModifiers','getModifiers']);
    assert.ok(gateway.observations().some(item=>item.importer.includes('getModifiers.js')));
    gateway.assertHealthy();
  `);
});

test('compiler package metadata belongs to the provider, not the installed package', () => {
  run(
    `
    installCompilerGateway(fake);
    const metadata=require('consumer');
    assert.equal(metadata.version,'99.0.0');
    assert.ok(Object.isFrozen(metadata));
  `,
    { 'node_modules/consumer/index.js': "module.exports=require('typescript/package.json');" },
  );
});

test('nested compiler packages cannot hijack the public control/error entries', () => {
  run(
    `
    const gateway=installCompilerGateway(fake);
    const control=require('consumer');
    assert.equal(typeof control.getCompilerGateway,'function');
    const esm=await import('consumer/esm.mjs');
    assert.equal(esm.getCompilerGateway,control.getCompilerGateway);
    assert.equal(esm.TypeScriptFailure,control.TypeScriptFailure);
    gateway.assertHealthy();
  `,
    {
      'node_modules/consumer/index.js': "module.exports=require('typescript/control');",
      'node_modules/consumer/esm.mjs':
        "export {getCompilerGateway} from 'typescript/control'; export {TypeScriptFailure} from 'typescript/errors';",
      'node_modules/consumer/node_modules/typescript/package.json':
        '{"name":"typescript","exports":{"./control":"./escape.cjs","./errors":"./escape.cjs"}}',
      'node_modules/consumer/node_modules/typescript/escape.cjs':
        "throw new Error('Nested compiler must never execute');",
    },
  );
});

test('preloaded compiler dependencies are rejected instead of retaining an old binding', () => {
  run(
    `
    require('consumer');
    assert.throws(()=>installCompilerGateway(fake),/before loading/);
  `,
    {
      'node_modules/consumer/index.js': "module.exports=require('hidden-compiler');",
      'node_modules/hidden-compiler/package.json': '{"name":"typescript","main":"index.js"}',
      'node_modules/hidden-compiler/index.js': "module.exports={version:'already-loaded'};",
    },
  );
});

for (const mode of ['require', 'import', 'preloaded']) {
  test(`a compiler outside node_modules cannot escape through ${mode}`, () => {
    run(
      mode === 'preloaded'
        ? `require('./consumer.cjs'); assert.throws(()=>installCompilerGateway(fake), /before loading/);`
        : `const gateway=installCompilerGateway(fake);
          ${
            mode === 'import'
              ? "await assert.rejects(import('./vendor/compiler/index.cjs'), /bypasses compiler gateway/);"
              : "assert.throws(()=>require('./consumer.cjs'), /bypasses compiler gateway/);"
          }
          assert.throws(()=>gateway.assertHealthy(), /bypasses compiler gateway/);`,
      {
        'consumer.cjs': "module.exports=require('./vendor/compiler/index.cjs');",
        'vendor/compiler/package.json': '{"name":"typescript","type":"commonjs"}',
        'vendor/compiler/index.cjs': 'module.exports={escaped:true};',
      },
    );
  });
}

test('application and dependencies receive the same program/host API', () => {
  run(
    `
    const {getCompilerGateway}=await import('typescript/control');
    const dependencyGateway=getCompilerGateway();
    const compiler=require('typescript');
    assert.equal(require('consumer'),compiler);
    assert.equal(compiler,dependencyGateway.facade);
    const host=compiler.createCompilerHost({noLib:true});
    const program=compiler.createProgram([], {noLib:true}, host);
    assert.deepEqual(program.getSourceFiles(),[]);
    dependencyGateway.assertHealthy();
  `,
    {
      'node_modules/consumer/index.js': "module.exports=require('typescript');",
    },
  );
});

test('dependencies honor a caller-owned compiler host through the shared module', () => {
  run(
    `
    const compiler=require('typescript');
    const {fileURLToPath}=await import('node:url');
    const file=fileURLToPath(new URL('virtual.ts',import.meta.url)).replaceAll(String.fromCharCode(92),'/');
    const text='export const value: string = "host-only";';
    const host=compiler.createCompilerHost({noLib:true});
    host.fileExists=name=>name===file;
    host.readFile=name=>name===file?text:undefined;
    host.getSourceFile=(name,version)=>name===file?compiler.createSourceFile(name,text,version,true):undefined;
    const program=require('consumer')(file,host);
    assert.equal(program.getSourceFile(file).text,text);
    assert.deepEqual(program.getRootFileNames(),[file]);
    const checker=program.getTypeChecker();
    const name=program.getSourceFile(file).statements[0].declarationList.declarations[0].name;
    assert.equal(checker.typeToString(checker.getTypeAtLocation(name)),'string');
  `,
    {
      'node_modules/consumer/index.js':
        "module.exports=(file,host)=>require('typescript').createProgram([file],{noLib:true},host);",
    },
  );
});
