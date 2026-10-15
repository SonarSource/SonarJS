import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../../', import.meta.url));
if (!process.argv[2] || !process.argv[3])
  throw new Error('Expected upstream repository and matching immutable JS SDK directory');
const repository = path.resolve(process.argv[2]);
const go = process.env.SONARJS_GO ?? 'go';
const output = path.join(root, 'tools/ts7-benchmark/out/wasm');
const run = (exe, args, options = {}) =>
  execFileSync(exe, args, { encoding: 'utf8', stdio: 'pipe', ...options });
const revision = run('git', ['rev-parse', 'HEAD'], { cwd: repository }).trim();
const sdk = path.resolve(process.argv[3]);
{
  const metadata = JSON.parse(fs.readFileSync(path.join(sdk, 'package.json'), 'utf8'));
  if (metadata.gitHead !== revision) throw new Error('JS SDK must match the WASM source revision');
}
if (run('git', ['status', '--porcelain'], { cwd: repository }).trim())
  throw new Error('Use a clean upstream TypeScript checkout');
fs.mkdirSync(output, { recursive: true });
const source = path.join(root, 'packages/typescript/wasm');
fs.copyFileSync(path.join(source, 'main.go'), path.join(output, 'main.go'));
fs.copyFileSync(path.join(source, 'direct.go'), path.join(output, 'direct.go'));
fs.writeFileSync(
  path.join(output, 'go.mod'),
  `module github.com/microsoft/TypeScript/tsc/sonarjswasm\n\ngo 1.27\n\nrequire github.com/microsoft/TypeScript/tsc v0.0.0\nreplace github.com/microsoft/TypeScript/tsc => ${JSON.stringify(path.join(repository, 'tsc'))}\n`,
);
fs.copyFileSync(path.join(repository, 'tsc/go.sum'), path.join(output, 'go.sum'));
fs.writeFileSync(
  path.join(output, 'overlay.json'),
  JSON.stringify(
    {
      Replace: {
        [path.join(repository, 'tsc/internal/api/sonarjs_wasm.go')]: path.join(
          source,
          'session.go',
        ),
      },
    },
    null,
    2,
  ),
);
const env = { ...process.env, GOWORK: 'off', GOOS: 'js', GOARCH: 'wasm', CGO_ENABLED: '0' };
try {
  run(
    go,
    [
      'build',
      '-mod=mod',
      '-tags=noembed',
      `-overlay=${path.join(output, 'overlay.json')}`,
      '-o',
      path.join(output, 'typescript.wasm'),
      '.',
    ],
    { cwd: output, env, stdio: 'inherit' },
  );
} catch (error) {
  process.exitCode = error.status ?? 1;
  throw error;
}
const goroot = run(go, ['env', 'GOROOT']).trim();
fs.copyFileSync(path.join(goroot, 'lib/wasm/wasm_exec.js'), path.join(output, 'wasm_exec.cjs'));
fs.writeFileSync(
  path.join(output, 'build.json'),
  JSON.stringify(
    { repository, revision, go: run(go, ['version']).trim(), built: new Date().toISOString() },
    null,
    2,
  ),
);
fs.cpSync(sdk, path.join(output, 'sdk'), { recursive: true });
console.log(`Built ${path.join(output, 'typescript.wasm')} from ${revision}`);
