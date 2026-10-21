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
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { it } from 'node:test';

function probe(script: string) {
  execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 30_000,
    env: { ...process.env, SONARJS_TYPESCRIPT_BACKEND: 'tsgo-ipc' },
  });
}

it('TSGo keeps external typed rules on the facade with the TS6 runtime blocked', () => {
  const parser = new URL('../../analysis/src/jsts/frontend/parser.js', import.meta.url).href;
  const factory = new URL('../../analysis/src/jsts/program/factory.js', import.meta.url).href;
  probe(`
    import assert from 'node:assert/strict';
    import Module from 'node:module';
    const load=Module._load;
    Module._load=function(name,...args){
      if(name==='typescript-classic'||name.startsWith('typescript-classic/')) throw new Error('TS6 runtime was loaded');
      return load.call(this,name,...args);
    };
    const {Linter}=await import('eslint');
    const {default:plugin}=await import('@typescript-eslint/eslint-plugin');
    const parser=await import(${JSON.stringify(parser)});
    const {createProgramFromSingleFile}=await import(${JSON.stringify(factory)});
    const name=process.cwd()+'/virtual-external-rule.ts',code='Promise.resolve(1);';
    const program=createProgramFromSingleFile(name,code,{strict:true,target:99});
    const findings=new Linter().verify(code,{
      files:['**/*.ts'],languageOptions:{parser,parserOptions:{filePath:name,programs:[program]}},
      plugins:{ts:plugin},rules:{'ts/no-floating-promises':'error'}
    },{filename:name});
    assert.equal(findings.length,1);assert.equal(findings[0].ruleId,'ts/no-floating-promises');
    assert.equal(findings[0].fatal,undefined);
    const {createRequire}=await import('node:module');createRequire(process.cwd()+'/package.json')('./packages/typescript/providers/tsgo-ipc/index.mjs').close();
  `);
});

it('TSGo scopes queries to snapshots, releases programs and starts a fresh session', () => {
  probe(`
    import assert from 'node:assert/strict';
    import ts from 'typescript';
    import {createRequire} from 'node:module';const {close}=createRequire(process.cwd()+'/package.json')('./packages/typescript/providers/tsgo-ipc/index.mjs');
    const name='/virtual/overlays/main.ts',dependency='/virtual/overlays/imported.ts';
    const files=new Map([[name,"import { value } from './imported'; export const result=value;"],[dependency,'export const value=42;']]);
    const host={...ts.createCompilerHost({noLib:true}),readFile:file=>files.get(file),fileExists:file=>files.has(file),
      directoryExists:()=>true,getDirectories:()=>[],getCurrentDirectory:()=>'/virtual/overlays',readDirectory:()=>[]};
    const create=()=>ts.createProgram({rootNames:[name],options:{noLib:true},host});
    const value=p=>{const c=p.getTypeChecker();return c.typeToString(c.getTypeAtLocation(p.getSourceFile(name).statements[1].declarationList.declarations[0].initializer));};
    const original=create();assert.equal(value(original),'42');
    assert.equal(original.getSourceFile(dependency).text,'export const value=42;');
    assert.equal(original.getSourceFile('/etc/passwd'),undefined,'denied source never reads server disk');
    files.set(dependency,'export const value="edited";');const edited=create();
    assert.equal(value(edited),'"edited"');assert.equal(value(original),'42');
    original.dispose();original.dispose();assert.throws(()=>value(original),/disposed/);
    close();assert.throws(()=>value(edited),/session was closed/);
    const restarted=create();assert.equal(value(restarted),'"edited"');restarted.dispose();close();close();
  `);
});

it('TSGo invalidates a failed transport without retrying stale program operations', async () => {
  const runtimeModule = pathToFileURL(
    path.resolve('packages/typescript/providers/tsgo-ipc/runtime.mjs'),
  ).href;
  const { createRuntime } = await import(runtimeModule);
  let opened = 0,
    closed = 0;
  class FakeAPI {
    constructor() {
      opened++;
    }
    close() {
      closed++;
    }
  }
  const runtime = createRuntime(FakeAPI, {}, process.execPath);
  const stale = runtime.bind({});
  stale(() => undefined);
  assert.throws(
    () =>
      stale(() => {
        throw new Error('Unexpected EOF');
      }),
    /Unexpected EOF/,
  );
  assert.equal(closed, 1);
  assert.throws(() => stale(() => undefined), /session was closed/);
  runtime.bind({})(() => undefined);
  assert.equal(opened, 2);
  runtime.close();
  assert.equal(closed, 2);
});

it('TSGo recovers after its native child exits', { skip: process.platform === 'win32' }, () => {
  probe(`
    import assert from 'node:assert/strict';
    import ts from 'typescript';
    import {execFileSync} from 'node:child_process';
    import {createRequire} from 'node:module';
    const provider=createRequire(process.cwd()+'/package.json')('./packages/typescript/providers/tsgo-ipc/index.mjs');
    const name='/virtual/native-exit.ts',text='export const value=42;';
    const host={...ts.createCompilerHost({noLib:true}),readFile:file=>file===name?text:undefined,fileExists:file=>file===name,directoryExists:()=>true};
    const create=()=>ts.createProgram({rootNames:[name],options:{noLib:true},host});
    const original=create();
    const rows=execFileSync('ps',['-eo','pid=,ppid=,args='],{encoding:'utf8'}).split('\\n');
    const match=rows.map(row=>/^\\s*(\\d+)\\s+(\\d+)\\s+(.+)$/.exec(row)).find(row=>row&&Number(row[2])===process.pid&&row[3].includes('/target/tsgo-ipc/native/tsc-'));
    assert.ok(match,'native child belongs to this test process');
    process.kill(Number(match[1]),'SIGKILL');
    await new Promise(resolve=>setTimeout(resolve,30));
    assert.throws(()=>original.getSemanticDiagnostics(),/EOF|EPIPE|EBADF|closed|reset/i);
    assert.throws(()=>original.getSourceFile(name),/session was closed/);
    const restarted=create();assert.equal(restarted.getSourceFile(name).text,text);restarted.dispose();provider.close();
  `);
});
