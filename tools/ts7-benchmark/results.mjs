import path from 'node:path';

export const canonical = value =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, item]) => [key, canonical(item)]),
        )
      : value;

const encoded = value => JSON.stringify(canonical(value));

/** Keep every issue field, including fixes/suggestions, secondary locations and suppressions. */
export function normalizeDiagnostics(result, project) {
  const normalize = value => {
    if (Array.isArray(value)) return value.map(normalize);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        key === 'filePath' && typeof item === 'string'
          ? path.relative(project, item).replaceAll('\\', '/')
          : normalize(item),
      ]),
    );
  };
  const multiset = values =>
    (values ?? []).map(normalize).sort((a, b) => encoded(a).localeCompare(encoded(b)));
  return {
    issues: multiset(result.issues),
    suppressedIssues: multiset(result.suppressedIssues),
    sonarResolveComments: multiset(result.sonarResolveComments),
  };
}

export const fingerprint = result =>
  encoded({
    files: result.files,
    issues: result.issues,
    diagnostics: result.diagnostics,
    activeRules: result.activeRules,
    sourceHashes: result.sourceHashes,
    programInputs: result.programInputs,
  });

export function compareResults(reference, candidate) {
  const differences = [];
  for (const rule of new Set([...Object.keys(reference.issues), ...Object.keys(candidate.issues)]))
    for (const file of new Set([
      ...Object.keys(reference.issues[rule] ?? {}),
      ...Object.keys(candidate.issues[rule] ?? {}),
    ])) {
      const before = reference.issues[rule]?.[file] ?? [];
      const after = candidate.issues[rule]?.[file] ?? [];
      if (encoded(before) !== encoded(after))
        differences.push({ rule, file, classic: before, native: after });
    }
  const diagnosticDifferences = [];
  // Legacy reports can still be inspected, but cannot pass the richer gate.
  const diagnosticsAvailable = !!reference.diagnostics && !!candidate.diagnostics;
  if (diagnosticsAvailable)
    for (const file of new Set([
      ...Object.keys(reference.diagnostics),
      ...Object.keys(candidate.diagnostics),
    ]))
      if (encoded(reference.diagnostics[file]) !== encoded(candidate.diagnostics[file]))
        diagnosticDifferences.push({
          file,
          classic: reference.diagnostics[file],
          native: candidate.diagnostics[file],
        });
  return {
    filesMatch: encoded(reference.files) === encoded(candidate.files),
    sourceTextsMatch: encoded(reference.sourceHashes) === encoded(candidate.sourceHashes),
    activeRulesMatch: encoded(reference.activeRules) === encoded(candidate.activeRules),
    programInputsMatch:
      !!reference.programInputs &&
      !!candidate.programInputs &&
      encoded(reference.programInputs) === encoded(candidate.programInputs),
    issueLinesMatch: differences.length === 0,
    diagnosticsMatch: diagnosticsAvailable && diagnosticDifferences.length === 0,
    differences,
    diagnosticDifferences,
  };
}

const parityKeys = [
  'filesMatch',
  'sourceTextsMatch',
  'activeRulesMatch',
  'programInputsMatch',
  'issueLinesMatch',
  'diagnosticsMatch',
];

export const parityPassed = comparison => parityKeys.every(key => comparison[key]);

export function summarizeComparisons(comparisons) {
  const entries = Object.entries(comparisons);
  if (entries.length === 1) return entries[0][1];
  return {
    ...Object.fromEntries(parityKeys.map(key => [key, entries.every(([, value]) => value[key])])),
    ...Object.fromEntries(
      ['differences', 'diagnosticDifferences'].map(key => [
        key,
        entries.flatMap(([backend, value]) =>
          value[key].map(difference => ({ backend, ...difference })),
        ),
      ]),
    ),
  };
}

export function distribution(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return {
    count: sorted.length,
    median: sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2,
    min: sorted[0],
    max: sorted.at(-1),
    values,
  };
}
