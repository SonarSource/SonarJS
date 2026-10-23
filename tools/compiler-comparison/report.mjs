/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

export function comparisonReport(summary) {
  const projects = summary.projects;
  const sum = field => projects.reduce((total, project) => total + project[field], 0);
  const baselineMs = projects.reduce((total, p) => total + p.timings.ts6.medianMs, 0);
  const candidateMs = projects.reduce((total, p) => total + p.timings.candidate.medianMs, 0);
  const lines = [
    '# Compiler provider comparison',
    '',
    `Candidate: ${summary.candidateProvider}. Node: ${summary.node}. Repetitions: ${summary.repetitions}.`,
    ...(summary.date ? [`Measured: ${summary.date}. Host: ${summary.host}.`] : []),
    ...(summary.corpusCommit ? [`Corpus commit: ${summary.corpusCommit}.`] : []),
    ...(summary.versions
      ? [
          `Versions: ${Object.entries(summary.versions)
            .map(([name, version]) => `${name} ${version}`)
            .join(', ')}.`,
        ]
      : []),
    '',
    'Generated from the adjacent summary JSON by `tools/compiler-comparison/report.mjs`.',
    '',
    'Providers run sequentially in fresh processes with alternating order. Times are median',
    'project analysis times, excluding Node/module startup. Exact finding equality includes',
    'messages, locations, secondaries and fixes. Project sources/configs are unchanged.',
    '',
    '| Project | Files | TS6 findings | Candidate findings | Exact matches | TS6 ms | Candidate ms | Ratio |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...projects.map(
      p =>
        `| ${p.project} | ${p.files} | ${p.ts6Issues} | ${p.candidateIssues} | ${p.identicalIssues} | ${p.timings.ts6.medianMs.toFixed(0)} | ${p.timings.candidate.medianMs.toFixed(0)} | ${p.timeRatio.toFixed(2)}× |`,
    ),
    '',
    `Across ${sum('files')} files: ${sum('identicalIssues')}/${sum('ts6Issues')} exact TS6 matches, ${sum('missingIssues')} missing and ${sum('addedIssues')} added findings.`,
    `Sum of project medians: ${(baselineMs / 1000).toFixed(2)}s TS6, ${(candidateMs / 1000).toFixed(2)}s candidate (${(candidateMs / baselineMs).toFixed(2)}×).`,
    'This sample does not establish performance parity or incremental performance.',
    '',
    '## Memory and IPC',
    '',
    'Median sampled peak RSS includes Node and its child processes. Samples every',
    '100ms can miss short peaks. The JSON retains Node maxRSS separately. Memory sampling',
    'uses POSIX `ps` and is unavailable on Windows.',
    '',
    '| Project | TS6 tree MiB | Candidate tree MiB | Compiler child MiB | IPC requests |',
    '| --- | ---: | ---: | ---: | ---: |',
  ];
  for (const p of projects) {
    const memory = (backend, field) => {
      const samples = p.timings[backend].processTreeMemory.filter(Boolean);
      return samples.length
        ? (median(samples.map(sample => sample[field])) / 2 ** 20).toFixed(0)
        : 'unavailable';
    };
    lines.push(
      `| ${p.project} | ${memory('ts6', 'peakRssBytes')} | ${memory('candidate', 'peakRssBytes')} | ${memory('candidate', 'peakGoRssBytes')} | ${p.timings.candidate.ipc[0]?.requestCount ?? 'unavailable'} |`,
    );
  }
  lines.push(
    '',
    '## Differences',
    '',
    'Full finding messages, secondary locations and fixes remain in the JSON.',
    '',
    '| Project | Direction | File | Line | Rule |',
    '| --- | --- | --- | ---: | --- |',
  );
  for (const [project, differences] of Object.entries(summary.differences ?? {}))
    for (const [direction, entries] of Object.entries(differences))
      for (const [file, issue] of entries)
        lines.push(`| ${project} | ${direction} | ${file} | ${issue.line} | ${issue.ruleId} |`);
  lines.push(
    '',
    '## Reproduce',
    '',
    '```sh',
    'SONARJS_TYPESCRIPT_BACKEND=<candidate> node tools/compiler-comparison/compare.mjs /path/to/jsts-test-sources /tmp/compiler-comparison 3 backbone underscore redux ag-grid rxjs',
    'node tools/compiler-comparison/report.mjs /tmp/compiler-comparison/summary.json /tmp/compiler-comparison/summary.md',
    '```',
    '',
    'Select the candidate with `SONARJS_TYPESCRIPT_BACKEND`. Avoid concurrent builds/tests while timing.',
  );
  return lines.join('\n') + '\n';
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error('Usage: report.mjs <summary.json> <report.md>');
  await writeFile(output, comparisonReport(JSON.parse(await readFile(input, 'utf8'))));
}
