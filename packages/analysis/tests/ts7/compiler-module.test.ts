import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import ts from 'typescript';
import { build } from 'esbuild';
import { typescriptModulePlugin } from '../../../../tools/typescript-module-plugin.mjs';
import { findCompilerRoot } from '../../../typescript/boundary.cjs';

const output = path.resolve('tools/ts7-benchmark/out');

test('native compiler translation has no dependency on a parser fork or parser internals', async () => {
  const result = await build({
    entryPoints: ['packages/typescript/compat/program.mjs'],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    metafile: true,
    logLevel: 'silent',
  });
  for (const output of Object.values(result.metafile!.outputs)) {
    assert.ok(output.imports.every(({ path }) => !path.includes('@typescript-eslint/')));
  }
  assert.ok(Object.keys(result.metafile!.inputs).every(file => !file.includes('/upstream/')));
  const { dependencies, devDependencies } = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  for (const [name, version] of Object.entries({ ...dependencies, ...devDependencies })) {
    if (name.startsWith('@typescript-eslint/')) assert.equal(version, '8.71.1');
  }
});

function isolated(source: string, consumer: string) {
  const directory = fs.mkdtempSync(path.join(output, 'compiler-module-'));
  try {
    const dependency = path.join(directory, 'node_modules/consumer');
    fs.mkdirSync(dependency, { recursive: true });
    fs.writeFileSync(path.join(dependency, 'index.cjs'), consumer);
    fs.writeFileSync(path.join(directory, 'consumer.cjs'), consumer);
    const entry = path.join(directory, 'run.mjs');
    fs.writeFileSync(
      entry,
      `import assert from 'node:assert/strict';
      import {createRequire} from 'node:module';
      const require=createRequire(import.meta.url);
      ${source}`,
    );
    const child = spawnSync(process.execPath, [entry], {
      cwd: process.cwd(),
      encoding: 'utf8',
      windowsHide: true,
      timeout: 30000,
      env: { ...process.env, SONARJS_TYPESCRIPT_BACKEND: 'ts6' },
    });
    assert.equal(child.status, 0, child.stdout + child.stderr + (child.error ?? ''));
  } finally {
    assert.ok(directory.startsWith(output + path.sep));
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('application CJS/ESM and nested dependencies share one compiler module without a preload', () => {
  fs.mkdirSync(output, { recursive: true });
  isolated(
    `
    const app=require('./consumer.cjs');
    const dependency=require('./node_modules/consumer/index.cjs');
    const esm=await import('typescript');
    const {getCompilerGateway}=await import('typescript/control');
    assert.equal(app,dependency);
    assert.equal(app,esm.default);
    assert.equal(app.createProgram,esm.createProgram);
    assert.equal(app,getCompilerGateway().facade);
    // The first application import loads this package and installs its hook.
    assert.ok(getCompilerGateway().observations().some(x=>x.importer.includes('/node_modules/consumer/')));
    getCompilerGateway().assertHealthy();
  `,
    "module.exports=require('typescript');",
  );
});

test('a non-TS6 provider serves application imports too, without falling back to the SDK', () => {
  isolated(
    `
    const {installCompilerGateway,getCompilerGateway}=await import('typescript/control');
    const selected={name:'fake-wasm',implementationRoots:[],packageMetadata:{name:'typescript',version:'99.0.0'},exports:{ping:()=>42}};
    const gateway=installCompilerGateway(selected);
    assert.equal(getCompilerGateway(),gateway);
    assert.equal(require('./consumer.cjs'),42);
    assert.equal(require('./node_modules/consumer/index.cjs'),42);
    assert.equal(require('typescript'),gateway.facade);
    gateway.assertHealthy();
  `,
    "module.exports=require('typescript').ping();",
  );
});

test('application code cannot bypass the module using a physical private SDK path', () => {
  isolated(
    `
    require('typescript');
    const {getCompilerGateway}=await import('typescript/control');
    assert.throws(()=>require('./consumer.cjs'),/bypasses compiler gateway/);
    assert.throws(()=>getCompilerGateway().assertHealthy(),/bypasses compiler gateway/);
  `,
    `module.exports=require(${JSON.stringify(path.resolve('node_modules/typescript-classic/lib/typescript.js'))});`,
  );
});

test('production consumers import the shared module, not private compiler SDKs', () => {
  let files = 0;
  const packageCache = new Map<string, string | undefined>();
  const ownedRoot = path.resolve('packages/typescript');
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      const normalized = file.replaceAll('\\', '/');
      if (/\/jsts\/native(?:\/|$)/.test(normalized)) continue;
      if (entry.isDirectory()) visit(file);
      else if (/\.(?:ts|mjs)$/.test(file)) {
        files++;
        const source = ts.createSourceFile(
          file,
          fs.readFileSync(file, 'utf8'),
          ts.ScriptTarget.Latest,
          true,
        );
        const check = (node: ts.Node) => {
          const parent = node.parent;
          const moduleSpecifier =
            parent &&
            (ts.isImportDeclaration(parent) ||
              ts.isExportDeclaration(parent) ||
              ts.isExternalModuleReference(parent) ||
              (ts.isLiteralTypeNode(parent) && ts.isImportTypeNode(parent.parent)) ||
              (ts.isCallExpression(parent) &&
                (parent.expression.kind === ts.SyntaxKind.ImportKeyword ||
                  (ts.isIdentifier(parent.expression) && parent.expression.text === 'require'))));
          if (
            moduleSpecifier &&
            ts.isStringLiteral(node) &&
            /(?:typescript-(?:classic|native)|@typescript\/(?:api|native-preview)|node_modules[\\/]typescript)/.test(
              node.text,
            )
          ) {
            assert.fail(`Private compiler reference in ${file}: ${node.text}`);
          }
          if (moduleSpecifier && ts.isStringLiteral(node)) {
            const resolved = ts.resolveModuleName(
              node.text,
              file,
              { moduleResolution: ts.ModuleResolutionKind.NodeNext },
              ts.sys,
            ).resolvedModule?.resolvedFileName;
            if (resolved) {
              assert.equal(
                findCompilerRoot(resolved, packageCache, ownedRoot),
                undefined,
                `Physical compiler import in ${file}: ${node.text}`,
              );
              const normalized = resolved.replaceAll('\\', '/');
              assert.ok(
                !normalized.includes('/jsts/native/') &&
                  !normalized.includes('/typescript/compat/'),
                `Private compiler implementation import in ${file}: ${node.text}`,
              );
            }
          }
          ts.forEachChild(node, check);
        };
        check(source);
      }
    }
  };
  for (const area of ['analysis', 'grpc', 'shared']) visit(path.resolve(`packages/${area}/src`));
  assert.ok(files > 500, 'must audit the real production source tree');
});

test('bundling routes application and parser imports through the same module', async () => {
  const directory = fs.mkdtempSync(path.join(output, 'compiler-bundle-'));
  try {
    const entry = path.join(directory, 'entry.mjs');
    const outfile = path.join(directory, 'bundle.cjs');
    fs.writeFileSync(
      entry,
      `
      import assert from 'node:assert/strict';
      import ts, {createProgram} from 'typescript';
      import {createRequire} from 'node:module';
      import {getCompilerGateway} from 'typescript/control';
      import {parseForESLint} from '@typescript-eslint/parser';
      assert.equal(ts,getCompilerGateway().facade);
      assert.equal(ts,require('typescript'));
      assert.equal(createProgram,ts.createProgram);
      const text='const answer: number = 42;';
      const host=ts.createCompilerHost({noLib:true});
      host.getSourceFile=(file,version)=>file==='input.ts'?ts.createSourceFile(file,text,version,true):undefined;
      const program=ts.createProgram(['input.ts'],{noLib:true},host);
      const parsed=parseForESLint(text,{filePath:'input.ts',programs:[program]});
      assert.equal(parsed.services.program,program);
      const mapped=parsed.services.esTreeNodeToTSNodeMap.get(parsed.ast.body[0].declarations[0].id);
      assert.equal(program.getTypeChecker().typeToString(program.getTypeChecker().getTypeAtLocation(mapped)),'number');
      getCompilerGateway().assertHealthy();
      console.log('shared bundled module and checker passed');
    `,
    );
    const result = await build({
      entryPoints: [entry],
      outfile,
      bundle: true,
      platform: 'node',
      format: 'cjs',
      plugins: [typescriptModulePlugin()],
      metafile: true,
      logLevel: 'silent',
    });
    assert.ok(
      Object.keys(result.metafile!.inputs).some(file =>
        file.endsWith('packages/typescript/index.cjs'),
      ),
    );
    const tripwire = `const Module=require('node:module');const load=Module._load;
      Module._load=function(id,...args){if(/^(?:typescript(?:-classic|-native)?)(?:\\/|$)/.test(id))throw new Error('External compiler load: '+id);return Reflect.apply(load,this,[id,...args]);};
      require(${JSON.stringify(outfile)});`;
    const child = spawnSync(process.execPath, ['--eval', tripwire], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 30000,
      env: { ...process.env, SONARJS_TYPESCRIPT_BACKEND: 'ts6' },
    });
    assert.equal(child.status, 0, child.stdout + child.stderr);
    assert.match(child.stdout, /shared bundled module and checker passed/);
    await assert.rejects(
      build({
        stdin: {
          contents: `require(${JSON.stringify(path.resolve('node_modules/typescript-classic/lib/typescript.js'))})`,
          resolveDir: directory,
        },
        bundle: true,
        write: false,
        platform: 'node',
        plugins: [typescriptModulePlugin()],
        logLevel: 'silent',
      }),
      /bypasses the owned TypeScript module/,
    );
  } finally {
    assert.ok(directory.startsWith(output + path.sep));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('bundle boundary rejects local compiler copies and lookalike private importer paths', async () => {
  const directory = fs.mkdtempSync(path.join(output, 'compiler-boundary-'));
  try {
    const compiler = path.join(directory, 'vendor/compiler');
    fs.mkdirSync(compiler, { recursive: true });
    fs.writeFileSync(path.join(compiler, 'package.json'), '{"name":"typescript"}');
    fs.writeFileSync(path.join(compiler, 'index.cjs'), 'module.exports={escaped:true};');
    for (const relative of ['consumer.cjs', 'packages/analysis/src/jsts/native/consumer.cjs']) {
      const entry = path.join(directory, relative);
      fs.mkdirSync(path.dirname(entry), { recursive: true });
      fs.writeFileSync(
        entry,
        `module.exports=require(${JSON.stringify(path.join(compiler, 'index.cjs'))});`,
      );
      await assert.rejects(
        build({
          entryPoints: [entry],
          bundle: true,
          write: false,
          platform: 'node',
          plugins: [typescriptModulePlugin()],
          logLevel: 'silent',
        }),
        /bypasses the owned TypeScript module/,
      );
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
