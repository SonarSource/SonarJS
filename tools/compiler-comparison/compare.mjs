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
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [corpus, output, repetitions = '3', ...projects] = process.argv.slice(2);
if (!corpus || !output || !projects.length || !/^[1-9]\d*$/.test(repetitions)) {
  throw new Error(
    'Usage: node tools/compiler-comparison/compare.mjs <corpus> <output-directory> <repetitions> <projects...>',
  );
}
await mkdir(output, { recursive: true });
const summary = { node: process.version, repetitions: Number(repetitions), projects: [] };
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
function canonical(value, baseDir) {
  if (typeof value === 'string') return value.replaceAll(baseDir, '<project>');
  if (Array.isArray(value)) return value.map(item => canonical(item, baseDir));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(key => [key, canonical(value[key], baseDir)]),
    );
  return value;
}
function findings(run) {
  const issues = new Map();
  for (const file of run.files)
    for (const issue of file.issues ?? []) {
      const key = JSON.stringify([file.file, canonical(issue, run.baseDir)]);
      issues.set(key, (issues.get(key) ?? 0) + 1);
    }
  return issues;
}
function subtract(left, right) {
  return [...left].flatMap(([key, count]) =>
    Array(Math.max(0, count - (right.get(key) ?? 0))).fill(JSON.parse(key)),
  );
}
function errors(run) {
  return run.files
    .filter(file => file.error || file.parsingErrors?.length)
    .map(file => ({ file: file.file, error: file.error, parsingErrors: file.parsingErrors }));
}
for (const project of projects) {
  const runs = { ts6: [], vercel: [] };
  for (let index = 0; index < Number(repetitions); index++) {
    // Alternate order and use a fresh process every time. Never time both together.
    for (const backend of index % 2 ? ['vercel', 'ts6'] : ['ts6', 'vercel']) {
      const filename = path.resolve(output, `${project}-${backend}-${index + 1}.json`);
      const log = [];
      await new Promise((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [
            'node_modules/tsx/dist/cli.mjs',
            '--tsconfig',
            'packages/tsconfig.test.json',
            'tools/compiler-comparison/worker.mts',
            project,
            path.resolve(corpus, project),
            filename,
          ],
          {
            env: { ...process.env, SONARJS_TYPESCRIPT_BACKEND: backend },
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        );
        child.stdout.on('data', data => log.push(data));
        child.stderr.on('data', data => log.push(data));
        child.once('error', reject);
        child.once('close', async code => {
          try {
            await writeFile(filename.replace(/\.json$/, '.log'), Buffer.concat(log));
            if (code)
              reject(new Error(`${project}/${backend} exited ${code}; see logs in ${output}`));
            else resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
      const result = JSON.parse(await readFile(filename, 'utf8'));
      runs[backend].push(result);
      console.log(
        `${project} ${backend} ${index + 1}: ${result.files.length} files, ${result.analysisMs.toFixed(0)} ms`,
      );
    }
  }
  const baseline = findings(runs.ts6[0]),
    candidate = findings(runs.vercel[0]);
  const missing = subtract(baseline, candidate),
    added = subtract(candidate, baseline);
  const count = entries => [...entries.values()].reduce((sum, n) => sum + n, 0);
  const timings = Object.fromEntries(
    Object.entries(runs).map(([backend, values]) => [
      backend,
      {
        analysisMs: values.map(run => run.analysisMs),
        medianMs: median(values.map(run => run.analysisMs)),
        peakRssBytes: values.map(run => run.peakRssBytes),
        errors: errors(values[0]),
        deterministic: values.every(
          run =>
            JSON.stringify([...findings(run)].sort()) ===
            JSON.stringify([...findings(values[0])].sort()),
        ),
      },
    ]),
  );
  const result = {
    project,
    files: runs.ts6[0].files.length,
    ts6Issues: count(baseline),
    vercelIssues: count(candidate),
    identicalIssues: count(baseline) - missing.length,
    missingIssues: missing.length,
    addedIssues: added.length,
    timeRatio: timings.vercel.medianMs / timings.ts6.medianMs,
    timings,
  };
  await writeFile(
    path.join(output, `${project}-differences.json`),
    JSON.stringify({ missing, added }, null, 2),
  );
  summary.projects.push(result);
  await writeFile(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(result));
}
