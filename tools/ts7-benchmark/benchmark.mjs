import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import {
  compareResults,
  distribution,
  fingerprint,
  parityPassed,
  summarizeComparisons,
} from './results.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const valuedOptions = new Set([
  '--project',
  '--tsconfig',
  '--output',
  '--runs',
  '--max-files',
  '--rules',
  '--rule-config',
  '--fs',
  '--archive-mode',
  '--archive-dir',
  '--native-backend',
  '--native-sdk',
  '--backends',
  '--sample-interval-us',
  '--allocation-interval-bytes',
]);
const flagOptions = new Set([
  '--restrict-node-modules',
  '--profile',
  '--cpu-profile',
  '--layer-profile',
  '--allocation-profile',
  '--calibrate',
  '--help',
]);
for (let index = 0; index < args.length; index++) {
  const option = args[index];
  if (valuedOptions.has(option)) {
    if (!args[index + 1] || args[index + 1].startsWith('--'))
      throw new Error(`Missing value for ${option}`);
    index++;
  } else if (!flagOptions.has(option)) throw new Error(`Unknown option ${option}`);
}
if (args.includes('--help')) {
  console.log('SonarJS TS7 benchmark: npm run ts7:benchmark -- [options]');
  console.log('Values: ' + [...valuedOptions].join(', '));
  console.log('Flags: ' + [...flagOptions].join(', '));
  console.log('Guide: tools/ts7-benchmark/README.md');
  process.exit(0);
}
const value = name => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};
const project = path.resolve(value('--project') ?? path.join(directory, 'fixtures/project'));
const output = path.resolve(
  value('--output') ?? path.join(directory, 'out', new Date().toISOString().replaceAll(':', '-')),
);
const runs = Number(value('--runs') ?? 3);
const maxFiles = Number(value('--max-files') ?? Number.MAX_SAFE_INTEGER);
if (!Number.isSafeInteger(maxFiles) || maxFiles < 1)
  throw new Error('--max-files must be positive');
if (!Number.isSafeInteger(runs) || runs < 1) throw new Error('--runs must be a positive integer');
const tsconfigs = (value('--tsconfig') ?? 'tsconfig.json')
  .split(',')
  .map(file => path.resolve(project, file));
const ruleSelection = value('--rules') ?? 'recommended';
const rules = ['all', 'recommended'].includes(ruleSelection)
  ? ruleSelection
  : ruleSelection.split(',');
const ruleConfigFile = value('--rule-config') ? path.resolve(value('--rule-config')) : undefined;
const ruleConfig = ruleConfigFile ? JSON.parse(fs.readFileSync(ruleConfigFile, 'utf8')) : undefined;
if (ruleConfig !== undefined && !Array.isArray(ruleConfig))
  throw new Error('--rule-config must contain a RuleConfig array');
const filesystem = value('--fs') ?? 'callbacks';
const nativeBackend = value('--native-backend') ?? 'ts7';
if (!['ts7', 'wasm'].includes(nativeBackend))
  throw new Error('--native-backend must be ts7 or wasm');
const specifications = {
  ts6: { label: 'classic', worker: 'classic', provider: 'ts6' },
  ts7: { label: 'native', worker: 'native', provider: 'ts7' },
  wasm: { label: 'wasm', worker: 'native', provider: 'wasm', bridge: 'syscall' },
  'wasm-direct': { label: 'wasm-direct', worker: 'native', provider: 'wasm', bridge: 'direct' },
};
if (value('--backends') && value('--native-backend'))
  throw new Error('Use either --backends or --native-backend');
const selected = value('--backends')?.split(',');
if (
  selected &&
  (selected.length < 2 ||
    !selected.includes('ts6') ||
    new Set(selected).size !== selected.length ||
    selected.some(key => !specifications[key]))
)
  throw new Error('--backends requires ts6 and unique choices from ts6,ts7,wasm,wasm-direct');
const backends = selected
  ? selected.map(key => specifications[key])
  : [
      specifications.ts6,
      {
        ...specifications[nativeBackend],
        label: 'native',
        bridge:
          nativeBackend === 'wasm' ? (process.env.SONARJS_WASM_BRIDGE ?? 'syscall') : undefined,
      },
    ];
const sampleIntervalMicros = Number(value('--sample-interval-us') ?? 1000);
if (
  !Number.isSafeInteger(sampleIntervalMicros) ||
  sampleIntervalMicros < 100 ||
  sampleIntervalMicros > 10000
)
  throw new Error('--sample-interval-us must be an integer between 100 and 10000');
const allocationIntervalBytes = Number(value('--allocation-interval-bytes') ?? 32768);
if (!Number.isSafeInteger(allocationIntervalBytes) || allocationIntervalBytes < 1024)
  throw new Error('--allocation-interval-bytes must be an integer of at least 1024');
if (
  args.includes('--calibrate') &&
  !args.some(option =>
    ['--profile', '--cpu-profile', '--layer-profile', '--allocation-profile'].includes(option),
  )
)
  throw new Error('--calibrate requires an instrumentation option');
if (!['callbacks', 'layer'].includes(filesystem))
  throw new Error('--fs must be callbacks or layer');
const archiveMode = value('--archive-mode');
if (archiveMode && !['record', 'replay'].includes(archiveMode))
  throw new Error('--archive-mode must be record or replay');
if (archiveMode === 'replay' && !value('--archive-dir'))
  throw new Error('--archive-dir is required for replay');
const archiveDirectory = path.resolve(value('--archive-dir') ?? path.join(output, 'archives'));
fs.mkdirSync(output, { recursive: true });
if (archiveMode === 'record') fs.mkdirSync(archiveDirectory, { recursive: true });
if (
  fs.readdirSync(output).some(file => /(?:summary\.json|-(?:\d+)\.(?:config\.)?json)$/.test(file))
)
  throw new Error('Output already contains a benchmark; preserve earlier evidence');
const repository = path.resolve(directory, '../..');
const git = (root, ...options) => {
  const result = spawnSync('git', ['-C', root, ...options], {
    encoding: 'utf8',
    windowsHide: true,
  });
  return result.status === 0 ? result.stdout.trimEnd() : undefined;
};
const hash = value => createHash('sha256').update(value).digest('hex');
const patch = git(repository, 'diff', '--binary', 'HEAD') ?? '';
fs.writeFileSync(path.join(output, 'candidate.patch'), patch);
const sourceFiles = Object.fromEntries(
  (git(repository, 'ls-files', '--others', '--exclude-standard', '-z') ?? '')
    .split('\0')
    .filter(Boolean)
    .map(file => [file, hash(fs.readFileSync(path.join(repository, file)))]),
);
fs.writeFileSync(
  path.join(output, 'provenance.json'),
  JSON.stringify(
    {
      command: process.argv,
      started: new Date().toISOString(),
      code: {
        head: git(repository, 'rev-parse', 'HEAD'),
        status: git(repository, 'status', '--short'),
        patchSha256: hash(patch),
        untrackedSourceHashes: sourceFiles,
      },
      corpus: {
        project,
        repository: git(project, 'rev-parse', '--show-toplevel'),
        head: git(project, 'rev-parse', 'HEAD'),
        status: git(project, 'status', '--short'),
      },
      rulesSha256: ruleConfigFile ? hash(fs.readFileSync(ruleConfigFile)) : undefined,
      machine: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        release: os.release(),
        cpus: os.cpus().length,
        cpuModel: os.cpus()[0]?.model,
        totalMemoryBytes: os.totalmem(),
        loadAverage: os.loadavg(),
      },
      wasm:
        backends.some(backend => backend.provider === 'wasm') && process.env.SONARJS_TS7_WASM
          ? {
              build: JSON.parse(
                fs.readFileSync(path.join(process.env.SONARJS_TS7_WASM, 'build.json'), 'utf8'),
              ),
              sha256: hash(
                fs.readFileSync(path.join(process.env.SONARJS_TS7_WASM, 'typescript.wasm')),
              ),
            }
          : undefined,
    },
    null,
    2,
  ) + '\n',
);
const results = Object.fromEntries(backends.map(({ label }) => [label, []]));
const controls = Object.fromEntries(backends.map(({ label }) => [label, []]));
const runOrder = [];
for (let run = 0; run < runs; run++) {
  // Latin-square rotation balances positions. A second, reversed block also
  // balances pair ordering for three or more backends (use 2*N repetitions).
  let order = [
    ...backends.slice(run % backends.length),
    ...backends.slice(0, run % backends.length),
  ];
  if (backends.length > 2 && Math.floor(run / backends.length) % 2) order.reverse();
  runOrder.push(order.map(({ label }) => label));
  for (const specification of order) {
    const { label: backend, worker, provider, bridge } = specification;
    for (const control of args.includes('--calibrate')
      ? run % 2
        ? [false, true]
        : [true, false]
      : [false]) {
      const prefix = path.join(output, `${backend}${control ? '-control' : ''}-${run + 1}`);
      const configuration = {
        project,
        tsconfigs,
        rules,
        backend: worker,
        label: backend,
        filesystem,
        maxFiles,
        ruleConfig,
        profile: !control && args.includes('--profile'),
        cpuProfile: !control && args.includes('--cpu-profile') ? `${prefix}.cpuprofile` : undefined,
        layerProfile:
          !control && args.includes('--layer-profile')
            ? `${prefix}.ownership.cpuprofile`
            : undefined,
        control,
        sampleIntervalMicros,
        allocationProfile:
          !control && args.includes('--allocation-profile')
            ? `${prefix}.heapprofile.json`
            : undefined,
        allocationIntervalBytes,
        skipOutsideNodeModules: args.includes('--restrict-node-modules'),
        archiveMode,
        ...(archiveMode
          ? { archive: path.join(archiveDirectory, `${path.basename(prefix)}.pb.gz`) }
          : {}),
      };
      fs.writeFileSync(`${prefix}.config.json`, JSON.stringify(configuration, null, 2));
      const start = performance.now();
      const child = spawnSync(
        process.execPath,
        [
          ...(provider === 'ts7' && value('--native-sdk')
            ? ['--import', pathToFileURL(path.join(directory, 'source-sdk.mjs')).href]
            : []),
          '--import',
          pathToFileURL(
            path.resolve(directory, '../../packages/analysis/src/jsts/native/compatibility.mjs'),
          ).href,
          // Bind routing before Node resolves the worker's static consumer graph.
          '--import',
          'typescript',
          '--import',
          'tsx',
          path.join(directory, 'worker.mjs'),
          `${prefix}.config.json`,
          `${prefix}.json`,
        ],
        {
          encoding: 'utf8',
          windowsHide: true,
          maxBuffer: 32 * 1024 * 1024,
          env: {
            ...process.env,
            SONARJS_TYPESCRIPT_SOURCE: '1',
            SONARJS_TYPESCRIPT_BACKEND: provider,
            ...(bridge ? { SONARJS_WASM_BRIDGE: bridge } : {}),
            ...(value('--native-sdk')
              ? { SONARJS_TS7_SDK: path.resolve(value('--native-sdk')) }
              : {}),
          },
        },
      );
      const wallMs = performance.now() - start;
      fs.writeFileSync(`${prefix}.log`, (child.stdout ?? '') + (child.stderr ?? ''));
      if (child.error || !fs.existsSync(`${prefix}.json`)) {
        throw new Error(
          `Worker failed: ${child.error?.message ?? child.stderr}; see ${prefix}.log`,
        );
      }
      const result = JSON.parse(fs.readFileSync(`${prefix}.json`, 'utf8'));
      if (child.status !== 0) {
        result.valid = false;
        result.errors.push({
          message: `Worker exited with status ${child.status}, signal ${child.signal}`,
        });
      }
      result.timings.workerWallMs = wallMs;
      fs.writeFileSync(`${prefix}.json`, JSON.stringify(result, null, 2) + '\n');
      (control ? controls : results)[backend].push(result);
      console.log(
        `${backend}${control ? ' control' : ''} ${run + 1}/${runs}: ${result.valid ? 'valid' : 'INVALID'}, ${result.files.length} files, ${countIssues(result)} issues, ${result.timings.analysisMs.toFixed(1)} ms`,
      );
      if (!result.valid)
        console.log(
          JSON.stringify(
            {
              errors: result.errors,
              unsupported: result.unsupported,
              checkerFailures: result.checkerFailures,
            },
            null,
            2,
          ),
        );
    }
  }
}
const stable = Object.entries(results).every(([backend, group]) =>
  [...group, ...controls[backend]].every(result => fingerprint(result) === fingerprint(group[0])),
);
const valid = [...Object.values(results), ...Object.values(controls)]
  .flat()
  .every(result => result.valid);
const classic = results.classic[0];
const comparisons = Object.fromEntries(
  Object.entries(results)
    .filter(([backend]) => backend !== 'classic')
    .map(([backend, group]) => [backend, compareResults(classic, group[0])]),
);
const summarize = group => {
  const metric = key => distribution(group.map(result => result.timings[key]));
  return {
    runs: group.length,
    valid: group.every(result => result.valid),
    files: group[0].files.length,
    issues: countIssues(group[0]),
    compilerBackend: group[0].compilerBackend,
    compilerRevision: group[0].compilerRevision,
    versions: group[0].versions,
    ownership: group.every(result => result.ownership)
      ? Object.fromEntries(
          [
            'totalMs',
            'consumerMs',
            'typeScriptMs',
            'compilerMs',
            'hostMs',
            'unattributedMs',
            'reconciliationErrorMs',
          ].map(key => [key, distribution(group.map(result => result.ownership.totals[key]))]),
        )
      : undefined,
    timings: Object.fromEntries(
      [
        'compilerInitializationMs',
        'selectionMs',
        'programMs',
        'parseMs',
        'lintMs',
        'analysisMs',
        'workerWallMs',
      ].map(key => [key, metric(key)]),
    ),
  };
};
const summary = {
  project,
  tsconfigs,
  rules: ruleConfig ? 'custom' : rules,
  ruleConfigFile,
  filesystem,
  nativeBackend,
  backends,
  runOrder,
  instrumentation: {
    metrics: args.includes('--profile'),
    cpu: args.includes('--cpu-profile'),
    ownership: args.includes('--layer-profile'),
    allocation: args.includes('--allocation-profile'),
    allocationIntervalBytes,
    sampleIntervalMicros,
  },
  valid,
  stable,
  ...summarizeComparisons(comparisons),
  comparisons,
  ...Object.fromEntries(
    Object.entries(results).map(([backend, group]) => [backend, summarize(group)]),
  ),
  calibration: args.includes('--calibrate')
    ? Object.fromEntries(
        Object.entries(controls).map(([backend, group]) => [
          backend,
          {
            control: summarize(group),
            instrumentedToControlRatio: distribution(
              group.map(
                (result, index) =>
                  results[backend][index].timings.analysisMs / result.timings.analysisMs,
              ),
            ),
            order: 'control/instrumented on odd rounds; instrumented/control on even rounds',
          },
        ]),
      )
    : undefined,
};
if (summary.native)
  summary.nativeToClassicAnalysisRatio =
    summary.native.timings.analysisMs.median / summary.classic.timings.analysisMs.median;
summary.parityPassed = valid && stable && Object.values(comparisons).every(parityPassed);
fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
for (const [backend, group] of Object.entries(results)) {
  const target = path.join(output, backend, 'lits');
  fs.mkdirSync(target, { recursive: true });
  for (const [rule, files] of Object.entries(group[0].issues)) {
    fs.writeFileSync(
      path.join(target, `${rule}.json`),
      JSON.stringify(
        Object.fromEntries(
          Object.entries(files).map(([file, lines]) => [
            `${path.basename(project)}:${file}`,
            lines,
          ]),
        ),
        null,
        2,
      ) + '\n',
    );
  }
}
console.log(
  `Parity: ${summary.parityPassed ? 'PASS' : 'FAIL'}; report: ${path.join(output, 'summary.json')}`,
);
if (!summary.parityPassed) process.exitCode = 2;

function countIssues(result) {
  return Object.values(result.issues)
    .flatMap(files => Object.values(files))
    .reduce((sum, lines) => sum + lines.length, 0);
}
