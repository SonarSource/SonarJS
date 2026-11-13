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
const lines = [
  '# Vercel upstream upgrade comparison',
  '',
  `Measured ${after.date}, ${after.host}, Node ${after.node}.`,
  `Generated from [the canonical JSON](${input.split('/').at(-1)}) by \`tools/compiler-comparison/upgrade-report.mjs\`.`,
  '',
  '| Input | Before | After |',
  '| --- | --- | --- |',
  ...['version', 'revision', 'upstreamRevision', 'librariesVersion'].map(
    key => `| Compiler ${key} | ${providers.before[key]} | ${providers.after[key]} |`,
  ),
  `| Analyzer commit | ${analyzerCommits.before} | ${analyzerCommits.after} |`,
  '',
  'The analyzer implementation, rules, project sources and configurations are unchanged.',
  'The update changes the Vercel compiler, its supporting threads package, matching declaration',
  'libraries and provider compatibility code. It measures that complete update, rather than',
  'isolating the effect of the upstream checker alone.',
  '',
  `Each campaign uses ${after.repetitions} fresh sequential processes per provider/project, alternating`,
  'Vercel and TS6. The old campaign ran first, then the updated campaign. No builds or tests',
  'ran concurrently with timing. Analysis excludes Node/module startup. Project-tree hashes',
  'and all timing/RSS samples are retained in the JSON.',
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
  'These are sums of medians, not a timed combined analysis. Three repetitions and sequential',
  'campaigns do not establish statistical significance for small changes. Negative percentages',
  'mean less analysis time. The benchmark does not measure incremental edits or native executables.',
  '',
  comparisonReport(after).replace(
    '# Compiler provider comparison',
    '## Updated provider against TS6',
  ),
  'Regenerate this report after updating the canonical JSON:',
  '',
  '```sh',
  `node tools/compiler-comparison/upgrade-report.mjs ${input} ${output}`,
  '```',
  '',
);
await writeFile(output, lines.join('\n'));
