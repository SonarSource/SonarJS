import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const [masterRoot, project, output, count = '5'] = process.argv.slice(2);
if (!masterRoot || !project || !output || !Number.isInteger(+count) || +count < 1)
  throw new Error(
    'Usage: node compare-ts6-master.mjs <master-root> <project> <output-dir> [repeats=5]',
  );
const candidateRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const directory = path.resolve(output);
if (fs.existsSync(directory))
  throw new Error('Output directory already exists; preserve earlier evidence');
fs.mkdirSync(directory, { recursive: true });
const worker = path.join(candidateRoot, 'tools/ts7-benchmark/ts6-comparison-worker.mjs');
const git = (root, ...args) => {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true });
  if (result.status) throw new Error(result.stderr);
  return result.stdout.trim();
};
const evidence = {
  master: {
    root: path.resolve(masterRoot),
    head: git(masterRoot, 'rev-parse', 'HEAD'),
    status: git(masterRoot, 'status', '--short'),
  },
  adapter: {
    root: candidateRoot,
    head: git(candidateRoot, 'rev-parse', 'HEAD'),
    status: git(candidateRoot, 'status', '--short'),
  },
  project: path.resolve(project),
  sourcesHead: git(project, 'rev-parse', 'HEAD'),
  sourcesStatus: git(project, 'status', '--short'),
  command: process.argv,
};
fs.writeFileSync(path.join(directory, 'provenance.json'), JSON.stringify(evidence, null, 2));
// Keep the exact candidate patch, including its untracked implementation sources.
fs.writeFileSync(
  path.join(directory, 'candidate.patch'),
  git(candidateRoot, 'diff', '--binary', 'HEAD'),
);
for (const file of git(candidateRoot, 'ls-files', '--others', '--exclude-standard')
  .split('\n')
  .filter(Boolean)) {
  const target = path.join(directory, 'candidate-untracked', file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(candidateRoot, file), target);
}
function run(backend, name, rules) {
  const sonarRoot = backend === 'adapter' ? candidateRoot : path.resolve(masterRoot);
  const require = createRequire(path.join(sonarRoot, 'package.json'));
  const configFile = path.join(directory, name + '.config.json');
  const resultFile = path.join(directory, name + '.json');
  fs.writeFileSync(
    configFile,
    JSON.stringify({ backend, sonarRoot, project: path.resolve(project), rules }, null, 2),
  );
  const started = performance.now();
  const child = spawnSync(
    process.execPath,
    ['--import', pathToFileURL(require.resolve('tsx')).href, worker, configFile, resultFile],
    {
      cwd: sonarRoot,
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 32 * 1024 * 1024,
      timeout: 300_000,
      env: {
        ...process.env,
        SONARJS_TYPESCRIPT_BACKEND: 'ts6',
        SONARJS_TYPESCRIPT_SOURCE: '1',
        TSX_TSCONFIG_PATH: path.join(sonarRoot, 'packages/tsconfig.test.json'),
      },
    },
  );
  const wallMs = performance.now() - started;
  fs.writeFileSync(path.join(directory, name + '.log'), child.stdout + child.stderr);
  if (child.status !== 0)
    throw new Error(`${name} failed (${child.status}): ${child.stderr}\nSee ${resultFile}`);
  const report = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
  if (!report.valid) throw new Error(`${name}: invalid report`);
  if (
    backend === 'adapter' &&
    (!report.compilerRouting?.sameFacade ||
      report.compilerRouting.provider !== 'ts6' ||
      !report.compilerRouting.ownedImporters ||
      !report.compilerRouting.typescriptEslintImporters)
  )
    throw new Error(`${name}: shared compiler routing was not demonstrated`);
  report.timings.wallMs = wallMs;
  fs.writeFileSync(resultFile, JSON.stringify(report, null, 2));
  console.log(`${name}: ${(wallMs / 1000).toFixed(3)}s wall`);
  return report;
}
const prepared = run('prepare', 'prepare');
fs.writeFileSync(path.join(directory, 'rules.json'), JSON.stringify(prepared.rules, null, 2));
const runs = [];
const gates = [
  'versions',
  'files',
  'sourceHashes',
  'signals',
  'rulesHash',
  'programFiles',
  'activeRules',
  'compilerOptions',
  'rootNames',
  'issues',
];
for (let index = 0; index < +count; index++) {
  const pair = {};
  for (const backend of index % 2 ? ['adapter', 'master'] : ['master', 'adapter'])
    pair[backend] = run(backend, `${index + 1}-${backend}`, prepared.rules);
  const reference = runs[0]?.master ?? pair.master;
  const mismatches = [];
  for (const backend of ['master', 'adapter'])
    for (const gate of gates)
      if (!isDeepStrictEqual(reference[gate], pair[backend][gate]))
        mismatches.push(`${backend}:${gate}`);
  runs.push(pair);
  fs.writeFileSync(
    path.join(directory, 'parity.json'),
    JSON.stringify({ pairs: runs.length, mismatches }, null, 2),
  );
  if (mismatches.length)
    throw new Error(`Parity mismatch: ${mismatches.join(', ')}. Raw reports retained.`);
}
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const range = values => ({
  median: median(values),
  min: Math.min(...values),
  max: Math.max(...values),
});
const summary = {
  provenance: evidence,
  repeats: runs.length,
  parity: {
    gates,
    files: prepared.files.length,
    issueLines: Object.values(runs[0].master.issues).flatMap(files => Object.values(files).flat())
      .length,
    ruleConfigurations: prepared.rules.length,
    ruleKeys: new Set(prepared.rules.map(rule => rule.key)).size,
  },
  backends: Object.fromEntries(
    ['master', 'adapter'].map(backend => [
      backend,
      {
        timings: Object.fromEntries(
          Object.keys(runs[0][backend].timings).map(key => [
            key,
            range(runs.map(pair => pair[backend].timings[key])),
          ]),
        ),
        maxRssBytes: range(runs.map(pair => pair[backend].memory.maxRssBytes)),
      },
    ]),
  ),
};
fs.writeFileSync(path.join(directory, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ parity: summary.parity, backends: summary.backends }, null, 2));
