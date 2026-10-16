import { createHash } from 'node:crypto';
import { canonical, distribution } from './results.mjs';

const comparedFields = [
  'files',
  'sourceHashes',
  'activeRules',
  'issues',
  'diagnostics',
  'programInputs',
  'configuration',
  'ruleConfigurationHash',
  'resultFiles',
  'noProgramFiles',
];

export function rulingDifferences(reference, candidate) {
  const before = fieldHashes(reference),
    after = fieldHashes(candidate);
  return comparedFields.filter(key => before[key] !== after[key]);
}

const fieldHashes = report =>
  report.fingerprintHashes ??
  Object.fromEntries(
    comparedFields.map(key => [
      key,
      createHash('sha256')
        .update(JSON.stringify(canonical(report[key])) ?? 'undefined')
        .digest('hex'),
    ]),
  );

/** Keep aggregate memory bounded; full diagnostics remain in each raw worker report. */
export function compactRulingReport(report) {
  const {
    project,
    backend,
    round,
    valid,
    errors,
    timings,
    issueCount,
    parsingErrors,
    reportPath,
    timedOut,
  } = report;
  return {
    project,
    backend,
    round,
    valid,
    errors,
    timings,
    issueCount,
    parsingErrors,
    reportPath,
    timedOut,
    fileCount: report.fileCount ?? report.files?.length,
    fingerprintHashes: fieldHashes(report),
  };
}

export const rulingFingerprint = report => JSON.stringify(canonical(fieldHashes(report)));

export function summarizeRuling(plan, reports) {
  const seen = new Set();
  for (const report of reports) {
    const key = JSON.stringify([report.project, report.backend, report.round]);
    if (seen.has(key)) throw new Error(`Duplicate worker: ${key}`);
    if (
      !plan.projects.some(p => p.active && p.name === report.project) ||
      !plan.backends.includes(report.backend) ||
      !Number.isInteger(report.round) ||
      report.round < 1 ||
      report.round > plan.runs
    )
      throw new Error(`Unexpected worker: ${key}`);
    seen.add(key);
  }
  const rows = plan.projects
    .filter(p => p.active)
    .map(project => {
      const group = reports.filter(r => r.project === project.name);
      const byBackend = Object.fromEntries(
        plan.backends.map(backend => {
          const workers = group.filter(r => r.backend === backend);
          return [
            backend,
            {
              completed: workers.length,
              valid: workers.length === plan.runs && workers.every(r => r.valid),
              pipelineCompleted:
                workers.length === plan.runs &&
                workers.every(r => Number.isFinite(r.timings?.analysisMs)),
              files: workers[0]?.fileCount ?? workers[0]?.files?.length,
              issues: workers[0]?.issueCount,
              parsingErrors: workers[0]?.parsingErrors,
              analysisMs: distribution(workers.map(r => r.timings?.analysisMs)),
              discoveryMs: distribution(workers.map(r => r.timings?.discoveryMs)),
              projectMs: distribution(workers.map(r => r.timings?.projectMs)),
              workerWallMs: distribution(workers.map(r => r.timings?.workerWallMs)),
              failures: workers
                .filter(r => !r.valid)
                .map(r => ({
                  round: r.round,
                  errors: r.errors,
                  report: r.reportPath,
                  timedOut: r.timedOut,
                  workerWallMs: r.timings?.workerWallMs,
                })),
            },
          ];
        }),
      );
      const complete = plan.backends.every(b => byBackend[b].completed === plan.runs);
      const valid = complete && plan.backends.every(b => byBackend[b].valid);
      const reference = group.find(r => r.backend === 'ts6' && r.valid);
      const mismatches = reference
        ? group
            .filter(r => r.valid && rulingFingerprint(r) !== rulingFingerprint(reference))
            .map(r => ({
              backend: r.backend,
              round: r.round,
              report: r.reportPath,
              fields: rulingDifferences(reference, r),
            }))
        : [];
      return {
        name: project.name,
        complete,
        valid,
        parityPassed: plan.backends.length > 1 && valid && !mismatches.length,
        mismatches,
        backends: byBackend,
      };
    });
  const cohortTotals = (cohort, selectedBackends = plan.backends) =>
    Object.fromEntries(
      selectedBackends.map(backend => [
        backend,
        {
          projects: cohort.length,
          analysisMs: cohort.length
            ? distribution(
                Array.from({ length: plan.runs }, (_, i) =>
                  cohort.reduce(
                    (sum, p) =>
                      sum +
                      reports.find(
                        r => r.project === p.name && r.backend === backend && r.round === i + 1,
                      ).timings.analysisMs,
                    0,
                  ),
                ),
              )
            : null,
          workerWallMs: cohort.length
            ? distribution(
                Array.from({ length: plan.runs }, (_, i) =>
                  cohort.reduce(
                    (sum, p) =>
                      sum +
                      reports.find(
                        r => r.project === p.name && r.backend === backend && r.round === i + 1,
                      ).timings.workerWallMs,
                    0,
                  ),
                ),
              )
            : null,
        },
      ]),
    );
  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    plannedProjects: rows.length,
    plannedWorkers: rows.length * plan.backends.length * plan.runs,
    completedWorkers: reports.length,
    complete: rows.every(p => p.complete),
    allValid: rows.every(p => p.valid),
    parityPassed: rows.every(p => p.parityPassed),
    validProjects: rows.filter(p => p.valid).length,
    parityProjects: rows.filter(p => p.parityPassed).length,
    observedValidCohort: cohortTotals(rows.filter(p => p.valid)),
    comparableCohort: cohortTotals(rows.filter(p => p.parityPassed)),
    completedPipelineCohort: cohortTotals(
      rows.filter(p => plan.backends.every(b => p.backends[b].pipelineCompleted)),
    ),
    providerCoverage: Object.fromEntries(
      plan.backends.map(backend => [
        backend,
        cohortTotals(
          rows.filter(p => p.backends[backend].pipelineCompleted),
          [backend],
        )[backend],
      ]),
    ),
    pairwise: Object.fromEntries(
      plan.backends
        .filter(b => b !== 'ts6')
        .map(backend => {
          const valid = rows.filter(p => p.backends.ts6.valid && p.backends[backend].valid);
          const comparable = valid.filter(
            p => !p.mismatches.some(m => m.backend === 'ts6' || m.backend === backend),
          );
          return [
            backend,
            {
              observed: cohortTotals(valid, ['ts6', backend]),
              comparable: cohortTotals(comparable, ['ts6', backend]),
            },
          ];
        }),
    ),
    inactiveProjects: plan.projects.filter(p => !p.active).map(p => p.name),
    projects: rows,
  };
}

export function renderRuling(summary, plan) {
  const fmt = d =>
    d
      ? `${(d.median / 1000).toFixed(3)}${d.count > 1 ? ` [${(d.min / 1000).toFixed(3)}–${(d.max / 1000).toFixed(3)}]` : ''}`
      : '—';
  const table = (heads, rows) =>
    [heads, heads.map(() => '---'), ...rows].map(r => '| ' + r.join(' | ') + ' |').join('\n');
  return [
    '# Complete ruling benchmark',
    '',
    `Workers: ${summary.completedWorkers}/${summary.plannedWorkers}. Complete projects: ${summary.projects.filter(p => p.complete).length}/${summary.plannedProjects}; valid: ${summary.validProjects}; full parity: ${summary.parityProjects}.`,
    `Full-suite parity: **${summary.parityPassed ? 'PASS' : 'NOT PASSED'}**. Times are seconds; ${plan.runs > 1 ? 'median [min–max]' : 'single observations'}; ${plan.runs} fresh-worker round(s).`,
    '',
    '## Overall timings',
    '',
    summary.complete && summary.allValid
      ? 'Observed totals cover the full planned suite.'
      : 'The full suite is incomplete or contains failures. Totals below cover only the stated common cohort; they are not full-suite performance results.',
    '',
    table(
      [
        'Backend',
        'Valid projects',
        'Observed analysis total',
        'Parity projects',
        'Comparable analysis total',
        'Comparable worker wall total',
      ],
      plan.backends.map(b => [
        b,
        String(summary.observedValidCohort[b].projects),
        fmt(summary.observedValidCohort[b].analysisMs),
        String(summary.comparableCohort[b].projects),
        fmt(summary.comparableCohort[b].analysisMs),
        fmt(summary.comparableCohort[b].workerWallMs),
      ]),
    ),
    '',
    'Each total is the sum of project times within the same repetition, followed by a distribution across repetitions. It is not an average of project speed ratios or a sum of project medians. Worker wall time includes startup/reporting; analysis includes discovery and the production project pipeline, including its normal cleanup.',
    '',
    '## Coverage and completed pipeline times',
    '',
    'The totals below include completed pipelines with reported file/linter errors or recovered configuration failures. Different project counts are not comparable performance totals; aborted pipelines have no invented analysis duration.',
    '',
    table(
      [
        'Backend',
        'Completed projects',
        'Completed analysis total',
        'Common completed projects',
        'Common completed analysis total',
      ],
      plan.backends.map(b => [
        b,
        String(summary.providerCoverage[b].projects),
        fmt(summary.providerCoverage[b].analysisMs),
        String(summary.completedPipelineCohort[b].projects),
        fmt(summary.completedPipelineCohort[b].analysisMs),
      ]),
    ),
    '',
    '## Pairwise valid totals',
    '',
    'Each row uses all projects valid for that candidate and TS6, independently of other candidates. This prevents another provider failure from removing an outlier from the pair. Result/input mismatches remain visible; these observations do not establish equivalent output.',
    '',
    table(
      ['Candidate', 'Valid projects', 'TS6 analysis', 'Candidate analysis', 'Ratio'],
      Object.entries(summary.pairwise).map(([b, pair]) => [
        b,
        String(pair.observed[b].projects),
        fmt(pair.observed.ts6.analysisMs),
        fmt(pair.observed[b].analysisMs),
        pair.observed.ts6.analysisMs
          ? (pair.observed[b].analysisMs.median / pair.observed.ts6.analysisMs.median).toFixed(3) +
            '×'
          : '—',
      ]),
    ),
    '',
    '## Per-project analysis timings',
    '',
    table(
      ['Project', 'Status', ...plan.backends],
      summary.projects.map(p => [
        p.name,
        p.parityPassed
          ? 'parity'
          : p.valid
            ? p.mismatches.some(
                m => m.fields.includes('issues') || m.fields.includes('diagnostics'),
              )
              ? 'DIFFERENT RESULTS'
              : 'DIFFERENT INPUTS'
            : p.complete
              ? 'FAILED'
              : 'incomplete',
        ...plan.backends.map(b =>
          p.backends[b].failures.some(f => f.timedOut)
            ? `${fmt(p.backends[b].analysisMs)}; TIMEOUT (worker wall)`
            : fmt(p.backends[b].analysisMs),
        ),
      ]),
    ),
    '',
    '## Failures and mismatches',
    '',
    ...summary.projects.flatMap(p => [
      ...Object.entries(p.backends).flatMap(([backend, v]) =>
        v.failures.map(
          f =>
            `- ${p.name}/${backend}/round ${f.round}: ${f.errors.map(e => e.message).join('; ')} (${f.report})`,
        ),
      ),
      ...p.mismatches.map(
        m =>
          `- ${p.name}/${m.backend}/round ${m.round}: ${m.fields.join(', ')} differs (${m.report}).`,
      ),
    ]),
    '',
    `Registry entries without an active ruling test: ${summary.inactiveProjects.join(', ') || 'none'}.`,
    '',
    '## Scope',
    '',
    'Uses the shared ruling configuration and production discovery/analyzeProject path, including MAIN/TEST roles, exclusions, configured/orphan programs, Vue/HTML/YAML extraction and CSS analysis. Pure CSS projects remain in the suite; their time is not TS compiler work. No profiler is enabled. Worker execution is sequential; backend positions rotate. OS filesystem caches are not cleared. Result gates cover selected sources/roles, active rules, program selections, normalized rich diagnostics, parsing failures and missing results. Matching fixtures can contain expected syntax errors; compiler/runtime/linter failures invalidate the worker.',
    '',
    'The JSON report retains failures and both valid/comparable cohort totals. A failed or timed-out provider is never recorded as a zero-duration success. Raw worker reports and logs are retained; resume never silently reruns existing reports.',
    '',
  ].join('\n');
}
