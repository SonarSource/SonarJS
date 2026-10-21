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
import { spawn, execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { comparisonReport } from './report.mjs';
import { createRequire } from 'node:module';
import os from 'node:os';

import configuration from '../../packages/typescript/providers.json' with { type: 'json' };
const candidateProvider = process.env.SONARJS_TYPESCRIPT_BACKEND ?? configuration.defaultProvider;
if (candidateProvider === 'ts6')
  throw new Error('Select a candidate provider with SONARJS_TYPESCRIPT_BACKEND');
const [corpus, output, repetitions = '3', ...projects] = process.argv.slice(2);
if (!corpus || !output || !projects.length || !/^[1-9]\d*$/.test(repetitions)) {
  throw new Error(
    'Usage: node tools/compiler-comparison/compare.mjs <corpus> <output-directory> <repetitions> <projects...>',
  );
}
await mkdir(output, { recursive: true });
const require = createRequire(import.meta.url);
const corpusCommit = await new Promise(resolve => {
  execFile('git', ['-C', path.resolve(corpus), 'rev-parse', 'HEAD'], (error, stdout) =>
    resolve(error ? undefined : stdout.trim()),
  );
});
const summary = {
  candidateProvider,
  date: new Date().toISOString().slice(0, 10),
  host: `${os.type()} ${os.release()} ${os.arch()}`,
  corpusCommit,
  versions: Object.fromEntries(
    ['ts6', candidateProvider].map(name => [
      name,
      configuration.providers[name].sdk
        ? require(`${configuration.providers[name].sdk}/package.json`).version
        : configuration.providers[name].module,
    ]),
  ),
  node: process.version,
  repetitions: Number(repetitions),
  projects: [],
  differences: {},
};
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
  const runs = { ts6: [], candidate: [] };
  for (let index = 0; index < Number(repetitions); index++) {
    // Alternate order and use a fresh process every time. Never time both together.
    for (const backend of index % 2 ? ['candidate', 'ts6'] : ['ts6', 'candidate']) {
      const filename = path.resolve(output, `${project}-${backend}-${index + 1}.json`);
      const log = [],
        samples = [];
      let monitor;
      let sampling = Promise.resolve();
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
            env: {
              ...process.env,
              SONARJS_TYPESCRIPT_BACKEND: backend === 'candidate' ? candidateProvider : backend,
            },
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        );
        if (process.platform !== 'win32')
          monitor = setInterval(() => {
            sampling = sampling.then(
              () =>
                new Promise(resolve => {
                  execFile('ps', ['-eo', 'pid=,ppid=,rss=,comm='], (error, stdout) => {
                    if (!error) {
                      const rows = stdout
                        .trim()
                        .split('\n')
                        .map(line => {
                          const [, pid, ppid, rss, command] =
                            /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/.exec(line) ?? [];
                          return {
                            pid: Number(pid),
                            ppid: Number(ppid),
                            rss: Number(rss) * 1024,
                            command,
                          };
                        });
                      const descendants = new Set([child.pid]);
                      for (let changed = true; changed;) {
                        changed = false;
                        for (const row of rows)
                          if (descendants.has(row.ppid) && !descendants.has(row.pid)) {
                            descendants.add(row.pid);
                            changed = true;
                          }
                      }
                      samples.push({
                        at: Date.now(),
                        rss: rows
                          .filter(row => descendants.has(row.pid))
                          .reduce((sum, row) => sum + row.rss, 0),
                        goRss: rows
                          .filter(row => descendants.has(row.pid) && row.command?.includes('tsc-'))
                          .reduce((sum, row) => sum + row.rss, 0),
                      });
                    }
                    resolve();
                  });
                }),
            );
          }, 100);
        child.stdout.on('data', data => log.push(data));
        child.stderr.on('data', data => log.push(data));
        child.once('error', error => {
          clearInterval(monitor);
          reject(error);
        });
        child.once('close', async code => {
          clearInterval(monitor);
          try {
            await sampling;
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
      const analysisSamples = samples.filter(
        sample =>
          sample.at >= result.analysisEndedAt - result.analysisMs &&
          sample.at <= result.analysisEndedAt,
      );
      result.processTreeMemory = analysisSamples.length
        ? {
            sampleIntervalMs: 100,
            samples: analysisSamples.length,
            peakRssBytes: Math.max(...analysisSamples.map(s => s.rss)),
            peakGoRssBytes: Math.max(...analysisSamples.map(s => s.goRss)),
          }
        : null;
      await writeFile(filename, JSON.stringify(result, null, 2));
      runs[backend].push(result);
      console.log(
        `${project} ${backend} ${index + 1}: ${result.files.length} files, ${result.analysisMs.toFixed(0)} ms`,
      );
    }
  }
  const baseline = findings(runs.ts6[0]),
    candidate = findings(runs.candidate[0]);
  const missing = subtract(baseline, candidate),
    added = subtract(candidate, baseline);
  const count = entries => [...entries.values()].reduce((sum, n) => sum + n, 0);
  const timings = Object.fromEntries(
    Object.entries(runs).map(([backend, values]) => [
      backend,
      {
        analysisMs: values.map(run => run.analysisMs),
        medianMs: median(values.map(run => run.analysisMs)),
        nodePeakRssBytes: values.map(run => run.peakRssBytes),
        processTreeMemory: values.map(run => run.processTreeMemory),
        ipc: values.map(run => run.ipc?.totals),
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
    candidateIssues: count(candidate),
    identicalIssues: count(baseline) - missing.length,
    missingIssues: missing.length,
    addedIssues: added.length,
    timeRatio: timings.candidate.medianMs / timings.ts6.medianMs,
    timings,
  };
  await writeFile(
    path.join(output, `${project}-differences.json`),
    JSON.stringify({ missing, added }, null, 2),
  );
  summary.projects.push(result);
  summary.differences[project] = { missing, added };
  await writeFile(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2));
  await writeFile(path.join(output, 'summary.md'), comparisonReport(summary));
  console.log(JSON.stringify(result));
}
