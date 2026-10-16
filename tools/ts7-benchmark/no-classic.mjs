import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.resolve(process.argv[2] ?? 'tools/ts7-benchmark/out/no-classic');
const corpus = path.resolve(process.argv[3] ?? path.join(root, 'its/sources/projects'));
if (fs.existsSync(output)) throw new Error('Use a new output directory');
fs.mkdirSync(output, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
function installedClassicPackages(directory) {
  if (!fs.existsSync(directory)) return [];
  const packages = fs
    .readdirSync(directory)
    .filter(name => !name.startsWith('.'))
    .flatMap(name => {
      const candidate = path.join(directory, name);
      return name.startsWith('@')
        ? fs.readdirSync(candidate).map(child => path.join(candidate, child))
        : [candidate];
    });
  return packages.flatMap(candidate => {
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(path.join(candidate, 'package.json')));
    } catch (error) {
      if (['ENOENT', 'ENOTDIR'].includes(error.code)) return [];
      throw error;
    }
    if (fs.realpathSync(candidate) === path.join(root, 'packages/typescript')) return [];
    const classic = manifest.name === 'typescript' && Number(manifest.version.split('.')[0]) < 7;
    return [
      ...(classic ? [candidate] : []),
      ...installedClassicPackages(path.join(candidate, 'node_modules')),
    ];
  });
}
const removed = installedClassicPackages(path.join(root, 'node_modules')).map((original, i) => ({
  original,
  quarantine: path.join(output, 'unavailable-packages', String(i)),
  packageHash: hash(fs.readFileSync(path.join(original, 'package.json'))),
}));
if (!removed.some(p => p.original.endsWith('/typescript-classic')))
  throw new Error('Expected installed TS6 package is missing before the experiment');
const projects = fs
  .readdirSync(path.join(root, 'packages/ruling/projects'))
  .filter(name => name.endsWith('.ruling.test.ts'))
  .map(name => name.slice(0, -'.ruling.test.ts'.length))
  .sort();
const evidence = {
  head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  started: new Date().toISOString(),
  corpus,
  command: process.argv,
  toolSources: Object.fromEntries(
    ['no-classic.mjs', 'no-classic-guard.mjs'].map(name => [
      name,
      fs.readFileSync(new URL(name, import.meta.url), 'utf8'),
    ]),
  ),
  removed,
  projects: [],
};
fs.writeFileSync(path.join(output, 'plan.json'), JSON.stringify(evidence, null, 2));
const moved = [];
try {
  for (const item of removed) {
    fs.mkdirSync(path.dirname(item.quarantine), { recursive: true });
    fs.renameSync(item.original, item.quarantine);
    moved.push(item);
  }
  for (const name of projects) {
    const prefix = path.join(output, name);
    const config = {
      name,
      backend: 'ts7',
      round: 1,
      corpus,
      sources: path.join(root, 'its/sources'),
    };
    fs.writeFileSync(prefix + '.config.json', JSON.stringify(config));
    const args = [
      '--max-old-space-size=8192',
      '--import',
      './tools/ts7-benchmark/no-classic-guard.mjs',
      '--import',
      './packages/analysis/src/jsts/native/compatibility.mjs',
      '--import',
      'typescript',
      '--import',
      'tsx',
      'tools/ts7-benchmark/ruling-worker.mjs',
      prefix + '.config.json',
      prefix + '.worker.json',
    ];
    const result = spawnSync(process.execPath, args, {
      cwd: root,
      encoding: 'utf8',
      timeout: 30_000,
      env: {
        ...process.env,
        NODE_OPTIONS: '',
        NODE_PATH: '',
        SONARJS_TYPESCRIPT_SOURCE: '1',
        SONARJS_TYPESCRIPT_BACKEND: 'ts7',
        SONARJS_NO_CLASSIC_AUDIT: prefix + '.audit.json',
      },
    });
    fs.writeFileSync(prefix + '.log', result.stdout + result.stderr);
    const row = {
      project: name,
      exit: result.status,
      signal: result.signal,
      analyzed: fs.existsSync(prefix + '.worker.json'),
      missingClassic: result.stderr.includes("Cannot find module 'typescript-classic'"),
      error: result.error?.message,
    };
    evidence.projects.push(row);
    fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(evidence, null, 2));
    console.log(
      `[${evidence.projects.length}/${projects.length}] ${name}: ${row.missingClassic ? 'requires TS6 at startup' : 'inspect saved evidence'}`,
    );
  }
} finally {
  for (const item of moved.reverse()) {
    if (fs.existsSync(item.original)) throw new Error(`Refusing to overwrite ${item.original}`);
    fs.renameSync(item.quarantine, item.original);
    if (hash(fs.readFileSync(path.join(item.original, 'package.json'))) !== item.packageHash)
      throw new Error(`Restored package differs: ${item.original}`);
  }
  evidence.restored = true;
  evidence.completed = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(evidence, null, 2));
}
if (evidence.projects.some(p => p.analyzed || !p.missingClassic)) process.exitCode = 2;
