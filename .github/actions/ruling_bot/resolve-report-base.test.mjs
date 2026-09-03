import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const actionDirectory = path.dirname(fileURLToPath(import.meta.url));
const resolver = path.join(actionDirectory, 'resolve-report-base.sh');

test('uses the tested synthetic merge base after the base branch advances', t => {
  const repository = createRepository(t);

  commitFile(repository, 'ruling.json', 'old ruling', 'initial base');
  const staleEventBase = git(repository, 'rev-parse', 'HEAD');

  git(repository, 'checkout', '-b', 'pull-request');
  commitFile(repository, 'feature.js', 'feature', 'pull request change');

  git(repository, 'checkout', 'master');
  commitFile(repository, 'ruling.json', 'new ruling', 'ruling update on master');
  const testedBase = git(repository, 'rev-parse', 'HEAD');

  git(repository, 'merge', '--no-ff', 'pull-request', '-m', 'synthetic merge');
  const syntheticMerge = git(repository, 'rev-parse', 'HEAD');
  const checkout = createShallowCheckout(t, repository, syntheticMerge);

  assert.notEqual(testedBase, staleEventBase);
  assert.equal(git(checkout, 'rev-parse', '--is-shallow-repository'), 'true');
  assert.equal(resolveBase(checkout, true), testedBase);
});

test('fails instead of comparing a pull request against an unrelated fallback', t => {
  const repository = createRepository(t);
  commitFile(repository, 'feature.js', 'feature', 'pull request head');

  const result = spawnSync('bash', [resolver, 'true'], {
    cwd: repository,
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expected a synthetic merge commit with both parents available/);
});

test('does not select a commit for a default-branch run', t => {
  const repository = createRepository(t);
  commitFile(repository, 'ruling.json', 'ruling', 'default branch');

  assert.equal(resolveBase(repository, false), '');
});

function createRepository(t) {
  const repository = createTemporaryDirectory(t);

  git(repository, 'init', '--initial-branch=master');
  git(repository, 'config', 'user.name', 'Ruling Bot Test');
  git(repository, 'config', 'user.email', 'ruling-bot-test@example.com');
  git(repository, 'config', 'commit.gpgSign', 'false');
  return repository;
}

function createShallowCheckout(t, sourceRepository, revision) {
  const checkout = createTemporaryDirectory(t);
  git(checkout, 'init');
  git(checkout, 'remote', 'add', 'origin', pathToFileURL(sourceRepository).href);
  git(checkout, 'fetch', '--depth=2', 'origin', revision);
  git(checkout, 'checkout', '--detach', 'FETCH_HEAD');
  return checkout;
}

function createTemporaryDirectory(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'ruling-report-base-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function commitFile(repository, fileName, contents, message) {
  writeFileSync(path.join(repository, fileName), contents);
  git(repository, 'add', fileName);
  git(repository, 'commit', '-m', message);
}

function resolveBase(repository, isPullRequest) {
  return execFileSync('bash', [resolver, String(isPullRequest)], {
    cwd: repository,
    encoding: 'utf8',
  }).trim();
}

function git(repository, ...args) {
  return execFileSync('git', args, {
    cwd: repository,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}
