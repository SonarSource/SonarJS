import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

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
]);
const flagOptions = new Set(['--restrict-node-modules', '--profile', '--cpu-profile', '--help']);
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
const results = { classic: [], native: [] };
for (let run = 0; run < runs; run++) {
  // Alternate order to reduce systematic filesystem-cache warmup bias.
  for (const backend of run % 2 ? ['native', 'classic'] : ['classic', 'native']) {
    const prefix = path.join(output, `${backend}-${run + 1}`);
    const configuration = {
      project,
      tsconfigs,
      rules,
      backend,
      filesystem,
      maxFiles,
      ruleConfig,
      profile: args.includes('--profile'),
      cpuProfile: args.includes('--cpu-profile') ? `${prefix}.cpuprofile` : undefined,
      skipOutsideNodeModules: args.includes('--restrict-node-modules'),
      archiveMode,
      ...(archiveMode
        ? { archive: path.join(archiveDirectory, `${backend}-${run + 1}.pb.gz`) }
        : {}),
    };
    fs.writeFileSync(`${prefix}.config.json`, JSON.stringify(configuration, null, 2));
    const start = performance.now();
    const child = spawnSync(
      process.execPath,
      [
        ...(backend === 'native' && nativeBackend === 'ts7' && value('--native-sdk')
          ? ['--import', pathToFileURL(path.join(directory, 'source-sdk.mjs')).href]
          : []),
        '--import',
        pathToFileURL(
          path.resolve(directory, '../../packages/analysis/src/jsts/native/compatibility.mjs'),
        ).href,
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
          SONARJS_TYPESCRIPT_BACKEND: backend === 'classic' ? 'ts6' : nativeBackend,
          ...(value('--native-sdk')
            ? { SONARJS_TS7_SDK: path.resolve(value('--native-sdk')) }
            : {}),
        },
      },
    );
    const wallMs = performance.now() - start;
    fs.writeFileSync(`${prefix}.log`, (child.stdout ?? '') + (child.stderr ?? ''));
    if (child.error || !fs.existsSync(`${prefix}.json`)) {
      throw new Error(`Worker failed: ${child.error?.message ?? child.stderr}; see ${prefix}.log`);
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
    results[backend].push(result);
    console.log(
      `${backend} ${run + 1}/${runs}: ${result.valid ? 'valid' : 'INVALID'}, ${result.files.length} files, ${countIssues(result)} issues, ${result.timings.analysisMs.toFixed(1)} ms`,
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
const canonical = value =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, item]) => [key, canonical(item)]),
        )
      : value;
const fingerprint = result =>
  JSON.stringify(
    canonical({
      files: result.files,
      issues: result.issues,
      activeRules: result.activeRules,
      sourceHashes: result.sourceHashes,
    }),
  );
const stable = Object.values(results).every(group =>
  group.every(result => fingerprint(result) === fingerprint(group[0])),
);
const valid = Object.values(results)
  .flat()
  .every(result => result.valid);
const differences = [];
const classic = results.classic[0];
const native = results.native[0];
for (const rule of new Set([...Object.keys(classic.issues), ...Object.keys(native.issues)])) {
  for (const file of new Set([
    ...Object.keys(classic.issues[rule] ?? {}),
    ...Object.keys(native.issues[rule] ?? {}),
  ])) {
    const before = classic.issues[rule]?.[file] ?? [];
    const after = native.issues[rule]?.[file] ?? [];
    if (JSON.stringify(before) !== JSON.stringify(after))
      differences.push({ rule, file, classic: before, native: after });
  }
}
const summarize = group => {
  const metric = key => {
    const values = group
      .map(result => result.timings[key])
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    return {
      median:
        values.length % 2
          ? values[Math.floor(values.length / 2)]
          : (values[values.length / 2 - 1] + values[values.length / 2]) / 2,
      min: values[0],
      max: values.at(-1),
    };
  };
  return {
    runs: group.length,
    valid: group.every(result => result.valid),
    files: group[0].files.length,
    issues: countIssues(group[0]),
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
  instrumentation: { metrics: args.includes('--profile'), cpu: args.includes('--cpu-profile') },
  valid,
  stable,
  filesMatch: JSON.stringify(classic.files) === JSON.stringify(native.files),
  sourceTextsMatch:
    JSON.stringify(canonical(classic.sourceHashes)) ===
    JSON.stringify(canonical(native.sourceHashes)),
  activeRulesMatch:
    JSON.stringify(canonical(classic.activeRules)) ===
    JSON.stringify(canonical(native.activeRules)),
  issueLinesMatch: differences.length === 0,
  differences,
  classic: summarize(results.classic),
  native: summarize(results.native),
};
summary.nativeToClassicAnalysisRatio =
  summary.native.timings.analysisMs.median / summary.classic.timings.analysisMs.median;
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
  `Parity: ${valid && stable && summary.filesMatch && summary.sourceTextsMatch && summary.activeRulesMatch && summary.issueLinesMatch ? 'PASS' : 'FAIL'}; report: ${path.join(output, 'summary.json')}`,
);
if (!(
  valid &&
  stable &&
  summary.filesMatch &&
  summary.sourceTextsMatch &&
  summary.activeRulesMatch &&
  summary.issueLinesMatch
))
  process.exitCode = 2;

function countIssues(result) {
  return Object.values(result.issues)
    .flatMap(files => Object.values(files))
    .reduce((sum, lines) => sum + lines.length, 0);
}
