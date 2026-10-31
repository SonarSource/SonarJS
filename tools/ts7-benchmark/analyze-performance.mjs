import fs from 'node:fs';
import path from 'node:path';
import { fingerprint } from './results.mjs';

const [metricsDirectory, baselineDirectory, cpuDirectory] = process.argv.slice(2);
if (!metricsDirectory || !baselineDirectory)
  throw new Error(
    'Usage: node analyze-performance.mjs METRICS_DIRECTORY BASELINE_DIRECTORY [CPU_DIRECTORY]',
  );
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const reports = directory =>
  fs
    .readdirSync(directory)
    .filter(file => /^(classic|native)-\d+\.json$/.test(file))
    .map(file => read(path.join(directory, file)));
const metrics = reports(metricsDirectory);
if (!metrics.length || metrics.some(report => !report.valid || !report.profile))
  throw new Error('Expected valid --profile worker reports');
const median = values => {
  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
};
const group = backend => metrics.filter(report => report.backend === backend);
if (!group('classic').length || !group('native').length)
  throw new Error('Both backend reports are required');
const stat = (backend, section, key, metric) =>
  median(group(backend).map(report => report.profile[section][key]?.[metric] ?? 0));
const allReports = [
  ...metrics,
  ...reports(baselineDirectory),
  ...(cpuDirectory ? reports(cpuDirectory) : []),
];
const result = {
  crossModeParity: allReports.every(
    report => report.valid && fingerprint(report) === fingerprint(allReports[0]),
  ),
  sdkCountersMatch: group('native').every(report => report.profile.matchesSdkTotals),
  baseline: read(path.join(baselineDirectory, 'summary.json')),
  instrumented: read(path.join(metricsDirectory, 'summary.json')),
  nativeIpc: Object.fromEntries(
    [
      'requestCount',
      'roundTripMs',
      'serverTimeMs',
      'transportOverheadMs',
      'bytesSent',
      'bytesReceived',
    ].map(key => [key, median(group('native').map(report => report.ipc.totals[key]))]),
  ),
  nativeMethods: [
    ...new Set(group('native').flatMap(report => Object.keys(report.profile.methods))),
  ]
    .map(method => ({
      method,
      ...Object.fromEntries(
        ['requestCount', 'roundTripMs', 'bytesSent', 'bytesReceived'].map(key => [
          key,
          stat('native', 'methods', method, key),
        ]),
      ),
    }))
    .sort((a, b) => b.roundTripMs - a.roundTripMs),
  nativePhases: Object.fromEntries(
    [...new Set(group('native').flatMap(report => Object.keys(report.profile.phases)))].map(
      phase => [
        phase,
        {
          requestCount: stat('native', 'phases', phase, 'requestCount'),
          roundTripMs: stat('native', 'phases', phase, 'roundTripMs'),
        },
      ],
    ),
  ),
  ruleCosts: [...new Set(metrics.flatMap(report => Object.keys(report.profile.rules)))]
    .map(rule => {
      const classicMs = stat('classic', 'rules', rule, 'exclusiveMs');
      const nativeMs = stat('native', 'rules', rule, 'exclusiveMs');
      return {
        rule,
        classicMs,
        nativeMs,
        deltaMs: nativeMs - classicMs,
        nativeRoundTripMs: stat('native', 'rules', rule, 'roundTripMs'),
        nativeRequests: stat('native', 'rules', rule, 'requestCount'),
        listenerCalls: stat('native', 'rules', rule, 'listenerCalls'),
      };
    })
    .sort((a, b) => b.deltaMs - a.deltaMs),
  nativeBatches: group('native').map(report => report.profile.batches),
  callbackTotals: Object.fromEntries(
    ['classic', 'native'].map(backend => [
      backend,
      {
        medianExclusiveMs: median(
          group(backend).map(report =>
            Object.values(report.profile.rules).reduce((sum, rule) => sum + rule.exclusiveMs, 0),
          ),
        ),
        medianListenerCalls: median(
          group(backend).map(report =>
            Object.values(report.profile.rules).reduce((sum, rule) => sum + rule.listenerCalls, 0),
          ),
        ),
      },
    ]),
  ),
  cpu: cpuDirectory
    ? reports(cpuDirectory).map(report => ({
        backend: report.backend,
        timings: report.timings,
        ipc: report.ipc,
        cpu: report.cpuProfile,
      }))
    : undefined,
};
const target = path.join(metricsDirectory, 'performance-summary.json');
fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n');
console.log(
  `Cross-mode parity: ${result.crossModeParity ? 'PASS' : 'FAIL'}; SDK counters: ${result.sdkCountersMatch ? 'PASS' : 'FAIL'}; ${target}`,
);
if (!result.crossModeParity || !result.sdkCountersMatch) process.exitCode = 2;
