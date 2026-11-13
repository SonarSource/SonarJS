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
import { basename } from 'node:path';
import { format, resolveConfig } from 'prettier';
import { comparisonReport } from './report.mjs';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: upgrade-report.mjs <evidence.json> <report.md>');
const evidence = JSON.parse(await readFile(input, 'utf8'));
const { before, after, providers, analyzerCommits } = evidence;
const sum = (campaign, backend) =>
  campaign.projects.reduce((total, project) => total + project.timings[backend].medianMs, 0);
const oldMs = sum(before, 'candidate');
const newMs = sum(after, 'candidate');
const oldControl = sum(before, 'ts6');
const newControl = sum(after, 'ts6');
const percent = ratio => `${((ratio - 1) * 100).toFixed(1)}%`;
const seconds = ms => `${(ms / 1000).toFixed(3)} s`;
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const lines = [
  '# Vercel upstream upgrade comparison',
  '',
  `Measured ${after.date}, ${after.host}, Node ${after.node}.`,
  `Generated from [the canonical JSON](${basename(input)}) by \`tools/compiler-comparison/upgrade-report.mjs\`.`,
  '',
  '| Input | Before | After |',
  '| --- | --- | --- |',
  ...[
    ['Vercel version', 'version'],
    ['Vercel revision', 'revision'],
    ['Microsoft source revision', 'upstreamRevision'],
    ['Declaration libraries', 'librariesVersion'],
    ['@scriptc/threads', 'threadsVersion'],
  ].map(([label, key]) => `| ${label} | ${providers.before[key]} | ${providers.after[key]} |`),
  `| Analyzer commit | ${analyzerCommits.before} | ${analyzerCommits.after} |`,
  '',
  'Rules, project sources and configurations are unchanged.',
  'The update changes the Vercel compiler, its supporting threads package, matching declaration',
  'libraries and provider compatibility code. It measures that complete update, rather than',
  'isolating the effect of the upstream checker alone.',
  '',
  `Each campaign uses ${after.repetitions} fresh sequential processes per provider/project, alternating`,
  'Vercel and TS6. The old campaign ran first, then the updated campaign. No builds or tests',
  'ran concurrently with timing. Analysis excludes Node/module startup. Project-tree hashes',
  'and individual timing/peak-RSS measurements are retained in the JSON.',
  '',
  '| Project | Old Vercel | Updated Vercel | Time change | Old / TS6 | Updated / TS6 | Change normalized to TS6 |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
];
for (const project of after.projects) {
  const old = before.projects.find(previous => previous.project === project.project);
  lines.push(
    `| ${project.project} | ${seconds(old.timings.candidate.medianMs)} | ${seconds(project.timings.candidate.medianMs)} | ${percent(project.timings.candidate.medianMs / old.timings.candidate.medianMs)} | ${old.timeRatio.toFixed(2)}× | ${project.timeRatio.toFixed(2)}× | ${percent(project.timeRatio / old.timeRatio)} |`,
  );
}
lines.push(
  '',
  `Sum of project medians: **${seconds(oldMs)} → ${seconds(newMs)} (${percent(newMs / oldMs)} analysis time)**.`,
  `The TS6 control changed by ${percent(newControl / oldControl)}; normalizing both campaigns to TS6 gives ${percent(newMs / newControl / (oldMs / oldControl))}.`,
  'The updated provider shows no clear speedup for this in-process workload.',
  'These are sums of medians, not a timed combined analysis. Three repetitions and sequential',
  'campaigns do not establish statistical significance for small changes. Negative percentages',
  'mean less analysis time. The benchmark does not measure incremental edits or native executables.',
  '',
  '## Old and updated provider memory',
  '',
  'Median analyzer Node maxRSS per project, reported by the operating system:',
  '',
  '| Project | Old Vercel MiB | Updated Vercel MiB |',
  '| --- | ---: | ---: |',
  ...after.projects.map(project => {
    const old = before.projects.find(previous => previous.project === project.project);
    const mib = p => (median(p.timings.candidate.nodePeakRssBytes) / 2 ** 20).toFixed(0);
    return `| ${project.project} | ${mib(old)} | ${mib(project)} |`;
  }),
  '',
  ...(evidence.exactFindingParityBetweenCandidates
    ? ['The old and updated candidates produce exactly the same findings.', '']
    : []),
  comparisonReport({
    ...after,
    versions: { ...after.versions, vercel: providers.after.version },
  })
    .replace('# Compiler provider comparison', '## Updated provider against TS6')
    .replace(
      'Generated from the adjacent summary JSON by `tools/compiler-comparison/report.mjs`.',
      'Generated from the `after` campaign in the canonical JSON using `tools/compiler-comparison/report.mjs`.',
    ),
  'Regenerate this report after updating the canonical JSON:',
  '',
  '```sh',
  `node tools/compiler-comparison/upgrade-report.mjs ${input} ${output}`,
  '```',
  '',
);
await writeFile(
  output,
  await format(lines.join('\n'), { ...(await resolveConfig(output)), filepath: output }),
);
