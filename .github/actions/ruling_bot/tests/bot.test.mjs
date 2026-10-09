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
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { configuration } from '../config.mjs';
import { fixture, fix, comment, repository } from './fixtures.mjs';

test('failing report compares generated additions and removals with exact tested first parent', async t => {
  const f = fixture(t);
  assert.equal(await f.bot().report(f.config), 'reported');
  const body = f.state.comments[0].body;
  assert.match(body, /old\.js:4/);
  assert.match(body, /removed\.js:2/);
  assert.match(body, /untracked\.js:40/);
  assert.doesNotMatch(body, /same\.js|base-only\.js/);
  assert.match(body, /https:\/\/example.test\/sources\/blob\/main/);
  assert.match(body, /https:\/\/example.test\/rules/);
  assert.match(body, /line four/);
  assert.match(body, /<details>/);
  assert.match(body, new RegExp(`ruling-report-run: ${f.merge} 42 1`));
});

test('passing report uses committed expectations of an outdated PR, excluding shared base additions', async t => {
  const f = fixture(t);
  f.ctx.failed = false;
  assert.equal(await f.bot().report(f.config), 'reported');
  assert.match(f.state.comments[0].body, /old\.js:3/);
  assert.match(f.state.comments[0].body, /removed\.js:2/);
  assert.doesNotMatch(f.state.comments[0].body, /same\.js|base-only\.js|untracked\.js/);
});

test('moving master after testing does not change the report baseline', async t => {
  const f = fixture(t);
  f.ctx.failed = false;
  f.git(['branch', '-f', 'master', f.head]);
  f.setRemote('master', f.head);
  await f.bot().report(f.config);
  assert.doesNotMatch(f.state.comments[0].body, /same\.js|base-only\.js/);
  assert.match(f.state.comments[0].body, /old\.js:3/);
});

for (const scenario of ['head advanced', 'closed', 'newer Build', 'retry attempt']) {
  test(`stale ${scenario} neither reports nor closes current fixes`, async t => {
    const f = fixture(t);
    f.ctx.failed = false;
    f.state.prs.push(fix());
    f.state.comments.push(comment('<!-- ruling-report -->\nCurrent report'));
    if (scenario === 'head advanced') f.state.original.head.sha = 'b'.repeat(40);
    if (scenario === 'closed') f.state.original.state = 'closed';
    if (scenario === 'newer Build') f.state.runs.push({ ...f.state.run, id: 43 });
    if (scenario === 'retry attempt') f.state.run.run_attempt = 2;
    assert.equal(await f.bot().update(f.config), 'stale');
    assert.equal(await f.bot().report(f.config), 'stale');
    assert.equal(await f.bot().checkReport(), false);
    assert.deepEqual(f.mutations(), []);
    assert.equal(
      f.state.gitCalls.some(args => args[0] === 'push'),
      false,
    );
  });
}

for (const scenario of [
  'wrong checkout',
  'wrong base',
  'missing base',
  'wrong head',
  'not a merge',
]) {
  test(`${scenario} fails before any report mutation`, async t => {
    const f = fixture(t);
    if (scenario === 'wrong checkout') f.ctx.testedCommit = f.head;
    if (scenario === 'wrong base') f.ctx.base = f.head;
    if (scenario === 'wrong head') f.ctx.testedHead = f.base;
    if (scenario === 'not a merge') {
      f.git(['checkout', '--detach', f.head]);
      f.ctx.testedCommit = f.head;
    }
    if (scenario === 'missing base') {
      f.ctx.isPullRequest = false;
      f.ctx.base = 'b'.repeat(40);
    }
    await assert.rejects(f.bot().report(f.config));
    assert.deepEqual(f.mutations(), []);
  });
}

test('head changes during generation: leave the existing comment untouched', async t => {
  const f = fixture(t);
  f.state.comments.push(comment('<!-- ruling-report -->\nNewer report'));
  f.state.beforeApi = endpoint => {
    if (endpoint.startsWith('issues/123/comments?')) f.state.original.head.sha = 'b'.repeat(40);
  };
  assert.equal(await f.bot().report(f.config), 'stale');
  assert.equal(f.state.comments[0].body, '<!-- ruling-report -->\nNewer report');
  assert.deepEqual(f.mutations(), []);
});

test('passing retry closes only open fixes and dispatches report refresh from the tested branch', async t => {
  const f = fixture(t);
  f.ctx.failed = false;
  const candidate = fix();
  candidate.head.sha = f.head;
  f.state.prs.push(candidate, fix({ number: 457, state: 'closed', merged_at: 'now' }));
  f.setRemote(candidate.head.ref, f.head);
  assert.equal(await f.bot().update(f.config), 'passed');
  assert.equal(candidate.state, 'closed');
  assert.equal(f.git(['ls-remote', 'origin', `refs/heads/${candidate.head.ref}`]), '');
  assert.ok(
    f.state.gitCalls.some(args =>
      args.includes(`--force-with-lease=refs/heads/${candidate.head.ref}:${f.head}`),
    ),
  );
  const dispatch = f.state.calls.find(args => args[0] === 'workflow');
  assert.equal(dispatch[dispatch.indexOf('--ref') + 1], 'outdated-pr');
  assert.ok(dispatch.includes('ruling-failed=false'));
  assert.ok(dispatch.includes(`head-sha=${f.merge}`));
  assert.ok(dispatch.includes(`base-sha=${f.base}`));
});

test('failed update preserves the tested merge and discards unrelated dirty generated files', async t => {
  const f = fixture(t);
  f.write('tracked-generated.txt', 'unrelated dirty build output\n');
  assert.equal(await f.bot().update(f.config), 'updated');
  assert.equal(readFileSync(path.join(f.workspace, 'tracked-generated.txt'), 'utf8'), 'clean\n');
  assert.match(
    readFileSync(path.join(f.workspace, 'baseline/project/javascript-S1000.json'), 'utf8'),
    /\[4\]/,
  );
  assert.ok(existsSync(path.join(f.workspace, 'baseline/project/javascript-S4000.json')));
  assert.equal(existsSync(path.join(f.workspace, 'baseline/project/javascript-S2000.json')), false);
  const changed = f.git(['diff', '--name-only', f.head, 'HEAD']).split('\n');
  assert.ok(changed.every(name => name.startsWith('baseline/')));
  assert.equal(f.git(['rev-parse', 'HEAD^']), f.merge);
  assert.match(f.state.prs[0].body, /ruling-bot-target/);
  assert.ok(
    f.state.gitCalls.some(args =>
      args.includes('--force-with-lease=refs/heads/fix/update-ruling-for-pr-123:'),
    ),
  );
  const dispatch = f.state.calls.find(args => args[0] === 'workflow');
  assert.equal(dispatch[dispatch.indexOf('--ref') + 1], 'outdated-pr');
  assert.equal(dispatch[2], 'custom-report.yml');
  for (const [name, value] of Object.entries(f.config))
    assert.ok(dispatch.includes(`${name}=${value}`));
  assert.equal(dispatch.filter(value => value === '-f').length, 20);
  assert.equal(
    dispatch.some(value => value.startsWith('report-config=')),
    false,
  );
  assert.ok(dispatch.includes('fix-pr-url=https://example.test/pull/456'));
});

test('an explicitly configured reporter workflow ref is honored', async t => {
  const f = fixture(t);
  f.ctx.failed = false;
  await f.bot().update({ ...f.config, 'report-workflow-ref': 'stable-tooling' });
  const dispatch = f.state.calls.find(args => args[0] === 'workflow');
  assert.equal(dispatch[dispatch.indexOf('--ref') + 1], 'stable-tooling');
});

test('a changed base-only expectation survives fix creation and merging into the original branch', async t => {
  const f = fixture(t);
  const file = 'baseline/project/javascript-S9000.json';
  assert.throws(() => f.git(['show', `${f.head}:${file}`]));
  f.result('generated', 'S9000', 'base-only.js', 91);
  assert.equal(await f.bot().update(f.config), 'updated');
  const update = f.git(['rev-parse', 'HEAD']);
  assert.equal(f.git(['rev-parse', 'HEAD^']), f.merge);
  assert.match(f.git(['show', `HEAD:${file}`]), /91/);
  assert.equal(f.state.prs[0].base.ref, 'outdated-pr');
  assert.ok(f.state.calls.some(args => args[0] === 'workflow'));
  f.git(['checkout', '--detach', f.head]);
  f.git(['merge', '--no-ff', '--no-edit', update]);
  // The tested master history is already included, so its independently added file cannot
  // create an add/add conflict when the original PR is merged into master.
  f.git(['merge', '--no-ff', '--no-edit', f.base]);
  assert.equal(f.git(['status', '--porcelain']), '');
  assert.match(f.git(['show', `HEAD:${file}`]), /91/);
});

test('fix commits change only expectations while retaining unrelated tested base history', async t => {
  const f = fixture(t);
  f.git(['checkout', '--detach', f.base]);
  f.write('base-only-code.ts', 'export const fromMaster = true;\n');
  const base = f.commit('Master adds unrelated source code');
  f.git(['merge', '--no-ff', '--no-edit', f.head]);
  const merge = f.git(['rev-parse', 'HEAD']);
  Object.assign(f.ctx, { base, testedCommit: merge });
  f.setRemote('master', base);
  f.result('generated', 'S9000', 'base-only.js', 91);
  assert.equal(await f.bot().update(f.config), 'updated');
  assert.equal(f.git(['rev-parse', 'HEAD^']), merge);
  assert.ok(
    f
      .git(['diff', '--name-only', 'HEAD^', 'HEAD'])
      .split('\n')
      .every(name => name.startsWith('baseline/')),
  );
  assert.match(f.git(['show', 'HEAD:base-only-code.ts']), /fromMaster/);
  assert.equal(f.git(['merge-base', '--is-ancestor', base, 'HEAD']), '');
});

test('a depth-two tested checkout supports fix persistence and exact-base reporting', async t => {
  const f = fixture(t);
  f.write('.git/shallow', `${f.base}\n${f.head}\n`);
  assert.equal(f.git(['rev-parse', '--is-shallow-repository']), 'true');
  f.result('generated', 'S9000', 'base-only.js', 91);
  assert.equal(await f.bot().update(f.config), 'updated');
  assert.equal(f.git(['rev-parse', 'HEAD^']), f.merge);
  assert.ok(f.git(['ls-remote', 'origin', 'refs/heads/fix/update-ruling-for-pr-123']));
  f.git(['checkout', '--detach', f.merge]);
  assert.equal(await f.bot().report(f.config), 'reported');
  assert.match(f.state.comments[0].body, /base-only\.js:91/);
});

for (const absolute of [false, true]) {
  test(`report preflight and artifact download agree on ${absolute ? 'absolute' : 'relative'} result paths`, async t => {
    const f = fixture(t);
    const destination = path.join(f.workspace, 'generated');
    const config = configuration(
      { ...f.config, 'new-results-path': absolute ? destination : 'nested/../generated' },
      f.workspace,
    );
    f.ctx.output = path.join(f.workspace, 'report-output');
    assert.equal(await f.bot().checkReport(config), true);
    assert.equal(readFileSync(f.ctx.output, 'utf8'), `results-path=${destination}\n`);
    assert.equal(await f.bot().report(config), 'reported');
    assert.match(f.state.comments[0].body, /old\.js:4/);
  });
}

test('updater retry dispatches current Build attempt with the original producing artifact', async t => {
  const f = fixture(t);
  f.ctx.runAttempt = '3';
  f.state.run.run_attempt = 3;
  const config = { ...f.config, 'results-artifact-name': 'actual_js_ts-1' };
  assert.equal(await f.bot().update(config), 'updated');
  const dispatch = f.state.calls.find(args => args[0] === 'workflow');
  assert.ok(dispatch.includes('run-attempt=3'));
  assert.ok(dispatch.includes('results-artifact-name=actual_js_ts-1'));
});

test('failed dispatch is visible after the fix was persisted; retry reuses the open fix', async t => {
  const f = fixture(t);
  f.state.dispatchError = true;
  await assert.rejects(f.bot().update(f.config), /Dispatch unavailable/);
  assert.equal(f.state.prs.length, 1);
  f.state.dispatchError = false;
  f.git(['checkout', '--detach', f.merge]);
  assert.equal(await f.bot().update(f.config), 'updated');
  assert.equal(f.state.prs.length, 1);
});

test('lease rejects a concurrent fix update without creating a PR or dispatch', async t => {
  const f = fixture(t);
  f.state.beforeGit = args => {
    if (args[0] === 'push') f.setRemote('fix/update-ruling-for-pr-123', f.newerCommit());
  };
  await assert.rejects(f.bot().update(f.config));
  assert.deepEqual(f.mutations(), []);
});

test('existing unrelated fix branch is never overwritten', async t => {
  const f = fixture(t);
  f.setRemote('fix/update-ruling-for-pr-123', f.head);
  await assert.rejects(f.bot().update(f.config), /not owned/);
  assert.equal(
    f.git(['ls-remote', 'origin', 'refs/heads/fix/update-ruling-for-pr-123']).split(/\s/)[0],
    f.head,
  );
  assert.deepEqual(f.mutations(), []);
});

test('orphan branch from failed PR creation is recoverable through commit identity', async t => {
  const f = fixture(t);
  await f.bot().update(f.config);
  f.state.prs = [];
  f.git(['checkout', '--detach', f.merge]);
  assert.equal(await f.bot().update(f.config), 'updated');
  assert.equal(f.state.prs.length, 1);
});

test('open legacy fix for this original PR keeps its existing branch and PR', async t => {
  const f = fixture(t);
  const candidate = fix();
  candidate.head.sha = f.head;
  f.state.prs.push(candidate);
  f.setRemote(candidate.head.ref, f.head);
  assert.equal(await f.bot().update(f.config), 'updated');
  assert.equal(f.state.prs.length, 1);
  assert.equal(f.git(['branch', '--show-current']), candidate.head.ref);
  assert.match(candidate.body, /ruling-bot-target/);
  const dispatch = f.state.calls.find(args => args[0] === 'workflow');
  assert.ok(dispatch.includes(`fix-pr-url=${candidate.html_url}`));
});

test('two original PRs sharing a source branch get independent fixes, reports and cleanup', async t => {
  const f = fixture(t);
  assert.equal(await f.bot().update(f.config), 'updated');
  const first = f.state.prs[0];
  const firstTip = f.git(['ls-remote', 'origin', `refs/heads/${first.head.ref}`]).split(/\s/)[0];
  assert.equal(first.head.ref, 'fix/update-ruling-for-pr-123');

  f.git(['checkout', '--detach', f.merge]);
  f.ctx.pr = '124';
  f.ctx.runId = '43';
  f.state.original.number = 124;
  f.state.run.id = 43;
  f.state.run.pull_requests = [{ number: 124 }];
  assert.equal(await f.bot().update(f.config), 'updated');
  const second = f.state.prs[1];
  const secondTip = f.git(['ls-remote', 'origin', `refs/heads/${second.head.ref}`]).split(/\s/)[0];
  assert.equal(second.head.ref, 'fix/update-ruling-for-pr-124');
  assert.equal(first.base.ref, second.base.ref);
  assert.equal(
    f.git(['ls-remote', 'origin', `refs/heads/${first.head.ref}`]).split(/\s/)[0],
    firstTip,
  );
  for (const [number, candidate] of [
    [123, first],
    [124, second],
  ]) {
    const dispatch = f.state.calls.find(
      args => args[0] === 'workflow' && args.includes(`pr-number=${number}`),
    );
    assert.ok(dispatch.includes(`fix-pr-url=${candidate.html_url}`));
  }

  f.ctx.pr = '123';
  f.state.original.number = 123;
  f.state.original.state = 'closed';
  assert.equal(await f.bot().cleanup(), 'closed');
  assert.equal(first.state, 'closed');
  assert.equal(f.git(['ls-remote', 'origin', `refs/heads/${first.head.ref}`]), '');
  assert.equal(second.state, 'open');
  assert.equal(
    f.git(['ls-remote', 'origin', `refs/heads/${second.head.ref}`]).split(/\s/)[0],
    secondTip,
  );
});

for (const open of [true, false]) {
  test(`legacy-name branch belonging to another ${open ? 'open' : 'closed'} original stays intact`, async t => {
    const f = fixture(t);
    const branch = 'fix/update-ruling-for-outdated-pr';
    const marker = `<!-- ruling-bot-target: ${JSON.stringify({ repository, pr: 999 })} -->`;
    const oldFix = f.git([
      '-c',
      'user.name=github-actions[bot]',
      '-c',
      'user.email=github-actions[bot]@users.noreply.github.com',
      'commit-tree',
      `${f.head}^{tree}`,
      '-p',
      f.head,
      '-m',
      `Update ruling results\n\nGenerated with GitHub Actions${open ? '' : `\n\n${marker}`}`,
    ]);
    f.setRemote(branch, oldFix);
    f.state.prs.push(
      fix({
        number: 999,
        state: open ? 'open' : 'closed',
        title: 'Update ruling results for PR #999',
        body: 'Auto-generated ruling update for PR #999.',
        head: { ref: branch, sha: oldFix, repo: { full_name: repository } },
      }),
    );
    assert.equal(await f.bot().update(f.config), 'updated');
    assert.equal(f.git(['branch', '--show-current']), 'fix/update-ruling-for-pr-123');
    assert.equal(f.git(['ls-remote', 'origin', `refs/heads/${branch}`]).split(/\s/)[0], oldFix);
    assert.equal(f.state.prs[0].state, open ? 'open' : 'closed');
    assert.equal(f.state.prs[1].title, 'Update ruling results for PR #123');
  });
}

test('unmarked legacy orphan is left intact when another original PR shares the source branch', async t => {
  const f = fixture(t);
  const branch = 'fix/update-ruling-for-outdated-pr';
  const oldFix = f.git([
    '-c',
    'user.name=github-actions[bot]',
    '-c',
    'user.email=github-actions[bot]@users.noreply.github.com',
    'commit-tree',
    `${f.head}^{tree}`,
    '-p',
    f.head,
    '-m',
    'Update ruling results\n\nGenerated with GitHub Actions',
  ]);
  f.setRemote(branch, oldFix);
  f.state.prs.push(
    fix({
      number: 124,
      title: 'Another feature PR',
      body: '',
      user: { login: 'human' },
      head: { ref: f.ctx.targetRef, sha: f.head, repo: { full_name: repository } },
      base: { ref: 'release' },
    }),
  );
  assert.equal(await f.bot().update(f.config), 'updated');
  assert.equal(f.git(['branch', '--show-current']), 'fix/update-ruling-for-pr-123');
  assert.equal(f.git(['ls-remote', 'origin', `refs/heads/${branch}`]).split(/\s/)[0], oldFix);
});

for (const scenario of [
  'legacy',
  'human author',
  'human committer',
  'wrong message',
  'wrong target',
]) {
  test(`leftover fix branch recovery: ${scenario}`, async t => {
    const f = fixture(t);
    const branch =
      scenario === 'legacy' ? 'fix/update-ruling-for-outdated-pr' : 'fix/update-ruling-for-pr-123';
    let message = 'Update ruling results\n\nGenerated with GitHub Actions';
    if (scenario === 'wrong message') message += '\n\nUnrelated change';
    if (scenario === 'wrong target')
      message += `\n\n<!-- ruling-bot-target: ${JSON.stringify({ repository, pr: 999 })} -->`;
    const oldFix = f.git([
      '-c',
      'user.name=github-actions[bot]',
      '-c',
      'user.email=github-actions[bot]@users.noreply.github.com',
      '-c',
      `author.name=${scenario === 'human author' ? 'Human' : 'github-actions[bot]'}`,
      '-c',
      `committer.name=${scenario === 'human committer' ? 'Human' : 'github-actions[bot]'}`,
      'commit-tree',
      `${f.head}^{tree}`,
      '-p',
      f.head,
      '-m',
      message,
    ]);
    f.setRemote(branch, oldFix);
    f.state.prs.push(fix({ state: 'closed', head: { ref: branch, sha: oldFix } }));
    if (scenario === 'legacy') {
      assert.equal(await f.bot().update(f.config), 'updated');
      assert.equal(f.state.prs.filter(pr => pr.state === 'open').length, 1);
      assert.match(f.git(['log', '-1', '--format=%B']), /ruling-bot-target/);
      assert.ok(
        f.state.gitCalls.some(args =>
          args.includes(`--force-with-lease=refs/heads/${branch}:${oldFix}`),
        ),
      );
    } else {
      await assert.rejects(f.bot().update(f.config), /not owned/);
      assert.equal(f.git(['ls-remote', 'origin', `refs/heads/${branch}`]).split(/\s/)[0], oldFix);
      assert.deepEqual(f.mutations(), []);
    }
  });
}

test('target advances after sync: no stale fix is pushed', async t => {
  const f = fixture(t);
  f.state.beforeGit = args => {
    if (args[0] === 'fetch') f.setRemote('outdated-pr', f.newerCommit());
  };
  assert.equal(await f.bot().update(f.config), 'stale');
  assert.deepEqual(f.mutations(), []);
  assert.equal(
    f.state.gitCalls.some(args => args[0] === 'push'),
    false,
  );
});

for (const legacy of [true, false]) {
  test(`${legacy ? 'legacy' : 'modern orphan'} branch used by another open PR is never overwritten`, async t => {
    const f = fixture(t);
    const branch = 'fix/update-ruling-for-pr-123';
    const marker = `<!-- ruling-bot-target: ${JSON.stringify({ repository, pr: 123 })} -->`;
    const message =
      'Update ruling results\n\nGenerated with GitHub Actions' + (legacy ? '' : `\n\n${marker}`);
    const oldFix = f.git([
      '-c',
      'user.name=github-actions[bot]',
      '-c',
      'user.email=github-actions[bot]@users.noreply.github.com',
      'commit-tree',
      `${f.head}^{tree}`,
      '-p',
      f.head,
      '-m',
      message,
    ]);
    f.setRemote(branch, oldFix);
    f.state.prs.push(
      fix({
        title: 'Update ruling results for PR #999',
        body: 'Auto-generated ruling update for PR #999.',
        head: { ref: branch, sha: oldFix, repo: { full_name: repository } },
      }),
    );
    await assert.rejects(f.bot().update(f.config), /used by another open PR/);
    assert.equal(f.git(['ls-remote', 'origin', `refs/heads/${branch}`]).split(/\s/)[0], oldFix);
    assert.deepEqual(f.mutations(), []);
    assert.equal(
      f.state.gitCalls.some(args => args[0] === 'push'),
      false,
    );
  });
}

for (const raw of [true, false]) {
  for (const previous of ['bot', 'absent', 'human']) {
    test(`empty ${raw ? 'raw PR' : 'Build'} report with ${previous} comment clears only stale bot reports`, async t => {
      const f = fixture(t);
      if (raw) f.ctx.runId = '';
      f.ctx.failed = false;
      f.git(['restore', '--source', f.base, '--staged', '--worktree', 'baseline']);
      if (previous !== 'absent') {
        const existing = comment('<!-- ruling-report -->\nPrevious report');
        if (previous === 'human') existing.user.login = 'human';
        f.state.comments.push(existing);
      }
      assert.equal(await f.bot().report(f.config), 'empty');
      if (previous === 'human') {
        assert.equal(f.state.comments.length, 1);
        assert.equal(f.state.comments[0].body, '<!-- ruling-report -->\nPrevious report');
      } else assert.deepEqual(f.state.comments, []);
      if (previous === 'bot') assert.ok(f.mutations().some(args => args.includes('DELETE')));
      else assert.deepEqual(f.mutations(), []);
    });
  }
}

test('zero net changes on a failed report without a fix link still require an update', async t => {
  const f = fixture(t);
  rmSync(path.join(f.workspace, 'generated'), { recursive: true });
  f.result('generated', 'S1000', 'old.js', 1);
  f.result('generated', 'S2000', 'removed.js', 2);
  f.result('generated', 'S3000', 'same.js', 30);
  f.result('generated', 'S9000', 'base-only.js', 90);
  assert.equal(await f.bot().report(f.config), 'reported');
  const body = f.state.comments[0].body;
  assert.match(body, /Ruling needs updating/);
  assert.match(body, /No net issue changes.*expectations still need updating/);
  assert.doesNotMatch(body, /No changes to ruling expected issues|Ruling passed|linked fix/);
});

test('zero net changes retain the required fix link', async t => {
  const f = fixture(t);
  f.ctx.fixUrl = 'https://example.test/pull/456';
  rmSync(path.join(f.workspace, 'generated'), { recursive: true });
  f.result('generated', 'S1000', 'old.js', 1);
  f.result('generated', 'S2000', 'removed.js', 2);
  f.result('generated', 'S3000', 'same.js', 30);
  f.result('generated', 'S9000', 'base-only.js', 90);
  assert.equal(await f.bot().report(f.config), 'reported');
  assert.match(f.state.comments[0].body, /No net issue changes/);
  assert.match(f.state.comments[0].body, /\[fix PR\]\(https:\/\/example.test\/pull\/456\)/);
});

test('late raw PR event does not replace completed Build report for same tested merge', async t => {
  const f = fixture(t);
  f.ctx.runId = '';
  f.ctx.failed = false;
  const body = `<!-- ruling-report -->\n<!-- ruling-report-run: ${f.merge} 42 1 -->\nCompleted Build`;
  f.state.comments.push(comment(body));
  assert.equal(await f.bot().report(f.config), 'completed-report-exists');
  assert.equal(f.state.comments[0].body, body);
  assert.deepEqual(f.mutations(), []);
});

test('raw PR event can refresh a previous raw report', async t => {
  const f = fixture(t);
  f.ctx.runId = '';
  f.ctx.failed = false;
  f.state.comments.push(
    comment(`<!-- ruling-report -->\n<!-- ruling-report-run: ${f.merge}  1 -->\nRaw report`),
  );
  assert.equal(await f.bot().report(f.config), 'reported');
  assert.doesNotMatch(f.state.comments[0].body, /Ruling passed|No fix PR was needed/);
  assert.match(f.state.comments[0].body, /old\.js:3/);
});

test('human comments carrying report marker are left alone', async t => {
  const f = fixture(t);
  f.state.comments.push({ ...comment('<!-- ruling-report -->\nHuman'), user: { login: 'human' } });
  await f.bot().report(f.config);
  assert.equal(f.state.comments[0].body, '<!-- ruling-report -->\nHuman');
  assert.equal(f.state.comments.length, 2);
});

test('default-branch failure reports generated results on the fix PR', async t => {
  const f = fixture(t);
  f.git(['checkout', '--detach', f.base]);
  Object.assign(f.ctx, {
    isPullRequest: false,
    testedCommit: f.base,
    testedHead: f.base,
    targetRef: 'master',
    base: f.base,
  });
  f.state.run.head_sha = f.base;
  f.state.run.head_branch = 'master';
  f.state.run.event = 'push';
  f.state.run.pull_requests = [];
  assert.equal(await f.bot().update(f.config), 'updated');
  const dispatch = f.state.calls.find(args => args[0] === 'workflow');
  assert.ok(dispatch.includes('pr-number=456'));
  assert.ok(dispatch.includes('is-pull-request=false'));
  f.git(['checkout', '--detach', f.base]);
  f.ctx.pr = '456';
  assert.equal(await f.bot().report(f.config), 'reported');
  const post = f.state.commentWrites.find(write => write.endpoint === 'issues/456/comments');
  assert.match(post.body, /untracked.js:40/);
  assert.doesNotMatch(post.body, /Ruling needs updating/);
});

test('empty default-branch failure report on its generated fix avoids original-PR instructions', async t => {
  const f = fixture(t);
  f.git(['checkout', '--detach', f.base]);
  Object.assign(f.ctx, {
    isPullRequest: false,
    pr: '456',
    testedCommit: f.base,
    testedHead: f.base,
    targetRef: 'master',
    base: f.base,
  });
  Object.assign(f.state.run, {
    head_sha: f.base,
    head_branch: 'master',
    event: 'push',
    pull_requests: [],
  });
  f.state.prs.push(fix());
  rmSync(path.join(f.workspace, 'generated'), { recursive: true });
  f.result('generated', 'S1000', 'old.js', 1);
  f.result('generated', 'S2000', 'removed.js', 2);
  f.result('generated', 'S3000', 'same.js', 30);
  f.result('generated', 'S9000', 'base-only.js', 90);
  assert.equal(await f.bot().report(f.config), 'reported');
  const post = f.state.commentWrites.find(write => write.endpoint === 'issues/456/comments');
  assert.match(post.body, /No net issue changes relative to the tested base/);
  assert.doesNotMatch(post.body, /Ruling needs updating|expectations still need|Ruling passed/);
});

test('stale default-branch run cannot close current fixes', async t => {
  const f = fixture(t);
  f.git(['checkout', '--detach', f.base]);
  Object.assign(f.ctx, {
    isPullRequest: false,
    failed: false,
    testedCommit: f.base,
    testedHead: f.base,
    targetRef: 'master',
  });
  f.state.branchHead = f.head;
  assert.equal(await f.bot().update(f.config), 'stale');
  assert.deepEqual(f.mutations(), []);
});

for (const merged of [false, true]) {
  test(`original PR ${merged ? 'merged' : 'closed'} cleans retargeted new and legacy fixes by identity`, async t => {
    const f = fixture(t);
    f.state.original.state = 'closed';
    f.state.original.merged_at = merged ? 'now' : null;
    const legacy = fix({ base: { ref: 'master' } });
    legacy.head.sha = f.head;
    const modern = fix({
      number: 457,
      base: { ref: 'master' },
      body: `Changed prose\n<!-- ruling-bot-target: ${JSON.stringify({ repository, pr: 123 })} -->`,
      head: { ref: 'fix/update-ruling-for-renamed', sha: f.head, repo: { full_name: repository } },
    });
    f.state.prs.push(legacy, modern);
    for (const candidate of f.state.prs) f.setRemote(candidate.head.ref, f.head);
    assert.equal(await f.bot().cleanup(), 'closed');
    assert.ok(f.state.prs.every(pr => pr.state === 'closed'));
    assert.equal(f.git(['ls-remote', 'origin', 'refs/heads/fix/*']), '');
  });
}

test('cleanup excludes unrelated, human-created, merged and foreign-repository fixes', async t => {
  const f = fixture(t);
  f.state.original.state = 'closed';
  const marker = `<!-- ruling-bot-target: ${JSON.stringify({ repository, pr: 123 })} -->`;
  f.state.prs.push(
    fix({
      title: 'Update ruling results for PR #1234',
      body: 'Auto-generated ruling update for PR #1234.',
    }),
    fix({ user: { login: 'human' }, body: marker }),
    fix({ state: 'closed', merged_at: 'now' }),
    fix({
      head: {
        ref: 'fix/update-ruling-for-outdated-pr',
        sha: f.head,
        repo: { full_name: 'foreign/repo' },
      },
    }),
  );
  await f.bot().cleanup();
  assert.deepEqual(f.mutations(), []);
  assert.equal(
    f.state.gitCalls.some(args => args[0] === 'push'),
    false,
  );
});

test('cleanup closes the obsolete owned fix but preserves a branch shared by another open PR', async t => {
  const f = fixture(t);
  f.state.original.state = 'closed';
  const candidate = fix();
  candidate.head.sha = f.head;
  const other = fix({
    number: 457,
    title: 'Another PR using these changes',
    body: '',
    user: { login: 'human' },
    head: { ...candidate.head },
    base: { ref: 'release' },
  });
  f.state.prs.push(candidate, other);
  f.setRemote(candidate.head.ref, f.head);
  assert.equal(await f.bot().cleanup(), 'closed');
  assert.equal(candidate.state, 'closed');
  assert.equal(other.state, 'open');
  assert.equal(
    f.git(['ls-remote', 'origin', `refs/heads/${candidate.head.ref}`]).split(/\s/)[0],
    f.head,
  );
  assert.equal(
    f.state.gitCalls.some(args => args[0] === 'push'),
    false,
  );
});

test('reopened original PR skips delayed close-event cleanup', async t => {
  const f = fixture(t);
  f.state.prs.push(fix());
  assert.equal(await f.bot().cleanup(), 'reopened');
  assert.deepEqual(f.mutations(), []);
});

test('original PR reopens during cleanup: leave fixes intact', async t => {
  const f = fixture(t);
  f.state.original.state = 'closed';
  f.state.prs.push(fix());
  f.state.beforeApi = endpoint => {
    if (endpoint.startsWith('pulls?')) f.state.original.state = 'open';
  };
  await f.bot().cleanup();
  assert.deepEqual(f.mutations(), []);
});

test('fix advanced after listing: cleanup leaves it intact', async t => {
  const f = fixture(t);
  f.state.original.state = 'closed';
  const candidate = fix();
  candidate.head.sha = f.head;
  f.state.prs.push(candidate);
  f.setRemote(candidate.head.ref, f.newerCommit());
  await f.bot().cleanup();
  assert.deepEqual(f.mutations(), []);
  assert.equal(candidate.state, 'open');
});

test('delete lease catches update in the final cleanup window', async t => {
  const f = fixture(t);
  f.state.original.state = 'closed';
  const candidate = fix();
  candidate.head.sha = f.head;
  f.state.prs.push(candidate);
  f.setRemote(candidate.head.ref, f.head);
  f.state.beforeGit = args => {
    if (args[0] === 'push') f.setRemote(candidate.head.ref, f.newerCommit());
  };
  await assert.rejects(f.bot().cleanup());
  assert.deepEqual(f.mutations(), []);
  assert.equal(candidate.state, 'open');
});

test('update stages deletion of expectations absent from generated artifact', async t => {
  const f = fixture(t);
  rmSync(path.join(f.workspace, 'generated/project/javascript-S3000.json'));
  assert.equal(await f.bot().update(f.config), 'updated');
  assert.equal(existsSync(path.join(f.workspace, 'baseline/project/javascript-S3000.json')), false);
  assert.match(
    f.git(['diff', '--name-status', f.head, 'HEAD']),
    /D\s+baseline\/project\/javascript-S3000.json/,
  );
});

test('missing saved results fails without generating an empty replacement', async t => {
  const f = fixture(t);
  rmSync(path.join(f.workspace, 'generated'), { recursive: true });
  await assert.rejects(f.bot().report(f.config));
  assert.deepEqual(f.mutations(), []);
});

for (const failed of [false, true]) {
  test(`a bot-generated PR head ${failed ? 'can receive needed expectation updates' : 'creates no fix when ruling passes'}`, async t => {
    const f = fixture(t);
    const head = f.git([
      'commit-tree',
      `${f.head}^{tree}`,
      '-p',
      f.head,
      '-m',
      'Update ruling results\n\nGenerated with GitHub Actions',
    ]);
    const merge = f.git([
      'commit-tree',
      `${f.merge}^{tree}`,
      '-p',
      f.base,
      '-p',
      head,
      '-m',
      `Merge ${head} into ${f.base}`,
    ]);
    f.setRemote('outdated-pr', head);
    f.git(['checkout', '--detach', merge]);
    Object.assign(f.ctx, { testedCommit: merge, testedHead: head, failed });
    f.state.original.head.sha = head;
    f.state.run.head_sha = head;
    assert.equal(await f.bot().update(f.config), failed ? 'updated' : 'passed');
    assert.equal(f.state.prs.length, failed ? 1 : 0);
    if (failed) assert.match(f.git(['show', 'HEAD:baseline/project/javascript-S1000.json']), /4/);
    else
      assert.equal(
        f.state.gitCalls.some(args => args[0] === 'push' || args[0] === 'commit'),
        false,
      );
  });
}

test('a bot-generated default-branch head can receive needed expectation updates', async t => {
  const f = fixture(t);
  const head = f.git([
    'commit-tree',
    `${f.base}^{tree}`,
    '-p',
    f.base,
    '-m',
    'Update ruling results\n\nGenerated with GitHub Actions',
  ]);
  f.setRemote('master', head);
  f.git(['checkout', '--detach', head]);
  Object.assign(f.ctx, {
    isPullRequest: false,
    targetRef: 'master',
    testedCommit: head,
    testedHead: head,
    base: head,
  });
  Object.assign(f.state.run, {
    head_sha: head,
    head_branch: 'master',
    event: 'push',
    pull_requests: [],
  });
  f.state.branchHead = head;
  assert.equal(await f.bot().update(f.config), 'updated');
  assert.equal(f.state.prs.length, 1);
});

test('a successful dispatch exposes the output used to record Build authority', async t => {
  const f = fixture(t);
  f.ctx.failed = false;
  f.ctx.output = path.join(f.workspace, 'dispatch-output');
  assert.equal(await f.bot().update(f.config), 'passed');
  assert.equal(readFileSync(f.ctx.output, 'utf8'), 'report-requested=true\n');
});

test('a failed dispatch never records Build authority', async t => {
  const f = fixture(t);
  f.ctx.failed = false;
  f.ctx.output = path.join(f.workspace, 'dispatch-output');
  f.state.dispatchError = true;
  await assert.rejects(f.bot().update(f.config), /Dispatch unavailable/);
  assert.equal(existsSync(f.ctx.output), false);
});

test('an empty newer Build report cannot be resurrected by an older raw merge', async t => {
  const f = fixture(t);
  const nextBase = f.git([
    'commit-tree',
    `${f.merge}^{tree}`,
    '-p',
    f.base,
    '-m',
    'Base acquires the same expectations',
  ]);
  const nextMerge = f.git([
    'commit-tree',
    `${f.merge}^{tree}`,
    '-p',
    nextBase,
    '-p',
    f.head,
    '-m',
    'New tested merge',
  ]);
  f.git(['checkout', '--detach', nextMerge]);
  f.state.runs.push({ ...f.state.run, id: 43 });
  Object.assign(f.ctx, { testedCommit: nextMerge, base: nextBase, failed: false, runId: '43' });
  f.state.comments.push(comment('<!-- ruling-report -->\nOlder report'));
  assert.equal(await f.bot().report(f.config), 'empty');
  assert.deepEqual(f.state.comments, []);
  f.state.jobs.set(43, [
    { steps: [{ name: f.config['report-dispatch-step'], conclusion: 'success' }] },
  ]);
  f.git(['checkout', '--detach', f.merge]);
  Object.assign(f.ctx, { testedCommit: f.merge, base: f.base, runId: '' });
  f.state.calls = [];
  assert.equal(await f.bot().report(f.config), 'completed-report-exists');
  assert.deepEqual(f.state.comments, []);
  assert.deepEqual(f.mutations(), []);
  assert.ok(f.state.calls.some(args => args[1]?.includes('actions/runs/43/jobs?filter=all')));
});

for (const scenario of [
  'legacy-success',
  'failed-dispatch',
  'skipped-dispatch',
  'other-pr',
  'earlier-head',
  'success',
]) {
  test(`raw report without a comment handles ${scenario} Build evidence`, async t => {
    const f = fixture(t);
    f.ctx.runId = '';
    f.ctx.failed = false;
    const run = { ...f.state.run, id: 43 };
    if (scenario === 'other-pr') run.pull_requests = [{ number: 124 }];
    if (scenario === 'earlier-head') run.head_sha = f.base;
    f.state.runs.push(run);
    f.state.jobs.set(43, [
      {
        steps: [
          {
            name:
              scenario === 'legacy-success'
                ? 'Update ruling results'
                : f.config['report-dispatch-step'],
            conclusion:
              scenario === 'failed-dispatch'
                ? 'failure'
                : scenario === 'skipped-dispatch'
                  ? 'skipped'
                  : 'success',
          },
        ],
      },
    ]);
    assert.equal(
      await f.bot().report(f.config),
      scenario === 'success' ? 'completed-report-exists' : 'reported',
    );
    assert.equal(f.state.comments.length, scenario === 'success' ? 0 : 1);
  });
}

test('raw report checks freshness again after querying dispatch evidence', async t => {
  const f = fixture(t);
  f.ctx.runId = '';
  f.ctx.failed = false;
  f.state.beforeApi = endpoint => {
    if (endpoint.includes('/jobs?')) f.state.original.head.sha = f.base;
  };
  assert.equal(await f.bot().report(f.config), 'stale');
  assert.deepEqual(f.mutations(), []);
});

test('an updater-only retry does not erase an earlier successful dispatch record', async t => {
  const f = fixture(t);
  f.ctx.runId = '';
  f.ctx.failed = false;
  f.state.run.run_attempt = 2;
  f.state.jobs.set(42, [
    { run_attempt: 1, steps: [{ name: f.config['report-dispatch-step'], conclusion: 'success' }] },
    { run_attempt: 2, steps: [{ name: f.config['report-dispatch-step'], conclusion: 'skipped' }] },
  ]);
  assert.equal(await f.bot().report(f.config), 'completed-report-exists');
  assert.deepEqual(f.mutations(), []);
});

test('legacy dispatch without optional branch/base inputs derives tested PR parents', async t => {
  const f = fixture(t);
  Object.assign(f.ctx, { targetRef: '', base: '', testedHead: '' });
  assert.equal(await f.bot().report(f.config), 'reported');
  assert.equal(f.ctx.base, f.base);
  assert.equal(f.ctx.testedHead, f.head);
  assert.equal(f.ctx.targetRef, 'outdated-pr');
});

test('large Unicode reports exceed subprocess default buffer and are truncated safely', async t => {
  const f = fixture(t);
  const issues = Object.fromEntries(
    Array.from({ length: 6000 }, (_, i) => [`project:${'é🚦'.repeat(30)}/${i}.js`, [i + 1]]),
  );
  f.write('generated/project/javascript-S4000.json', issues);
  assert.equal(await f.bot().report(f.config), 'reported');
  const body = f.state.comments[0].body;
  assert.match(body, /truncated/);
  assert.ok(Buffer.byteLength(body) <= 50200);
  assert.doesNotMatch(body, /\ufffd/);
});

test('fix merged after listing is left intact by cleanup', async t => {
  const f = fixture(t);
  f.state.original.state = 'closed';
  const candidate = fix();
  candidate.head.sha = f.head;
  f.state.prs.push(candidate);
  f.setRemote(candidate.head.ref, f.head);
  f.state.beforeApi = endpoint => {
    if (endpoint === 'pulls/456') {
      candidate.state = 'closed';
      candidate.merged_at = 'now';
    }
  };
  await f.bot().cleanup();
  assert.deepEqual(f.mutations(), []);
  assert.equal(
    f.state.gitCalls.some(args => args[0] === 'push'),
    false,
  );
});

test('Build attempt changes during generation: do not replace comment', async t => {
  const f = fixture(t);
  f.state.beforeApi = endpoint => {
    if (endpoint.startsWith('issues/123/comments?')) f.state.run.run_attempt = 2;
  };
  assert.equal(await f.bot().report(f.config), 'stale');
  assert.deepEqual(f.mutations(), []);
});

test('artifact Build from another tested head is rejected before mutations', async t => {
  const f = fixture(t);
  f.state.run.head_sha = f.base;
  await assert.rejects(f.bot().report(f.config), /does not match the tested head/);
  assert.deepEqual(f.mutations(), []);
});

test('newer Build for another PR at the same head does not suppress updates or reports', async t => {
  const f = fixture(t);
  f.ctx.failed = false;
  f.state.runs.push({ ...f.state.run, id: 43, pull_requests: [{ number: 124 }] });
  assert.equal(await f.bot().checkReport(), true);
  assert.equal(await f.bot().update(f.config), 'passed');
  assert.ok(f.state.calls.some(args => args[0] === 'workflow'));
  assert.equal(await f.bot().report(f.config), 'reported');
  assert.match(f.state.comments[0].body, /old\.js:3/);
});

test('newer Build for another branch at the same head does not suppress branch cleanup', async t => {
  const f = fixture(t);
  f.git(['checkout', '--detach', f.base]);
  Object.assign(f.ctx, {
    isPullRequest: false,
    failed: false,
    testedCommit: f.base,
    testedHead: f.base,
    targetRef: 'master',
  });
  Object.assign(f.state.run, {
    head_sha: f.base,
    head_branch: 'master',
    event: 'push',
    pull_requests: [],
  });
  f.state.runs.push({ ...f.state.run, id: 43, head_branch: 'release' });
  assert.equal(await f.bot().update(f.config), 'passed');
  f.state.runs.push({ ...f.state.run, id: 44 });
  assert.equal(await f.bot().update(f.config), 'stale');
});

test('originating Build from another PR at the same head is rejected before mutations', async t => {
  const f = fixture(t);
  f.state.run.pull_requests = [{ number: 124 }];
  await assert.rejects(f.bot().report(f.config), /does not match the ruling target/);
  assert.deepEqual(f.mutations(), []);
});

for (const rawIsOlder of [true, false]) {
  test(`raw ${rawIsOlder ? 'older' : 'newer'} merge preserves Build results for the same PR head`, async t => {
    const f = fixture(t);
    const nextBase = f.git([
      'commit-tree',
      `${f.base}^{tree}`,
      '-p',
      f.base,
      '-m',
      'Base advances again',
    ]);
    const nextMerge = f.git([
      'commit-tree',
      `${f.merge}^{tree}`,
      '-p',
      nextBase,
      '-p',
      f.head,
      '-m',
      'Next tested merge',
    ]);
    const buildMerge = rawIsOlder ? nextMerge : f.merge;
    const buildBase = rawIsOlder ? nextBase : f.base;
    f.git(['checkout', '--detach', buildMerge]);
    Object.assign(f.ctx, {
      testedCommit: buildMerge,
      base: buildBase,
      fixUrl: 'https://example.test/pull/456',
    });
    assert.equal(await f.bot().report(f.config), 'reported');
    const completedBody = f.state.comments[0].body;
    assert.match(completedBody, /old\.js:4/);
    assert.match(completedBody, /fix PR/);

    // A separate raw-event checkout contains committed expectations, not the generated results.
    f.git(['reset', '--hard']);
    f.git(['clean', '-fd', '--', 'baseline']);
    f.git(['checkout', '--detach', rawIsOlder ? f.merge : nextMerge]);
    Object.assign(f.ctx, {
      testedCommit: rawIsOlder ? f.merge : nextMerge,
      base: rawIsOlder ? f.base : nextBase,
      runId: '',
      failed: false,
      fixUrl: '',
    });
    f.state.calls = [];
    assert.equal(await f.bot().report(f.config), 'completed-report-exists');
    assert.equal(f.state.comments[0].body, completedBody);
    assert.deepEqual(f.mutations(), []);
  });
}

test('raw report refreshes a completed report from an earlier PR head', async t => {
  const f = fixture(t);
  f.ctx.runId = '';
  f.ctx.failed = false;
  f.state.runs.push({ ...f.state.run, id: 41, head_sha: f.base });
  f.state.comments.push(
    comment(`<!-- ruling-report -->\n<!-- ruling-report-run: ${f.base} 41 1 -->\nEarlier head`),
  );
  assert.equal(await f.bot().report(f.config), 'reported');
  assert.match(f.state.comments[0].body, /old\.js:3/);
  assert.doesNotMatch(f.state.comments[0].body, /Earlier head/);
});

test('report rechecks the receiving PR after querying Build freshness', async t => {
  const f = fixture(t);
  f.state.beforeApi = endpoint => {
    if (endpoint.startsWith('actions/workflows/')) f.state.original.state = 'closed';
  };
  assert.equal(await f.bot().checkReport(), false);
  f.state.original.state = 'open';
  assert.equal(await f.bot().report(f.config), 'stale');
  assert.deepEqual(f.mutations(), []);
});
