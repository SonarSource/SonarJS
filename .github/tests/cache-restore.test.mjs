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
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import yaml from 'yaml';

const { jobs } = yaml.parse(
  readFileSync(new URL('../workflows/build.yml', import.meta.url), 'utf8'),
);

for (const [job, files] of [
  ['populate_npm_cache', ['node_modules/.package-lock.json']],
  ['populate_npm_cache_win', ['node_modules/.package-lock.json']],
  ['test_js', ['coverage/js/lcov.info', 'coverage/js/test-report.xml']],
  ['test_js_win', ['.js-test-marker-win/success']],
]) {
  const recoverySteps = jobs[job].steps.filter(step => step.if !== undefined);
  assert.ok(recoverySteps.length > 0);

  // These conditions use the common subset of GitHub and JavaScript expressions.
  // Execute the workflow's expressions, with hashFiles reading the fixture files.
  const conditions = recoverySteps.map(
    step =>
      new Function(
        'cacheHit',
        'hashFiles',
        `return ${step.if.replaceAll('steps.cache.outputs.cache-hit', 'cacheHit')}`,
      ),
  );

  for (const [scenario, cacheHit, restored, shouldRun] of [
    ['entry found but restore failed', 'true', [], true],
    ['successful exact restore', 'true', files, false],
    ['cache miss', '', [], true],
    ['non-exact restore', 'false', files, true],
    ...files
      .filter(() => files.length > 1)
      .map(file => [
        `restore missing ${file}`,
        'true',
        files.filter(other => other !== file),
        true,
      ]),
  ]) {
    test(`${job}: ${scenario}`, t => {
      const workspace = mkdtempSync(path.join(os.tmpdir(), 'ci-cache-restore-'));
      t.after(() => rmSync(workspace, { recursive: true, force: true }));
      // An incomplete extraction can leave the directory without the needed files.
      for (const file of files)
        mkdirSync(path.dirname(path.join(workspace, file)), { recursive: true });
      for (const file of restored) writeFileSync(path.join(workspace, file), '');
      const hashFiles = file => {
        const target = path.join(workspace, file);
        return existsSync(target)
          ? createHash('sha256').update(readFileSync(target)).digest('hex')
          : '';
      };

      for (const [index, condition] of conditions.entries()) {
        assert.equal(
          condition(cacheHit, hashFiles),
          shouldRun,
          recoverySteps[index].name || recoverySteps[index].uses,
        );
      }
    });
  }
}
