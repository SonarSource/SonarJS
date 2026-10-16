import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { backends, rulingOrder } from './backends.mjs';
import { summarizeRuling, renderRuling, compactRulingReport } from './ruling-results.mjs';
import { preserveAttempt, readWorkerReport, isFinalizedReport } from './ruling-io.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
const command = args.shift() ?? 'run';
if (command === '--help' || command === 'help') {
  console.log(
    'Usage: npm run ts7:ruling -- run|list|report [--corpus PATH --sources PATH --projects a,b --backends ts6,ts7,wasm,wasm-direct --runs 3 --output PATH --resume --details --timeout-ms 600000 --heap-mb 8192 --runtimes FILE]',
  );
  console.log('Guide: tools/ts7-benchmark/README.md#complete-ruling-suite');
  process.exit(0);
}
const flags = new Set(['--resume', '--details']);
const valued = new Set([
  '--corpus',
  '--sources',
  '--projects',
  '--backends',
  '--runs',
  '--output',
  '--timeout-ms',
  '--heap-mb',
  '--runtimes',
]);
for (let i = 0; i < args.length; i++) {
  if (valued.has(args[i])) {
    if (!args[++i] || args[i].startsWith('--')) throw new Error('Missing option value');
  } else if (!flags.has(args[i])) throw new Error(`Unknown option ${args[i]}`);
}
const value = name => {
  const i = args.indexOf(name);
  return i < 0 ? undefined : args[i + 1];
};
if (!['run', 'list', 'report'].includes(command))
  throw new Error(
    'Usage: node tools/ts7-benchmark/ruling.mjs run|list|report [--corpus PATH --projects a,b --backends ts6,ts7,wasm,wasm-direct --runs 3 --output PATH --resume --timeout-ms 600000 --heap-mb 8192 --runtimes FILE]',
  );
const output = path.resolve(
  value('--output') ??
    path.join(
      repository,
      'tools/ts7-benchmark/out/ruling-' + new Date().toISOString().replaceAll(':', '-'),
    ),
);
const registry = JSON.parse(
  fs.readFileSync(path.join(repository, 'packages/ruling/projects.json')),
);
const tests = new Set(
  fs
    .readdirSync(path.join(repository, 'packages/ruling/projects'))
    .filter(f => f.endsWith('.ruling.test.ts'))
    .map(f => f.slice(0, -'.ruling.test.ts'.length)),
);
for (const name of tests)
  if (!registry.some(p => p.name === name))
    throw new Error(`Ruling test absent from registry: ${name}`);
const projects = registry
  .map(p => ({ ...p, active: tests.has(p.name) }))
  .sort((a, b) => a.name.localeCompare(b.name));
if (command === 'list') {
  console.log(JSON.stringify(projects, null, 2));
  process.exit(0);
}
const reportCache = new Map();
function readReports(plan) {
  return plan.projects
    .filter(p => p.active)
    .flatMap(p =>
      plan.backends.flatMap(b =>
        Array.from({ length: plan.runs }, (_, i) => ({
          file: path.join(output, p.name, `${b}-${i + 1}.json`),
          identity: { project: p.name, backend: b, round: i + 1 },
        })),
      ),
    )
    .filter(({ file }) => fs.existsSync(file))
    .map(({ file, identity }) => {
      const stat = fs.statSync(file);
      const signature = `${stat.mtimeMs}:${stat.size}`;
      const cached = reportCache.get(file);
      if (cached?.signature === signature) return cached.report;
      const worker = readWorkerReport(file, identity);
      if (!isFinalizedReport(worker)) {
        console.warn(`Unfinalized report ${file}; --resume preserves this attempt and reruns it`);
        return undefined;
      }
      const report = compactRulingReport({
        ...worker,
        reportPath: path.relative(output, file).replaceAll('\\', '/'),
      });
      reportCache.set(file, { signature, report });
      return report;
    })
    .filter(Boolean);
}
function update(plan) {
  const summary = summarizeRuling(plan, readReports(plan));
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(output, 'report.md'), renderRuling(summary, plan));
  return summary;
}
if (command === 'report') {
  const plan = JSON.parse(fs.readFileSync(path.join(output, 'plan.json')));
  update(plan);
  if (args.includes('--details')) {
    const { writeRulingDifferences } = await import('./ruling-diff.mjs');
    writeRulingDifferences(output, plan);
  }
  console.log(path.join(output, 'report.md'));
  process.exit(0);
}
const git = (root, ...argv) =>
  execFileSync('git', ['-C', root, ...argv], { encoding: 'utf8' }).trimEnd();
const hash = text => createHash('sha256').update(text).digest('hex');
const corpus = path.resolve(value('--corpus') ?? path.join(repository, 'its/sources/projects'));
const sources = path.resolve(value('--sources') ?? path.join(repository, 'its/sources'));
const selected = value('--projects')?.split(',');
if (selected?.some(n => !tests.has(n))) throw new Error('Unknown or inactive project selection');
const selectedProjects = projects.filter(p => !selected || selected.includes(p.name));
if (!selectedProjects.some(p => p.active)) throw new Error('No active projects selected');
if (value('--runtimes') && value('--backends')) throw new Error('Choose runtimes or backends');
const runtimes = value('--runtimes')
  ? JSON.parse(fs.readFileSync(path.resolve(value('--runtimes'))))
  : Object.fromEntries(
      (value('--backends') ?? 'ts6,ts7,wasm,wasm-direct')
        .split(',')
        .map(name => [name, { ...backends[name], root: repository, kind: 'owned' }]),
    );
const providers = Object.keys(runtimes);
if (!providers.includes('ts6') || providers.some(name => !/^[a-z][a-z0-9-]*$/.test(name)))
  throw new Error('Runtime comparison requires a ts6 reference and safe unique labels');
for (const [name, runtime] of Object.entries(runtimes)) {
  runtime.root = path.resolve(runtime.root);
  if (
    !['direct', 'owned'].includes(runtime.kind) ||
    !['ts6', 'ts7', 'wasm'].includes(runtime.provider) ||
    (runtime.kind === 'direct' && runtime.provider !== 'ts6')
  )
    throw new Error(`Invalid runtime ${name}`);
  if (!fs.existsSync(path.join(runtime.root, 'package.json')))
    throw new Error(`Missing runtime ${name}`);
}
const runs = Number(value('--runs') ?? 3),
  timeoutMs = Number(value('--timeout-ms') ?? 600000),
  heapMb = Number(value('--heap-mb') ?? 8192);
for (const n of [runs, timeoutMs, heapMb])
  if (!Number.isSafeInteger(n) || n < 1)
    throw new Error('runs, timeout and heap must be positive integers');
for (const p of selectedProjects.filter(p => p.active)) {
  const directory = p.folder ? path.join(sources, p.folder) : path.join(corpus, p.name);
  if (!fs.existsSync(directory)) throw new Error(`Missing ruling project ${p.name}: ${directory}`);
}
if (providers.some(b => runtimes[b].provider === 'wasm') && !process.env.SONARJS_TS7_WASM)
  throw new Error('SONARJS_TS7_WASM is required for WASM providers');
const files = [
  ...new Set([
    ...git(repository, 'ls-files', '-z').split('\0'),
    ...git(repository, 'ls-files', '--others', '--exclude-standard', '-z').split('\0'),
    'packages/typescript/native-compat.mjs',
  ]),
]
  .filter(
    f =>
      f &&
      /^(?:packages\/|tools\/ts7-benchmark\/|tools\/typescript-module-plugin\.mjs|package(?:-lock)?\.json)/.test(
        f,
      ) &&
      /\.(?:ts|mjs|cjs|cts|json)$/.test(f),
  )
  .sort();
const sourceHashes = Object.fromEntries(
  files.map(f => [f, hash(fs.readFileSync(path.join(repository, f)))]),
);
const identity = {
  sourceHashes,
  runtimes: Object.fromEntries(
    Object.entries(runtimes).map(([name, runtime]) => [
      name,
      {
        ...runtime,
        head: git(runtime.root, 'rev-parse', 'HEAD'),
        status: git(runtime.root, 'status', '--short'),
        sourceHashes: Object.fromEntries(
          git(runtime.root, 'ls-files', '-z')
            .split('\0')
            .filter(
              file =>
                /^(?:packages\/|package(?:-lock)?\.json)/.test(file) &&
                /\.(?:ts|mjs|cjs|cts|json)$/.test(file),
            )
            .map(file => [file, hash(fs.readFileSync(path.join(runtime.root, file)))]),
        ),
      },
    ]),
  ),
  corpus,
  sources,
  corpusHead: git(corpus, 'rev-parse', 'HEAD'),
  corpusStatus: git(corpus, 'status', '--short'),
  corpusPatchHash: hash(git(corpus, 'diff', '--binary', 'HEAD')),
  corpusUntrackedHashes: Object.fromEntries(
    git(corpus, 'ls-files', '--others', '--exclude-standard', '-z')
      .split('\0')
      .filter(Boolean)
      .sort()
      .map(file => [file, hash(fs.readFileSync(path.join(corpus, file)))]),
  ),
  customSourceHashes: Object.fromEntries(
    selectedProjects
      .filter(p => p.active && p.folder)
      .flatMap(p => {
        const root = path.join(sources, p.folder);
        return fs
          .readdirSync(root, { recursive: true, withFileTypes: true })
          .filter(f => f.isFile())
          .map(f => path.join(f.parentPath, f.name));
      })
      .sort()
      .map(file => [path.relative(sources, file), hash(fs.readFileSync(file))]),
  ),
  projects: selectedProjects,
  backends: providers,
  runs,
  timeoutMs,
  heapMb,
  wasm: providers.some(b => runtimes[b].provider === 'wasm')
    ? {
        directory: process.env.SONARJS_TS7_WASM,
        hash: hash(fs.readFileSync(path.join(process.env.SONARJS_TS7_WASM, 'typescript.wasm'))),
        build: JSON.parse(fs.readFileSync(path.join(process.env.SONARJS_TS7_WASM, 'build.json'))),
      }
    : undefined,
};
const identityHash = hash(JSON.stringify(identity));
let plan;
if (args.includes('--resume')) {
  plan = JSON.parse(fs.readFileSync(path.join(output, 'plan.json')));
  if (plan.identityHash !== identityHash)
    throw new Error(
      'Resume inputs or measured sources changed; preserve this batch and use a new output',
    );
} else {
  if (fs.existsSync(output) && fs.readdirSync(output).length)
    throw new Error('Output exists; use --resume for unchanged inputs or choose a fresh directory');
  fs.mkdirSync(output, { recursive: true });
  plan = {
    ...identity,
    identityHash,
    started: new Date().toISOString(),
    head: git(repository, 'rev-parse', 'HEAD'),
    command: process.argv,
    machine: {
      node: process.version,
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      cpu: os.cpus()[0]?.model,
      cpus: os.cpus().length,
      memory: os.totalmem(),
    },
  };
  fs.writeFileSync(path.join(output, 'plan.json'), JSON.stringify(plan, null, 2));
  fs.writeFileSync(
    path.join(output, 'candidate.patch'),
    git(repository, 'diff', '--binary', 'HEAD'),
  );
  const untracked = git(repository, 'ls-files', '--others', '--exclude-standard', '-z')
    .split('\0')
    .filter(f => files.includes(f));
  fs.writeFileSync(
    path.join(output, 'untracked-sources.json'),
    JSON.stringify(
      Object.fromEntries(
        untracked.map(f => [f, fs.readFileSync(path.join(repository, f), 'utf8')]),
      ),
    ),
  );
}
let stop = false,
  active;
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    stop = true;
    active?.();
  });
const total = plan.projects.filter(p => p.active).length * providers.length * runs;
let completed = readReports(plan).length;
for (let round = 0; round < runs && !stop; round++) {
  const activeProjects = plan.projects.filter(p => p.active);
  for (const { project, backend } of rulingOrder(activeProjects, providers, round)) {
    if (stop) break;
    const dir = path.join(output, project.name);
    fs.mkdirSync(dir, { recursive: true });
    const prefix = path.join(dir, `${backend}-${round + 1}`);
    if (
      fs.existsSync(prefix + '.json') &&
      isFinalizedReport(
        readWorkerReport(prefix + '.json', {
          project: project.name,
          backend,
          round: round + 1,
        }),
      )
    )
      continue;
    preserveAttempt(prefix);
    const spec = runtimes[backend];
    const configuration = {
      name: project.name,
      backend,
      round: round + 1,
      corpus,
      sources,
      runtime: spec,
    };
    fs.writeFileSync(prefix + '.config.json', JSON.stringify(configuration, null, 2));
    const log = fs.openSync(prefix + '.log', 'w');
    const start = performance.now();
    let timedOut = false,
      interrupted = false;
    const child = spawn(
      process.execPath,
      [
        `--max-old-space-size=${heapMb}`,
        path.join(repository, 'tools/ts7-benchmark/ruling-worker.mjs'),
        prefix + '.config.json',
        prefix + '.json',
      ],
      {
        cwd: spec.root,
        detached: process.platform !== 'win32',
        stdio: ['ignore', log, log],
        env: {
          ...process.env,
          SONARJS_TYPESCRIPT_SOURCE: '1',
          TSX_TSCONFIG_PATH: path.join(spec.root, 'packages/tsconfig.test.json'),
          SONARJS_TYPESCRIPT_BACKEND: spec.provider,
          ...(spec.bridge ? { SONARJS_WASM_BRIDGE: spec.bridge } : {}),
        },
      },
    );
    const kill = signal => {
      try {
        if (process.platform === 'win32') child.kill(signal);
        else process.kill(-child.pid, signal);
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    };
    let force;
    const terminate = () => {
      kill('SIGTERM');
      force = setTimeout(() => kill('SIGKILL'), 5000);
    };
    active = () => {
      interrupted = true;
      terminate();
    };
    const timer = setTimeout(() => {
      timedOut = true;
      terminate();
    }, timeoutMs);
    const exit = await new Promise(resolve => {
      child.once('error', error => resolve({ error: error.message }));
      child.once('close', (code, signal) => resolve({ code, signal }));
    });
    clearTimeout(timer);
    clearTimeout(force);
    active = undefined;
    fs.closeSync(log);
    if (interrupted) {
      fs.writeFileSync(
        prefix + '.interrupted.json',
        JSON.stringify({ exit, at: new Date().toISOString() }),
      );
      if (fs.existsSync(prefix + '.json'))
        fs.renameSync(prefix + '.json', prefix + '.interrupted-report.json');
      break;
    }
    const report = readWorkerReport(prefix + '.json', {
      project: project.name,
      backend,
      round: round + 1,
    });
    // Preserve malformed output before replacing it with the structured failure.
    if (
      report.errors.some(e => e.message.startsWith('Unreadable worker report:')) &&
      fs.existsSync(prefix + '.json')
    )
      fs.renameSync(prefix + '.json', prefix + '.unreadable.json');
    report.timings.workerWallMs = performance.now() - start;
    report.exit = exit;
    report.timedOut = timedOut;
    if (exit.code !== 0 || timedOut) {
      report.valid = false;
      report.errors.push({
        message: timedOut
          ? `Timed out after ${timeoutMs} ms`
          : `Worker failed: ${JSON.stringify(exit)}`,
      });
    }
    fs.writeFileSync(prefix + '.json', JSON.stringify(report, null, 2));
    completed++;
    console.log(
      `[${completed}/${total}] ${project.name} ${backend} ${round + 1}/${runs}: ${report.valid ? 'valid' : 'FAILED'}, ${report.files?.length ?? '?'} files, ${report.issueCount ?? '?'} findings, ${report.timings.analysisMs?.toFixed(0) ?? '?'} ms`,
    );
    update(plan);
  }
}
const summary = update(plan);
if (summary.complete) {
  plan.completed ??= new Date().toISOString();
  fs.writeFileSync(path.join(output, 'plan.json'), JSON.stringify(plan, null, 2));
}
console.log(
  `Full suite ${summary.complete ? 'complete' : 'incomplete'}; parity ${summary.parityPassed ? 'PASS' : 'NOT PASSED'}; ${path.join(output, 'report.md')}`,
);
if (stop || !summary.parityPassed) process.exitCode = 2;
