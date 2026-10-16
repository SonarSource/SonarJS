import fs from 'node:fs';
import path from 'node:path';
import { canonical, compareResults } from './results.mjs';
import { rulingDifferences, rulingFingerprint } from './ruling-results.mjs';
import { isFinalizedReport, readWorkerReport } from './ruling-io.mjs';

const encoded = value => JSON.stringify(canonical(value));
const count = files => Object.values(files ?? {}).reduce((n, lines) => n + lines.length, 0);

/** Rich result comparisons outside the timed path, preserving line multiplicity. */
export function diffRulingReports(reference, candidate) {
  if (![reference, candidate].every(r => Number.isFinite(r.timings?.analysisMs)))
    return { available: false, reason: 'At least one project pipeline aborted' };
  const comparison = compareResults(reference, candidate);
  const fields = rulingDifferences(reference, candidate);
  const rules = new Map();
  for (const difference of comparison.differences) {
    const entry = rules.get(difference.rule) ?? {
      rule: difference.rule,
      before: count(reference.issues[difference.rule]),
      after: count(candidate.issues[difference.rule]),
      added: 0,
      removed: 0,
      files: [],
    };
    entry.files.push(difference.file);
    const occurrences = values => {
      const result = new Map();
      for (const value of values) result.set(value, (result.get(value) ?? 0) + 1);
      return result;
    };
    const before = occurrences(difference.classic),
      after = occurrences(difference.native);
    for (const line of new Set([...before.keys(), ...after.keys()])) {
      const delta = (after.get(line) ?? 0) - (before.get(line) ?? 0);
      entry.added += Math.max(delta, 0);
      entry.removed += Math.max(-delta, 0);
    }
    rules.set(difference.rule, entry);
  }
  const selections = report =>
    new Map(
      (report.programInputs ?? []).flatMap(p =>
        p.files.map(file => [
          file,
          encoded({ kind: p.kind, tsconfig: p.tsconfig, compilerOptions: p.compilerOptions }),
        ]),
      ),
    );
  const before = selections(reference),
    after = selections(candidate);
  return {
    available: true,
    valid: reference.valid && candidate.valid,
    fields,
    issueLinesMatch: comparison.issueLinesMatch,
    diagnosticsMatch: comparison.diagnosticsMatch,
    findingDelta: candidate.issueCount - reference.issueCount,
    diagnosticFiles: comparison.diagnosticDifferences.map(d => d.file).sort(),
    selectionChangedFiles: [...new Set([...before.keys(), ...after.keys()])]
      .filter(file => before.get(file) !== after.get(file))
      .sort(),
    rules: [...rules.values()].sort(
      (a, b) => b.added + b.removed - a.added - a.removed || a.rule.localeCompare(b.rule),
    ),
  };
}

/** Read one project at a time; never retain the full corpus diagnostics in memory. */
export function writeRulingDifferences(output, plan) {
  const projects = [];
  let routedWorkers = 0,
    validWorkers = 0,
    files = 0;
  const globalRules = new Map();
  for (const project of plan.projects.filter(p => p.active)) {
    for (let round = 1; round <= plan.runs; round++) {
      const read = backend => {
        const file = path.join(output, project.name, `${backend}-${round}.json`);
        if (!fs.existsSync(file)) return undefined;
        const report = readWorkerReport(file, { project: project.name, backend, round });
        if (!isFinalizedReport(report)) return undefined;
        if (report.compilerRouting?.sameFacade) routedWorkers++;
        if (report.valid) {
          validWorkers++;
          if (!report.compilerRouting?.sameFacade)
            throw new Error(`Valid worker lacks shared routing: ${file}`);
        }
        return report;
      };
      const reference = read('ts6');
      if (!reference) continue;
      files += reference.files?.length ?? 0;
      const row = {
        project: project.name,
        round,
        files: reference.files?.length,
        baselineIssues: reference.issueCount,
        comparisons: {},
        nativeFingerprints: {},
      };
      for (const backend of plan.backends.filter(b => b !== 'ts6')) {
        const candidate = read(backend);
        if (!candidate) continue;
        const difference = diffRulingReports(reference, candidate);
        row.comparisons[backend] = difference;
        if (difference.available) row.nativeFingerprints[backend] = rulingFingerprint(candidate);
        if (backend === 'ts7' && difference.available)
          for (const rule of difference.rules) {
            const total = globalRules.get(rule.rule) ?? {
              rule: rule.rule,
              added: 0,
              removed: 0,
              projects: [],
            };
            total.added += rule.added;
            total.removed += rule.removed;
            if (!total.projects.includes(project.name)) total.projects.push(project.name);
            globalRules.set(rule.rule, total);
          }
      }
      const fingerprints = Object.values(row.nativeFingerprints);
      row.nativeBackendsMatch =
        fingerprints.length === plan.backends.length - 1 && new Set(fingerprints).size === 1;
      delete row.nativeFingerprints;
      projects.push(row);
    }
    console.log(`Compared ${project.name}`);
  }
  const result = {
    schemaVersion: 1,
    sourceHead: plan.head,
    identityHash: plan.identityHash,
    runs: plan.runs,
    aggregation:
      'Rule line deltas sum completed TS6/IPC worker pairs; repeated rounds count again.',
    routedWorkers,
    validWorkers,
    baselineSelectedFiles: files,
    projects,
    rules: [...globalRules.values()].sort((a, b) => b.added + b.removed - a.added - a.removed),
  };
  fs.writeFileSync(path.join(output, 'differences.json'), JSON.stringify(result, null, 2));
  return result;
}
