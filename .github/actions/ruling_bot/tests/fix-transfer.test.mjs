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
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fixture } from './fixtures.mjs';

function target(f, base, head, merge) {
  Object.assign(f.ctx, { base, testedHead: head, testedCommit: merge });
  f.state.original.head.sha = head;
  f.state.run.head_sha = head;
  f.setRemote('master', base);
  f.setRemote('outdated-pr', head);
}

function assertFailedReportRequested(f) {
  const mutations = f.mutations();
  assert.equal(mutations.length, 1);
  const [dispatch] = mutations;
  assert.equal(dispatch[0], 'workflow');
  assert.ok(dispatch.includes('pr-number=123'));
  assert.ok(dispatch.includes('ruling-failed=true'));
  assert.ok(dispatch.includes('fix-pr-url='));
  assert.ok(dispatch.includes(`head-sha=${f.ctx.testedCommit}`));
  assert.ok(dispatch.includes(`results-artifact-name=${f.config['results-artifact-name']}`));
}

async function rejectedRetryFixture(t) {
  const f = fixture(t);
  await f.bot().update(f.config);
  const candidate = f.state.prs[0];
  f.git(['checkout', '--detach', f.merge]);
  f.ctx.fixUrl = candidate.html_url;
  await f.bot().report(f.config);
  const oldReport = f.state.comments[0].body;
  const oldRun = { ...f.state.run };
  f.git(['checkout', '-f', '--detach', f.head]);
  f.write('new-pr-code.js', 'New original PR head\n');
  const head = f.commit('Original PR advances');
  f.git(['checkout', '--detach', f.base]);
  f.git(['merge', '--no-ff', '--no-edit', head]);
  target(f, f.base, head, f.git(['rev-parse', 'HEAD']));
  Object.assign(f.ctx, {
    runId: '43',
    fixUrl: '',
    output: path.join(f.workspace, 'dispatch-output'),
  });
  f.state.run = { ...oldRun, id: 43, head_sha: head };
  f.state.runs.push(oldRun);
  rmSync(path.join(f.workspace, 'generated/project/javascript-S9000.json'));
  f.state.calls = [];
  f.state.gitCalls = [];
  return { f, candidate, oldReport };
}

for (const method of ['squash', 'rebase']) {
  test(`Bob's rule changes stay out of Alice's fix and ${method} merge (repro #8159/#8160)`, async t => {
    const f = fixture(t);
    f.git(['checkout', '--detach', `${f.head}^`]);
    rmSync(path.join(f.workspace, 'baseline'), { recursive: true });
    f.write('rules/S1135.ts', 'export const enabled = true;\n');
    f.write('rules/S1134.ts', 'export const enabled = true;\n');
    f.result('baseline', 'S1135', 'todo.js', 1);
    f.result('baseline', 'S1134', 'fixme.js', 2);
    const common = f.commit('Both rules are enabled');
    f.write('rules/S1135.ts', 'export const enabled = false;\n');
    rmSync(path.join(f.workspace, 'baseline/project/javascript-S1135.json'));
    const base = f.commit('Bob disables S1135 and updates its expectations');
    f.git(['checkout', '--detach', common]);
    f.write('rules/S1134.ts', 'export const enabled = false;\n');
    const head = f.commit('Alice disables S1134');
    f.git(['checkout', '--detach', base]);
    f.git(['merge', '--no-ff', '--no-edit', head]);
    const merge = f.git(['rev-parse', 'HEAD']);
    target(f, base, head, merge);
    rmSync(path.join(f.workspace, 'generated'), { recursive: true });
    mkdirSync(path.join(f.workspace, 'generated'));
    assert.equal(await f.bot().update(f.config), 'updated');
    const fix = f.git(['rev-parse', 'HEAD']);
    assert.equal(f.git(['rev-parse', 'HEAD^']), head);
    assert.equal(f.git(['rev-list', `${head}..${fix}`]), fix);
    assert.equal(
      f.git(['diff', '--name-only', `${head}...${fix}`]),
      'baseline/project/javascript-S1134.json',
    );
    assert.equal(f.git(['show', 'HEAD:rules/S1135.ts']), 'export const enabled = true;');
    assert.match(f.git(['show', 'HEAD:baseline/project/javascript-S1135.json']), /todo.js/);
    assert.doesNotMatch(f.state.prs[0].body, /rebase|squash|incorporate it before/);
    assert.match(f.state.prs[0].body, /only expectation changes on original PR head/);
    f.git(['checkout', '--detach', head]);
    if (method === 'squash') {
      f.git(['merge', '--squash', fix]);
      f.commit('Squash Alice ruling fix');
    } else {
      f.git(['cherry-pick', fix]);
    }
    assert.equal(f.git(['show', 'HEAD:rules/S1135.ts']), 'export const enabled = true;');
    f.git(['merge', '--no-ff', '--no-edit', base]);
    assert.equal(f.git(['ls-tree', '-r', 'HEAD', '--', 'baseline']), '');
    assert.equal(f.git(['show', 'HEAD:rules/S1135.ts']), 'export const enabled = false;');
    f.git(['checkout', '--detach', merge]);
    f.ctx.fixUrl = f.state.prs[0].html_url;
    assert.equal(await f.bot().report(f.config), 'reported');
    assert.match(f.state.comments[0].body, /S1134/);
    assert.doesNotMatch(f.state.comments[0].body, /S1135/);
  });
}

test('transfer preserves unrelated base changes in the same JSON file for the later base merge', async t => {
  const f = fixture(t);
  const file = 'baseline/project/javascript-S1000.json';
  const data = (bob, alice) => ({
    'project:bob.js': [bob],
    'project:middle.js': [10, 11, 12, 13, 14],
    'project:alice.js': [alice],
  });
  const write = (root, bob, alice) =>
    f.write(
      `${root}/project/javascript-S1000.json`,
      JSON.stringify(data(bob, alice), null, 2) + '\n',
    );
  f.git(['checkout', '--detach', `${f.head}^`]);
  write('baseline', 1, 1);
  const common = f.commit('Common expectations');
  write('baseline', 2, 1);
  const base = f.commit('Bob changes expectations');
  f.git(['checkout', '--detach', common]);
  write('baseline', 1, 2);
  const head = f.commit('Alice changes expectations');
  f.git(['checkout', '--detach', base]);
  f.git(['merge', '--no-ff', '--no-edit', head]);
  const merge = f.git(['rev-parse', 'HEAD']);
  target(f, base, head, merge);
  rmSync(path.join(f.workspace, 'generated'), { recursive: true });
  write('generated', 2, 3);
  f.result('generated', 'S2000', 'removed.js', 2);
  assert.equal(await f.bot().update(f.config), 'updated');
  assert.equal(f.git(['rev-parse', 'HEAD^']), head);
  assert.deepEqual(JSON.parse(f.git(['show', `HEAD:${file}`])), data(1, 3));
  assert.equal(f.git(['diff', '--name-only', `${head}...HEAD`]), file);
  f.git(['merge', '--no-ff', '--no-edit', base]);
  assert.deepEqual(JSON.parse(f.git(['show', `HEAD:${file}`])), data(2, 3));
});

test('base-only modification becomes an expectation addition without base ancestry or stash conflict', async t => {
  const f = fixture(t);
  const file = 'baseline/project/javascript-S9000.json';
  f.result('generated', 'S9000', 'base-only.js', 91);
  assert.equal(await f.bot().update(f.config), 'updated');
  const fix = f.git(['rev-parse', 'HEAD']);
  assert.equal(f.git(['rev-parse', 'HEAD^']), f.head);
  assert.match(f.git(['show', `HEAD:${file}`]), /91/);
  assert.equal(f.git(['rev-list', `${f.head}..HEAD`]), fix);
  f.git(['checkout', '--detach', f.head]);
  f.git(['merge', '--squash', fix]);
  f.commit('Squash expectation-only fix without updating the base');
  assert.match(f.git(['show', `HEAD:${file}`]), /91/);
  // Independently added expectations still need an explicit conflict resolution in the original PR.
  assert.throws(() => f.git(['merge', '--no-ff', '--no-edit', f.base]));
  assert.match(f.git(['diff', '--name-only', '--diff-filter=U']), /javascript-S9000.json/);
  f.result('baseline', 'S9000', 'base-only.js', 91);
  f.commit('Resolve independent expectation additions with the generated result');
  assert.match(f.git(['show', `HEAD:${file}`]), /91/);
});

test('a base-only deletion cannot silently disappear when transferring to the PR head', async t => {
  const f = fixture(t);
  rmSync(path.join(f.workspace, 'generated/project/javascript-S9000.json'));
  await assert.rejects(f.bot().update(f.config), /cannot be represented.*javascript-S9000.json/s);
  assertFailedReportRequested(f);
  assert.equal(
    f.state.gitCalls.some(args => args[0] === 'push'),
    false,
  );
});

test('a generated change already present on the original head cannot silently disappear from a partial fix', async t => {
  const f = fixture(t);
  f.result('baseline', 'S1000', 'old.js', 2);
  f.git(['add', 'baseline']);
  const merge = f.git([
    'commit-tree',
    f.git(['write-tree']),
    '-p',
    f.base,
    '-p',
    f.head,
    '-m',
    'Tested merge differs from original expectations',
  ]);
  f.git(['reset', '--hard', merge]);
  f.ctx.testedCommit = merge;
  f.result('generated', 'S1000', 'old.js', 3);
  await assert.rejects(f.bot().update(f.config), /cannot be represented.*javascript-S1000.json/s);
  assertFailedReportRequested(f);
  assert.equal(
    f.state.gitCalls.some(args => args[0] === 'push'),
    false,
  );
});

test('a partially redundant change in one file cannot silently disappear during transfer', async t => {
  const f = fixture(t);
  const file = 'baseline/project/javascript-S1000.json';
  const write = (root, bob, alice) =>
    f.write(
      `${root}/project/javascript-S1000.json`,
      JSON.stringify({ bob: [bob], middle: [10, 11, 12, 13, 14], alice: [alice] }, null, 2) + '\n',
    );
  f.git(['checkout', '--detach', `${f.head}^`]);
  write('baseline', 1, 1);
  const common = f.commit('Common expectations');
  write('baseline', 2, 1);
  const base = f.commit('Bob changes one entry');
  f.git(['checkout', '--detach', common]);
  write('baseline', 1, 2);
  const head = f.commit('Alice changes another entry');
  f.git(['checkout', '--detach', base]);
  f.git(['merge', '--no-ff', '--no-edit', head]);
  target(f, base, head, f.git(['rev-parse', 'HEAD']));
  write('generated', 1, 3);
  f.result('generated', 'S2000', 'removed.js', 2);
  await assert.rejects(f.bot().update(f.config), /cannot fully transfer.*javascript-S1000.json/s);
  assert.equal(f.git(['status', '--porcelain', '--', 'baseline']), '');
  assert.equal(f.git(['rev-parse', 'HEAD']), head);
  assertFailedReportRequested(f);
  assert.equal(
    f.state.gitCalls.some(args => args[0] === 'push'),
    false,
  );
  assert.match(f.git(['show', `HEAD:${file}`]), /"bob": \[\s*1/);
});

test('an existing-file transfer conflict fails cleanly without publishing a partial fix', async t => {
  const f = fixture(t);
  f.result('baseline', 'S1000', 'old.js', 2);
  f.git(['add', 'baseline']);
  const merge = f.git([
    'commit-tree',
    f.git(['write-tree']),
    '-p',
    f.base,
    '-p',
    f.head,
    '-m',
    'Resolved tested merge changes the same expectation',
  ]);
  f.git(['reset', '--hard', merge]);
  f.ctx.testedCommit = merge;
  await assert.rejects(f.bot().update(f.config), /transfer conflicts.*javascript-S1000.json/s);
  assert.equal(f.git(['rev-parse', 'HEAD']), f.head);
  assert.equal(f.git(['status', '--porcelain', '--', 'baseline']), '');
  assert.throws(() => f.git(['rev-parse', '--verify', 'CHERRY_PICK_HEAD']));
  assertFailedReportRequested(f);
  assert.equal(
    f.state.gitCalls.some(args => args[0] === 'push'),
    false,
  );
});

test('a rejected retry withdraws the previous fix and refreshes its merge instruction without a fix link', async t => {
  const { f, candidate, oldReport } = await rejectedRetryFixture(t);
  assert.match(oldReport, /Please review and merge/);
  await assert.rejects(f.bot().update(f.config), /cannot be represented.*javascript-S9000.json/s);
  assert.equal(candidate.state, 'closed');
  assert.equal(f.git(['ls-remote', 'origin', `refs/heads/${candidate.head.ref}`]), '');
  const dispatch = f.state.calls.find(args => args[0] === 'workflow');
  assert.ok(dispatch.includes('fix-pr-url='));
  assert.ok(dispatch.includes('ruling-failed=true'));
  assert.ok(dispatch.includes(`head-sha=${f.ctx.testedCommit}`));
  assert.equal(
    f.state.calls.some(args => args[0] === 'pr' && args[1] === 'create'),
    false,
  );
  assert.equal(f.state.gitCalls.filter(args => args[0] === 'push').length, 1);
  assert.equal(readFileSync(f.ctx.output, 'utf8'), 'report-requested=true\n');
  // The independent reporter uses the tested merge and saved artifact, not the fix checkout.
  f.git(['checkout', '-f', '--detach', f.ctx.testedCommit]);
  assert.equal(await f.bot().report(f.config), 'reported');
  const report = f.state.comments[0].body;
  assert.notEqual(report, oldReport);
  assert.match(report, /Ruling needs updating\./);
  assert.doesNotMatch(report, /Please review and merge/);
  assert.ok(!report.includes(candidate.html_url));
});

for (const supersededBy of ['new head', 'closed PR', 'new attempt', 'new Build']) {
  test(`a rejected retry makes no recovery writes after a ${supersededBy}`, async t => {
    const { f, candidate, oldReport } = await rejectedRetryFixture(t);
    f.state.beforeGit = args => {
      if (args[0] !== 'checkout' || !args.includes('-B')) return;
      if (supersededBy === 'new head') f.state.original.head.sha = f.newerCommit();
      else if (supersededBy === 'closed PR') f.state.original.state = 'closed';
      else if (supersededBy === 'new attempt') f.state.run.run_attempt++;
      else f.state.runs.push({ ...f.state.run, id: 44 });
    };
    await assert.rejects(f.bot().update(f.config), /cannot be represented/);
    assert.equal(candidate.state, 'open');
    assert.equal(f.state.comments[0].body, oldReport);
    assert.deepEqual(f.mutations(), []);
    assert.equal(existsSync(f.ctx.output), false);
  });
}

test('a rejected retry rechecks the original head after the final report-dispatch Build lookup', async t => {
  const { f, candidate } = await rejectedRetryFixture(t);
  f.state.beforeApi = endpoint => {
    if (candidate.state === 'closed' && endpoint.startsWith('actions/workflows/'))
      f.state.original.head.sha = f.newerCommit();
  };
  await assert.rejects(f.bot().update(f.config), /cannot be represented/);
  assert.equal(candidate.state, 'closed');
  assert.equal(
    f.state.calls.some(args => args[0] === 'workflow'),
    false,
  );
  assert.equal(existsSync(f.ctx.output), false);
});

test('a rejected retry preserves a fix branch changed by another writer but requests a report without its link', async t => {
  const { f, candidate } = await rejectedRetryFixture(t);
  const concurrent = f.newerCommit();
  f.state.beforeGit = args => {
    if (args[0] === 'checkout' && args.includes('-B')) f.setRemote(candidate.head.ref, concurrent);
  };
  await assert.rejects(f.bot().update(f.config), /cannot be represented/);
  assert.equal(candidate.state, 'open');
  assert.equal(
    f.git(['ls-remote', 'origin', `refs/heads/${candidate.head.ref}`]).split(/\s/)[0],
    concurrent,
  );
  assertFailedReportRequested(f);
  assert.equal(
    f.state.gitCalls.some(args => args[0] === 'push'),
    false,
  );
});

for (const failure of ['cleanup', 'dispatch', 'both']) {
  test(`a rejected retry preserves its original error when ${failure} recovery fails`, async t => {
    const { f, candidate } = await rejectedRetryFixture(t);
    const cleanupError = new Error('Cleanup unavailable');
    if (failure !== 'dispatch') {
      f.state.beforeGit = args => {
        if (args[0] === 'push') throw cleanupError;
      };
    }
    f.state.dispatchError = failure !== 'cleanup';
    await assert.rejects(f.bot().update(f.config), error => {
      assert.ok(error instanceof AggregateError);
      assert.match(error.cause.message, /cannot be represented.*javascript-S9000.json/s);
      assert.equal(error.errors[0], error.cause);
      assert.equal(error.errors.length, failure === 'both' ? 3 : 2);
      if (failure !== 'dispatch') assert.ok(error.errors.includes(cleanupError));
      if (failure !== 'cleanup') assert.match(error.errors.at(-1).message, /Dispatch unavailable/);
      return true;
    });
    assert.equal(candidate.state, failure === 'dispatch' ? 'closed' : 'open');
    const dispatch = f.state.calls.find(args => args[0] === 'workflow');
    assert.ok(
      dispatch.includes('fix-pr-url='),
      'Report dispatch is attempted even if cleanup fails',
    );
    assert.equal(existsSync(f.ctx.output), failure === 'cleanup');
  });
}

for (const command of ['commit-tree', 'commit']) {
  test(`an unrelated ${command} failure does not trigger transfer-rejection cleanup or reporting`, async t => {
    const { f, candidate, oldReport } = await rejectedRetryFixture(t);
    f.result('generated', 'S9000', 'base-only.js', 91);
    const gitError = new Error(`${command} unavailable`);
    f.state.beforeGit = args => {
      if (args[0] === command) throw gitError;
    };
    await assert.rejects(f.bot().update(f.config), error => error === gitError);
    assert.equal(candidate.state, 'open');
    assert.equal(f.state.comments[0].body, oldReport);
    assert.deepEqual(f.mutations(), []);
  });
}

test('an intentional whole-file deletion survives different original expectation content', async t => {
  const f = fixture(t);
  const file = 'baseline/project/javascript-S1000.json';
  f.result('baseline', 'S1000', 'old.js', 2);
  f.git(['add', 'baseline']);
  const merge = f.git([
    'commit-tree',
    f.git(['write-tree']),
    '-p',
    f.base,
    '-p',
    f.head,
    '-m',
    'Tested base changes an expectation before ruling removes the rule',
  ]);
  f.git(['reset', '--hard', merge]);
  f.ctx.testedCommit = merge;
  rmSync(path.join(f.workspace, 'generated/project/javascript-S1000.json'));
  assert.equal(await f.bot().update(f.config), 'updated');
  assert.equal(f.git(['rev-parse', 'HEAD^']), f.head);
  assert.equal(f.git(['ls-tree', 'HEAD', '--', file]), '');
  assert.equal(f.git(['diff', '--name-only', '--diff-filter=U']), '');
});
