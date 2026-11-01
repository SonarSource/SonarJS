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
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import * as reference from '@typescript-eslint/parser';
import * as owned from '../packages/analysis/src/jsts/frontend/parser.js';
import { scopeShape } from '../packages/analysis/tests/jsts/parsers/tools/frontend-comparison.js';

const upstream = path.resolve(process.argv[2]);
const manifest = JSON.parse(
  await readFile(
    new URL('../packages/analysis/src/jsts/frontend/vendor/upstream.json', import.meta.url),
    'utf8',
  ),
);
assert.equal(
  execFileSync('git', ['rev-parse', 'HEAD'], { cwd: upstream, encoding: 'utf8' }).trim(),
  manifest.commit,
);
assert.equal(reference.meta.version, manifest.version);
const fixtures = path.join(upstream, 'packages/ast-spec/src');
const files = (await readdir(fixtures, { recursive: true })).filter(file =>
  /\/fixtures\/.*\/fixture\.[cm]?[jt]sx?$/.test('/' + file),
);
let accepted = 0,
  rejected = 0;
const failures: { file: string; error: string }[] = [];
for (const file of files) {
  const code = await readFile(path.join(fixtures, file), 'utf8');
  const options = { filePath: path.basename(file), sourceType: 'module' as const };
  function outcome(parser: typeof owned | typeof reference) {
    try {
      return { result: parser.parseForESLint(code, options), error: null };
    } catch (error) {
      return { result: null, error: [error.message, error.lineNumber, error.column, error.index] };
    }
  }
  const expected = outcome(reference),
    actual = outcome(owned);
  try {
    assert.deepEqual(actual.error, expected.error);
    if (expected.result && actual.result) {
      assert.deepEqual(actual.result.ast, expected.result.ast);
      assert.deepEqual(scopeShape(actual.result), scopeShape(expected.result));
      accepted++;
    } else rejected++;
  } catch (error) {
    failures.push({ file, error: error.message });
  }
}
console.log(JSON.stringify({ fixtures: files.length, accepted, rejected, failures }, null, 2));
assert.ok(files.length > 0);
assert.equal(
  failures.length,
  0,
  'Owned front-end output diverged from the pinned upstream baseline',
);
