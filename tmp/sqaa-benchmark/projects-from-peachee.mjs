#!/usr/bin/env node
// Export project keys for successful jobs of one Peachee Main Analysis run.
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
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

function options(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith('--') || argv[i + 1] == null) {
      throw new Error(`Expected --name value, got ${argv[i] ?? '<end>'}`);
    }
    result[argv[i].slice(2)] = argv[i + 1];
  }
  return result;
}

const args = options(process.argv.slice(2));
for (const name of ['run', 'peachee', 'out']) {
  if (!args[name]) throw new Error(`--${name} is required`);
}
const keys = new Set();
let successfulJobs = 0;
for (let page = 1; ; page++) {
  const response = JSON.parse(
    execFileSync(
      'gh',
      [
        'api',
        '-X',
        'GET',
        `repos/SonarSource/peachee-js/actions/runs/${args.run}/jobs`,
        '-f',
        'per_page=100',
        '-f',
        `page=${page}`,
      ],
      { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
    ),
  );
  for (const job of response.jobs ?? []) {
    if (job.conclusion !== 'success') continue;
    let properties;
    try {
      properties = await readFile(join(args.peachee, job.name, 'sonar-project.properties'), 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    const key = /^sonar\.projectKey=(.+)$/m.exec(properties)?.[1]?.trim();
    if (!key) throw new Error(`Successful job ${job.name} has no sonar.projectKey`);
    keys.add(`${args['key-prefix'] ?? ''}${key}`);
    successfulJobs++;
  }
  if ((response.jobs ?? []).length < 100) break;
}
if (keys.size === 0) throw new Error('No successful project jobs found');
await writeFile(args.out, `${[...keys].sort().join('\n')}\n`);
console.log(
  `Saved ${keys.size} project keys from ${successfulJobs} successful jobs to ${args.out}`,
);
