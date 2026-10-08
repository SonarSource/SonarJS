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
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { controller } from '../bot.mjs';
import { configuration } from '../config.mjs';

export const repository = 'example/analyzer';
export const config = configuration({
  'new-results-path': 'generated',
  'old-results-path': 'baseline',
  'sources-path': 'sources',
  'sources-repo-url': 'https://example.test/sources/blob/main',
  'rspec-base-url': 'https://example.test/rules',
  'max-inline-snippets': '1',
  'results-artifact-name': 'custom-results-1',
  'report-workflow': 'custom-report.yml',
});

export function fixture(t) {
  const temp = mkdtempSync(path.join(os.tmpdir(), 'ruling-bot-test-'));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const workspace = path.join(temp, 'tested');
  const remote = path.join(temp, 'remote.git');
  mkdirSync(workspace);
  const git = args =>
    execFileSync('git', args, {
      cwd: workspace,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  const write = (name, data) => {
    const destination = path.join(workspace, name);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, typeof data === 'string' ? data : JSON.stringify(data) + '\n');
  };
  const result = (root, rule, file, line) =>
    write(`${root}/project/javascript-${rule}.json`, { [`project:${file}`]: [line] });
  const commit = message => {
    git(['add', '-A']);
    git(['commit', '-m', message]);
    return git(['rev-parse', 'HEAD']);
  };
  git(['init', '-b', 'master']);
  git(['config', 'user.name', 'Fixture']);
  git(['config', 'user.email', 'fixture@example.test']);
  git(['config', 'core.autocrlf', 'false']);
  write('.gitignore', '/generated/\n');
  write('tracked-generated.txt', 'clean\n');
  write('sources/projects/project/old.js', 'line one\nline two\nline three\nline four\n');
  result('baseline', 'S1000', 'old.js', 1);
  result('baseline', 'S2000', 'removed.js', 2);
  commit('Initial');
  git(['branch', 'outdated-pr']);
  result('baseline', 'S3000', 'same.js', 30);
  result('baseline', 'S9000', 'base-only.js', 90);
  const base = commit('Base advances expectations');
  git(['checkout', 'outdated-pr']);
  result('baseline', 'S1000', 'old.js', 3);
  rmSync(path.join(workspace, 'baseline/project/javascript-S2000.json'));
  result('baseline', 'S3000', 'same.js', 30);
  const head = commit('PR expectations');
  git(['checkout', 'master']);
  git(['merge', '--no-ff', 'outdated-pr', '-m', 'Synthetic merge']);
  const merge = git(['rev-parse', 'HEAD']);
  git(['init', '--bare', remote]);
  git(['remote', 'add', 'origin', remote]);
  git(['push', 'origin', `${base}:refs/heads/master`, 'outdated-pr']);
  git(['checkout', '--detach', merge]);
  result('generated', 'S1000', 'old.js', 4);
  result('generated', 'S3000', 'same.js', 30);
  result('generated', 'S9000', 'base-only.js', 90);
  result('generated', 'S4000', 'untracked.js', 40);

  const ctx = {
    repository,
    workspace,
    pr: '123',
    targetRef: 'outdated-pr',
    isPullRequest: true,
    failed: true,
    testedCommit: merge,
    testedHead: head,
    base,
    runId: '42',
    runAttempt: '1',
    fixUrl: '',
  };
  const original = {
    number: 123,
    state: 'open',
    head: { sha: head, ref: 'outdated-pr', repo: { full_name: repository } },
  };
  const state = {
    original,
    prs: [],
    comments: [],
    commentWrites: [],
    calls: [],
    gitCalls: [],
    run: {
      id: 42,
      run_attempt: 1,
      workflow_id: 7,
      head_sha: head,
      head_branch: 'outdated-pr',
      event: 'pull_request',
      pull_requests: [{ number: 123 }],
    },
    runs: [],
    branchHead: base,
    dispatchError: false,
    beforeApi: undefined,
    beforeGit: undefined,
  };
  const mutations = () =>
    state.calls.filter(
      args =>
        args[0] === 'workflow' ||
        (args[0] === 'pr' && args[1] === 'create') ||
        (args[0] === 'api' &&
          (args.includes('-f') || args.includes('-F') || args.includes('DELETE'))),
    );
  const gh = args => {
    state.calls.push(args);
    if (args[0] === 'workflow') {
      if (state.dispatchError) throw new Error('Dispatch unavailable');
      return '';
    }
    if (args[0] === 'pr' && args[1] === 'create') {
      const value = flag => args[args.indexOf(flag) + 1];
      const number = Math.max(455, ...state.prs.map(pr => pr.number)) + 1;
      const pr = fix({
        number,
        html_url: `https://example.test/pull/${number}`,
        title: value('--title'),
        body: value('--body'),
        head: {
          ref: value('--head'),
          sha: git(['rev-parse', 'HEAD']),
          repo: { full_name: repository },
        },
        base: { ref: value('--base') },
      });
      state.prs.push(pr);
      return pr.html_url;
    }
    if (args[0] === 'pr' && args[1] === 'view') {
      const pr = state.prs.find(pr => pr.html_url === args[2]);
      return JSON.stringify({ number: pr.number, url: pr.html_url });
    }
    const endpoint = args[1].replace(`repos/${repository}`, '').replace(/^\//, '');
    state.beforeApi?.(endpoint, args);
    const method = args.includes('-X')
      ? args[args.indexOf('-X') + 1]
      : args.includes('-f') || args.includes('-F')
        ? 'POST'
        : 'GET';
    const fields = Object.fromEntries(
      args
        .filter((_, index) => ['-f', '-F'].includes(args[index - 1]))
        .map(value => {
          const split = value.indexOf('=');
          const content = value.slice(split + 1);
          return [
            value.slice(0, split),
            content.startsWith('@') ? readFileSync(content.slice(1), 'utf8') : content,
          ];
        }),
    );
    if (fields.body) state.commentWrites.push({ endpoint, body: fields.body });
    let response;
    if (!endpoint) response = { default_branch: 'master' };
    else if (endpoint.startsWith('branches/')) response = { commit: { sha: state.branchHead } };
    else if (endpoint.startsWith('actions/runs/')) {
      const id = Number(endpoint.split('/')[2]);
      response = [state.run, ...state.runs].find(run => run.id === id);
      if (!response) throw new Error(`Unexpected Build run: ${id}`);
    } else if (endpoint.startsWith('actions/workflows/'))
      response = [{ workflow_runs: [state.run, ...state.runs] }];
    else if (endpoint.startsWith('pulls?'))
      response = [state.prs.filter(pr => pr.state === 'open')];
    else if (/^pulls\/\d+$/.test(endpoint)) {
      response =
        endpoint === `pulls/${original.number}`
          ? original
          : state.prs.find(pr => pr.number === Number(endpoint.split('/')[1]));
      if (!response) throw new Error(`Unexpected PR: ${endpoint}`);
      if (method === 'PATCH') Object.assign(response, fields);
    } else if (/^issues\/\d+\/comments\?/.test(endpoint)) response = [state.comments];
    else if (/^issues\/comments\/\d+$/.test(endpoint)) {
      const id = Number(endpoint.split('/')[2]);
      const existing = state.comments.find(comment => comment.id === id);
      if (method === 'DELETE') state.comments = state.comments.filter(comment => comment.id !== id);
      else Object.assign(existing, fields);
      response = existing;
    } else if (/^issues\/\d+\/comments$/.test(endpoint)) {
      response = { id: 999, user: { login: 'github-actions[bot]' }, ...fields };
      // Keep original-PR report comments separate from fix cleanup explanations.
      if (endpoint === `issues/${original.number}/comments`) state.comments.push(response);
    } else throw new Error(`Unexpected GitHub call: ${args.join(' ')}`);
    return JSON.stringify(response);
  };
  const trackedGit = args => {
    state.gitCalls.push(args);
    state.beforeGit?.(args);
    return git(args);
  };
  const bot = () => controller(ctx, { git: trackedGit, gh });
  const setRemote = (ref, sha) => git(['push', '--force', 'origin', `${sha}:refs/heads/${ref}`]);
  const newerCommit = () =>
    git(['commit-tree', `${head}^{tree}`, '-p', head, '-m', 'Concurrent update']);
  return {
    ctx,
    state,
    bot,
    git,
    write,
    result,
    commit,
    config,
    base,
    head,
    merge,
    remote,
    workspace,
    mutations,
    setRemote,
    newerCommit,
  };
}

export function fix(overrides = {}) {
  return {
    number: 456,
    state: 'open',
    merged_at: null,
    title: 'Update ruling results for PR #123',
    body: 'Auto-generated ruling update for PR #123.',
    user: { login: 'github-actions[bot]' },
    head: {
      ref: 'fix/update-ruling-for-outdated-pr',
      sha: 'a'.repeat(40),
      repo: { full_name: repository },
    },
    base: { ref: 'outdated-pr' },
    html_url: 'https://example.test/pull/456',
    ...overrides,
  };
}

export function comment(body) {
  return { id: 999, user: { login: 'github-actions[bot]' }, body };
}
