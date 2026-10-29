import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { preserveAttempt, readWorkerReport } from './ruling-io.mjs';

test('resume preserves interrupted logs, config and selection archive without touching other workers', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ruling-attempt-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const prefix = path.join(directory, 'ts7-1');
  for (const suffix of [
    '.log',
    '.config.json',
    '.interrupted-report.json',
    '.json.selection.pb.gz',
  ])
    fs.writeFileSync(prefix + suffix, 'evidence' + suffix);
  fs.writeFileSync(path.join(directory, 'ts7-10.log'), 'other round');
  preserveAttempt(prefix);
  const attempt = fs.readdirSync(directory).find(f => f.startsWith('ts7-1.attempt-'));
  assert.equal(fs.readdirSync(path.join(directory, attempt)).length, 4);
  assert.equal(fs.readFileSync(path.join(directory, attempt, 'ts7-1.log'), 'utf8'), 'evidence.log');
  assert.equal(fs.readFileSync(path.join(directory, 'ts7-10.log'), 'utf8'), 'other round');
  preserveAttempt(prefix);
  assert.equal(fs.readdirSync(directory).length, 2);
});

test('missing, truncated, misidentified and invalid worker reports remain failures', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ruling-report-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'report.json');
  const identity = { project: 'a', backend: 'ts7', round: 1 };
  assert.equal(readWorkerReport(file, identity).valid, false);
  for (const content of [
    '{',
    'null',
    '{}',
    JSON.stringify({ ...identity, round: 2, valid: true, errors: [], timings: { analysisMs: 1 } }),
  ]) {
    fs.writeFileSync(file, content);
    const result = readWorkerReport(file, identity);
    assert.equal(result.valid, false);
    assert.equal(result.project, 'a');
  }
  const expected = { ...identity, valid: true, errors: [], timings: { analysisMs: 42 } };
  fs.writeFileSync(file, JSON.stringify(expected));
  assert.deepEqual(readWorkerReport(file, identity), expected);
});
