import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, compareResults, distribution, fingerprint } from './results.mjs';

const stats = (reports, read) => distribution(reports.map(read));

export function comparePerformance(reports, additionalReports = []) {
  if (!reports.length || reports.some(report => !report.valid))
    throw new Error('Expected valid worker reports');
  const labels = [...new Set(reports.map(report => report.label ?? report.backend))];
  if (!labels.includes('classic') || labels.length < 2)
    throw new Error('Expected TS6 plus another backend');
  const reference = reports[0];
  const all = [...reports, ...additionalReports];
  const mismatches = all
    .filter(report => fingerprint(report) !== fingerprint(reference))
    .map(report => ({
      report: report.reportPath,
      ...compareResults(reference, report),
    }));
  const sameVersions = all.every(
    report =>
      JSON.stringify(canonical(report.versions)) === JSON.stringify(canonical(reference.versions)),
  );
  const goRevisions = [
    ...new Set(
      all.filter(report => report.compilerBackend !== 'ts6').map(report => report.compilerRevision),
    ),
  ];
  const controls = {};
  const measured = {};
  const backends = {};
  if (
    additionalReports.some(
      report =>
        !report.profile || (report.compilerBackend !== 'ts6' && !report.profile.matchesSdkTotals),
    )
  )
    throw new Error('Expected separate --profile reports with matching SDK counters');
  for (const label of labels) {
    const group = reports.filter(report => (report.label ?? report.backend) === label);
    controls[label] = group.filter(report => report.control);
    measured[label] = group.filter(report => !report.control);
    if (
      !controls[label].length ||
      !measured[label].length ||
      measured[label].some(report => !report.ownership)
    )
      throw new Error(`Missing --layer-profile --calibrate reports for ${label}`);
    if (group.some(report => report.compilerRevision !== group[0].compilerRevision))
      throw new Error(`Compiler revision changed within ${label}`);
    const controlByRound = new Map(controls[label].map(report => [report.round, report]));
    if (
      controlByRound.size !== measured[label].length ||
      measured[label].some(report => !controlByRound.has(report.round))
    )
      throw new Error(`Unpaired calibration rounds for ${label}`);
    if (
      controls[label].some(
        report =>
          report.instrumentation?.metrics ||
          report.instrumentation?.cpu ||
          report.instrumentation?.ownership ||
          report.instrumentation?.allocation,
      )
    )
      throw new Error(`Instrumented control for ${label}`);
    const diagnostics = additionalReports.filter(
      report => (report.label ?? report.backend) === label,
    );
    if (additionalReports.length && !diagnostics.length)
      throw new Error(`Missing separate --profile reports for ${label}`);
    const diagnosticSection = (section, keys, sortBy) =>
      [...new Set(diagnostics.flatMap(report => Object.keys(report.profile[section] ?? {})))]
        .map(name => ({
          name,
          ...Object.fromEntries(
            keys.map(key => [
              key,
              stats(diagnostics, report => report.profile[section][name]?.[key] ?? 0),
            ]),
          ),
        }))
        .sort((a, b) => b[sortBy].median - a[sortBy].median);
    backends[label] = {
      compiler: {
        backend: group[0].compilerBackend,
        version: group[0].compilerVersion,
        revision: group[0].compilerRevision,
        bridge: group[0].wasmBridge,
      },
      controlTimings: Object.fromEntries(
        Object.keys(group[0].timings).map(key => [
          key,
          stats(controls[label], report => report.timings[key]),
        ]),
      ),
      sampledTotals: Object.fromEntries(
        Object.keys(measured[label][0].ownership.totals).map(key => [
          key,
          stats(measured[label], report => report.ownership.totals[key]),
        ]),
      ),
      observedInstrumentationRatio: stats(
        measured[label],
        report => report.timings.analysisMs / controlByRound.get(report.round)?.timings.analysisMs,
      ),
      phases: Object.fromEntries(
        [...new Set(measured[label].flatMap(report => Object.keys(report.ownership.phases)))].map(
          phase => [
            phase,
            Object.fromEntries(
              ['totalMs', 'consumerMs', 'typeScriptMs', 'hostMs', 'unattributedMs'].map(key => [
                key,
                stats(measured[label], report => report.ownership.phases[phase]?.[key] ?? 0),
              ]),
            ),
          ],
        ),
      ),
      components: Object.fromEntries(
        [
          ...new Set(measured[label].flatMap(report => Object.keys(report.ownership.components))),
        ].map(key => [
          key,
          stats(measured[label], report => report.ownership.components[key] ?? 0),
        ]),
      ),
      unattributedReasons: Object.fromEntries(
        [
          ...new Set(
            measured[label].flatMap(report => Object.keys(report.ownership.unattributedReasons)),
          ),
        ].map(key => [
          key,
          stats(measured[label], report => report.ownership.unattributedReasons[key] ?? 0),
        ]),
      ),
      sampling: Object.fromEntries(
        ['samples', 'medianIntervalMs', 'p95IntervalMs', 'maxIntervalMs'].map(key => [
          key,
          stats(measured[label], report => report.ownership.sampling[key]),
        ]),
      ),
      callbacks: Object.fromEntries(
        [
          ...new Set(measured[label].flatMap(report => Object.keys(report.hostCallbacks ?? {}))),
        ].map(callback => [
          callback,
          Object.fromEntries(
            ['calls', 'failures', 'returnedBytes', 'returnedEntries', 'inclusiveMs'].map(key => [
              key,
              stats(measured[label], report => report.hostCallbacks?.[callback]?.[key] ?? 0),
            ]),
          ),
        ]),
      ),
      // These are nested measurements with a different scope; never subtract
      // them from total analysis to manufacture a consumer-time estimate.
      sdk:
        group[0].compilerBackend !== 'ts6'
          ? Object.fromEntries(
              [
                'requestCount',
                'bytesSent',
                'bytesReceived',
                'roundTripMs',
                'serverTimeMs',
                'transportOverheadMs',
              ].map(key => [key, stats(controls[label], report => report.ipc?.totals[key])]),
            )
          : undefined,
      consumerSources: [],
      allocations:
        diagnostics.length && diagnostics.every(report => report.allocations)
          ? {
              runs: diagnostics.length,
              estimatedBytes: stats(diagnostics, report => report.allocations.estimatedBytes),
              gcDurationMs: stats(diagnostics, report => report.allocations.gc.durationMs),
              gcCount: stats(diagnostics, report => report.allocations.gc.count),
              owners: Object.fromEntries(
                [
                  ...new Set(diagnostics.flatMap(report => Object.keys(report.allocations.owners))),
                ].map(key => [
                  key,
                  stats(diagnostics, report => report.allocations.owners[key] ?? 0),
                ]),
              ),
            }
          : undefined,
      detailed: diagnostics.length
        ? {
            runs: diagnostics.length,
            analysisMs: stats(diagnostics, report => report.timings.analysisMs),
            listenerCalls: stats(diagnostics, report =>
              Object.values(report.profile.rules).reduce(
                (sum, rule) => sum + (rule.listenerCalls ?? 0),
                0,
              ),
            ),
            batchCalls: stats(diagnostics, report => report.profile.batches?.calls ?? 0),
            batchedLogicalQueries: stats(
              diagnostics,
              report => report.profile.batches?.logicalRequests ?? 0,
            ),
            methods: diagnosticSection(
              'methods',
              ['requestCount', 'roundTripMs', 'bytesSent', 'bytesReceived'],
              'roundTripMs',
            ),
            rules: diagnosticSection(
              'rules',
              ['listenerCalls', 'exclusiveMs', 'requestCount', 'roundTripMs'],
              'exclusiveMs',
            ),
          }
        : undefined,
    };
  }
  const consumerSources = [
    ...new Set(
      reports.flatMap(report =>
        (report.ownership?.sources ?? [])
          .filter(source => source.owner === 'consumer')
          .map(source => source.source),
      ),
    ),
  ];
  for (const label of labels) {
    backends[label].consumerSources = consumerSources
      .map(source => {
        const metric = backend =>
          stats(
            measured[backend],
            report =>
              report.ownership.sources.find(
                value => value.owner === 'consumer' && value.source === source,
              )?.ms ?? 0,
          );
        const value = metric(label);
        return { source, ms: value, deltaFromTs6Ms: value.median - metric('classic').median };
      })
      .sort((a, b) => b.deltaFromTs6Ms - a.deltaFromTs6Ms);
  }
  const countersMatch = (group, read) =>
    group.length > 0 &&
    group.every(
      report =>
        JSON.stringify(canonical(read(report))) === JSON.stringify(canonical(read(group[0]))),
    );
  return {
    schemaVersion: 1,
    parityPassed:
      all.every(report => report.valid) &&
      !mismatches.length &&
      sameVersions &&
      goRevisions.length === 1 &&
      !!goRevisions[0],
    parity: {
      files: reference.files.length,
      issues: Object.values(reference.issues)
        .flatMap(files => Object.values(files))
        .reduce((sum, lines) => sum + lines.length, 0),
      richDiagnosticGates: [
        'messages',
        'primary locations',
        'secondary locations',
        'fixes/suggestions',
        'suppressed issues',
        'duplicate multiplicity',
      ],
      mismatches,
      sameVersions,
      matchedGoRevision: goRevisions.length === 1 ? goRevisions[0] : null,
    },
    diagnosticWorkload: additionalReports.length
      ? {
          listenerCountsMatch: countersMatch(additionalReports, report =>
            Object.fromEntries(
              Object.entries(report.profile.rules).map(([rule, counts]) => [
                rule,
                { create: counts.createCalls ?? 0, listeners: counts.listenerCalls ?? 0 },
              ]),
            ),
          ),
          goQueryCountsMatch: countersMatch(
            additionalReports.filter(report => report.compilerBackend !== 'ts6'),
            report => ({
              methods: Object.fromEntries(
                Object.entries(report.profile.methods).map(([method, counts]) => [
                  method,
                  counts.requestCount,
                ]),
              ),
              batches: report.profile.batches,
            }),
          ),
        }
      : undefined,
    interpretation: [
      'Use uninstrumented controls for end-to-end runtime. Sampling estimates are for attribution and are not exact method timings.',
      'Controls are adjacent fresh workers in alternating order. Their range and paired ratios expose run drift and profiling overhead; do not subtract a global overhead percentage from ownership buckets.',
      'Per-column medians need not sum. Individual worker totals reconcile; source policy, long gaps, GC, measurement and unknown time remain visible.',
      'SDK/Go timers and host inclusive durations are nested, not additive to exclusive TS-layer or consumer totals.',
      'Outside-layer parity is not automatically accepted by this report. Persistent consumer differences need per-path investigation and separate CPU/allocation evidence.',
      'This is cold batch analysis. Retained IDE update performance and broader framework coverage remain separate gates.',
    ],
    backends,
  };
}

export function renderComparison(result) {
  const fixed = value => (Number.isFinite(value) ? value.toFixed(2) : 'n/a');
  const cell = value =>
    value ? `${fixed(value.median)} [${fixed(value.min)}–${fixed(value.max)}]` : 'n/a';
  const labels = Object.keys(result.backends);
  const table = (headers, rows) =>
    [headers.join(' | '), headers.map(() => '---').join(' | '), ...rows.map(row => row.join(' | '))]
      .map(line => `| ${line} |`)
      .join('\n');
  const lines = [
    '# Compiler backend comparison',
    '',
    `Result parity: **${result.parityPassed ? 'PASS' : 'FAIL'}**; ${result.parity.files} files, ${result.parity.issues} issue locations, full normalized diagnostics and suppressions.`,
    '',
    'Times below are milliseconds, shown as median [min–max].',
    '',
    table(
      [
        'Backend',
        'Unprofiled analysis',
        'Sampled analysis',
        'Consumer (sampled)',
        'Whole TS layer (sampled)',
        'Unattributed',
        'Observed profiling/control ratio',
      ],
      labels.map(label => {
        const value = result.backends[label];
        return [
          label,
          cell(value.controlTimings.analysisMs),
          cell(value.sampledTotals.totalMs),
          cell(value.sampledTotals.consumerMs),
          cell(value.sampledTotals.typeScriptMs),
          cell(value.sampledTotals.unattributedMs),
          cell(value.observedInstrumentationRatio),
        ];
      }),
    ),
    '',
    '## Phases',
    '',
    table(
      [
        'Backend / phase',
        'Total',
        'Consumer',
        'Whole TS layer',
        'Nested host services',
        'Unattributed',
      ],
      labels.flatMap(label =>
        Object.entries(result.backends[label].phases).map(([phase, values]) => [
          `${label} / ${phase}`,
          ...['totalMs', 'consumerMs', 'typeScriptMs', 'hostMs', 'unattributedMs'].map(key =>
            cell(values[key]),
          ),
        ]),
      ),
    ),
    '',
    '## Consumer source paths with the largest sampled differences from TS6',
    '',
  ];
  for (const label of labels.filter(label => label !== 'classic')) {
    lines.push(
      `### ${label}`,
      '',
      table(
        ['Source', 'Sampled ms', 'Delta from TS6 ms'],
        result.backends[label].consumerSources
          .slice(0, 10)
          .map(source => [`\`${source.source}\``, cell(source.ms), fixed(source.deltaFromTs6Ms)]),
      ),
      '',
    );
  }
  lines.push(
    '## Nested compiler / bridge measurements',
    '',
    'SDK times below come from unprofiled controls. They overlap the whole TS layer; they are not extra top-level costs.',
    '',
    table(
      [
        'Backend',
        'Requests',
        'Sent bytes',
        'Received bytes',
        'SDK round trip ms',
        'Go handler ms',
        'Boundary remainder ms',
      ],
      labels
        .filter(label => result.backends[label].sdk)
        .map(label => {
          const sdk = result.backends[label].sdk;
          return [
            label,
            ...[
              'requestCount',
              'bytesSent',
              'bytesReceived',
              'roundTripMs',
              'serverTimeMs',
              'transportOverheadMs',
            ].map(key => cell(sdk[key])),
          ];
        }),
    ),
    '',
    '## Host callback workload',
    '',
    'Exact counts and returned UTF-8 bytes; callback durations are inclusive and can overlap nested compiler work.',
    '',
    table(
      [
        'Backend / callback',
        'Calls',
        'Returned bytes',
        'Returned entries',
        'Failures',
        'Inclusive ms',
      ],
      labels.flatMap(label =>
        Object.entries(result.backends[label].callbacks).map(([callback, values]) => [
          `${label} / ${callback}`,
          ...['calls', 'returnedBytes', 'returnedEntries', 'failures', 'inclusiveMs'].map(key =>
            cell(values[key]),
          ),
        ]),
      ),
    ),
    '',
  );
  if (labels.some(label => result.backends[label].detailed)) {
    lines.push(
      '## Separate instrumented diagnostics',
      '',
      'These rule and SDK timers come from separate workers. Rule exclusive time only subtracts nested SDK requests; it still includes facade/adapters and is not outside-layer consumer time.',
      '',
      `Per-rule creation/listener counts match: **${result.diagnosticWorkload.listenerCountsMatch}**. Go SDK method/batch query counts match: **${result.diagnosticWorkload.goQueryCountsMatch}**. Equal counts alone do not establish equal internal work.`,
      '',
      table(
        ['Backend', 'Listener calls', 'Batches', 'Logical queries in batches'],
        labels.map(label => {
          const value = result.backends[label].detailed;
          return [
            label,
            ...['listenerCalls', 'batchCalls', 'batchedLogicalQueries'].map(key =>
              cell(value?.[key]),
            ),
          ];
        }),
      ),
      '',
    );
    for (const label of labels) {
      const detailed = result.backends[label].detailed;
      if (!detailed) continue;
      lines.push(
        `### ${label}: ${detailed.runs} diagnostic runs`,
        '',
        table(
          ['SDK method', 'Requests', 'Round trip ms', 'Sent bytes', 'Received bytes'],
          detailed.methods
            .slice(0, 10)
            .map(method => [
              method.name,
              ...['requestCount', 'roundTripMs', 'bytesSent', 'bytesReceived'].map(key =>
                cell(method[key]),
              ),
            ]),
        ),
        '',
        table(
          ['Rule', 'Listener calls', 'Rule exclusive ms', 'SDK requests', 'SDK round trip ms'],
          detailed.rules
            .slice(0, 10)
            .map(rule => [
              rule.name,
              ...['listenerCalls', 'exclusiveMs', 'requestCount', 'roundTripMs'].map(key =>
                cell(rule[key]),
              ),
            ]),
        ),
        '',
      );
    }
  }
  if (labels.some(label => result.backends[label].allocations)) {
    lines.push(
      '## Separate allocation and GC diagnostics',
      '',
      'Weighted V8 allocation estimates include collected objects. These are diagnostic runs, not runtime measurements, exact allocated bytes or causal GC attribution. Go allocations and WASM linear memory are excluded.',
      '',
      table(
        ['Backend', 'Estimated JS allocation bytes', 'GC events', 'Observed GC ms'],
        labels.map(label => {
          const value = result.backends[label].allocations;
          return [
            label,
            ...['estimatedBytes', 'gcCount', 'gcDurationMs'].map(key => cell(value?.[key])),
          ];
        }),
      ),
      '',
    );
  }
  lines.push('## Limits', '', ...result.interpretation.map(line => `- ${line}`), '');
  return lines.join('\n');
}

function readReports(directory) {
  return fs
    .readdirSync(directory)
    .filter(file => /-\d+\.json$/.test(file))
    .map(file => ({
      ...JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')),
      reportPath: path.join(path.resolve(directory), file),
      round: Number(file.match(/-(\d+)\.json$/)[1]),
    }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [directory, metricsDirectory] = process.argv.slice(2);
  if (!directory)
    throw new Error(
      'Usage: node compare-performance.mjs CALIBRATED_DIRECTORY [SDK_METRICS_DIRECTORY]',
    );
  const result = comparePerformance(
    readReports(directory),
    metricsDirectory ? readReports(metricsDirectory) : [],
  );
  fs.writeFileSync(path.join(directory, 'comparison.json'), JSON.stringify(result, null, 2) + '\n');
  fs.writeFileSync(path.join(directory, 'comparison.md'), renderComparison(result));
  console.log(
    `Parity: ${result.parityPassed ? 'PASS' : 'FAIL'}; ${path.resolve(directory, 'comparison.md')}`,
  );
  if (!result.parityPassed) process.exitCode = 2;
}
