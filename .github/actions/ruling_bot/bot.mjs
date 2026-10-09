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
import {
  appendFileSync,
  closeSync,
  fstatSync,
  mkdtempSync,
  openSync,
  readSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inputDefinitions, environmentConfiguration } from './config.mjs';
import { dispatchProvenance } from './provenance.mjs';

const actionPath = path.dirname(fileURLToPath(import.meta.url));
const commentMarker = '<!-- ruling-report -->';
const commentLimit = 50000;
const generatedCommitMessage = 'Update ruling results\n\nGenerated with GitHub Actions';
const legacyCommitMessages = new Set([
  generatedCommitMessage,
  generatedCommitMessage.replace('\n\n', '\n\n🤖 '),
]);

export function context(env = process.env) {
  return {
    repository: env.GITHUB_REPOSITORY,
    workspace: env.RULING_REPOSITORY_PATH || env.GITHUB_WORKSPACE,
    pr: env.PR_NUMBER,
    targetRef: env.TARGET_REF,
    isPullRequest: env.IS_PULL_REQUEST === 'true',
    failed: env.RULING_FAILED === 'true',
    testedCommit: env.HEAD_SHA || env.TESTED_COMMIT_SHA || env.GITHUB_SHA,
    testedHead: env.TESTED_HEAD_SHA,
    base: env.BASE_SHA || env.TESTED_BASE_SHA,
    runId: env.BUILD_RUN_ID || env.GITHUB_RUN_ID,
    runAttempt: env.BUILD_RUN_ATTEMPT || env.GITHUB_RUN_ATTEMPT,
    fixUrl: env.FIX_PR_URL || '',
    summary: env.GITHUB_STEP_SUMMARY,
    output: env.GITHUB_OUTPUT,
  };
}

export function controller(ctx, adapters = {}) {
  const command = (name, args) =>
    execFileSync(name, args, {
      cwd: ctx.workspace,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    }).trim();
  const git = adapters.git ?? (args => command('git', args));
  const gh = adapters.gh ?? (args => command('gh', args));
  const api = (endpoint, args = []) => {
    const output = gh(['api', `repos/${ctx.repository}${endpoint ? '/' + endpoint : ''}`, ...args]);
    return output ? JSON.parse(output) : undefined;
  };
  const pages = endpoint => api(endpoint, ['--paginate', '--slurp']).flat();
  const identity = () =>
    ctx.isPullRequest
      ? { repository: ctx.repository, pr: Number(ctx.pr) }
      : { repository: ctx.repository, ref: ctx.targetRef };
  const legacyFixBranch = () => `fix/update-ruling-for-${ctx.targetRef}`;
  const fixBranch = () =>
    ctx.isPullRequest ? `fix/update-ruling-for-pr-${ctx.pr}` : legacyFixBranch();
  const suffix = ctx.isPullRequest ? `PR #${ctx.pr}` : ctx.targetRef;
  const title = `Update ruling results for ${suffix}`;
  const description = `Auto-generated ruling update for ${suffix}.`;
  const sameTarget = run =>
    ctx.isPullRequest
      ? run.pull_requests?.some(pr => Number(pr.number) === Number(ctx.pr))
      : run.head_branch === ctx.targetRef;

  function fresh(report = false) {
    if (ctx.isPullRequest) {
      const pr = api(`pulls/${ctx.pr}`);
      if (pr.state !== 'open' || pr.head.sha !== ctx.testedHead) return false;
      ctx.targetRef ||= pr.head.ref;
    } else {
      ctx.targetRef ||= api('').default_branch;
      if (api(`branches/${encodeURIComponent(ctx.targetRef)}`).commit.sha !== ctx.testedHead)
        return false;
    }
    if (ctx.runId) {
      const run = api(`actions/runs/${ctx.runId}`);
      if (run.head_sha !== ctx.testedHead)
        throw new Error('Originating Build run does not match the tested head.');
      if (!sameTarget(run))
        throw new Error('Originating Build run does not match the ruling target.');
      if (Number(run.run_attempt) !== Number(ctx.runAttempt || 1)) return false;
      const runs = pages(
        `actions/workflows/${run.workflow_id}/runs?head_sha=${run.head_sha}&event=${run.event}&per_page=100`,
      );
      if (
        runs
          .flatMap(page => page.workflow_runs)
          .some(other => sameTarget(other) && Number(other.id) > Number(ctx.runId))
      )
        return false;
    }
    return !report || api(`pulls/${ctx.pr}`).state === 'open';
  }

  function completedDispatch(config) {
    if (!ctx.isPullRequest) return false;
    const runs = pages(
      `actions/workflows/${encodeURIComponent(config['build-workflow'])}/runs?head_sha=${ctx.testedHead}&event=pull_request&per_page=100`,
    ).flatMap(page => page.workflow_runs);
    for (const run of runs.filter(sameTarget)) {
      // Read all attempts: an updater-only retry must not erase an earlier authoritative report.
      const jobs = pages(`actions/runs/${run.id}/jobs?filter=all&per_page=100`).flatMap(
        page => page.jobs,
      );
      if (
        jobs.some(job =>
          job.steps?.some(
            step => step.name === config['report-dispatch-step'] && step.conclusion === 'success',
          ),
        )
      )
        return true;
    }
    return false;
  }

  function managed(pr) {
    if (
      pr.user.login !== 'github-actions[bot]' ||
      pr.head.repo?.full_name !== ctx.repository ||
      !pr.head.ref.startsWith('fix/update-ruling-for-')
    )
      return false;
    const marker = pr.body?.match(/<!-- ruling-bot-target: (.+) -->/);
    if (marker) {
      try {
        const actual = JSON.parse(marker[1]);
        const expected = identity();
        return (
          actual.repository === expected.repository &&
          actual.pr === expected.pr &&
          actual.ref === expected.ref
        );
      } catch {
        return false;
      }
    }
    // Legacy bodies also survive GitHub retargeting a fix PR after its base is merged/deleted.
    return pr.title === title && pr.body?.startsWith(description);
  }
  function closeFixes(reason, guard = fresh) {
    const open = pages('pulls?state=open&per_page=100');
    for (const candidate of open.filter(pr => managed(pr))) {
      if (!guard()) return;
      const pr = api(`pulls/${candidate.number}`);
      if (pr.state !== 'open' || pr.merged_at || !managed(pr) || pr.head.sha !== candidate.head.sha)
        continue;
      const ref = `refs/heads/${pr.head.ref}`;
      const remoteHead = git(['ls-remote', 'origin', ref]).split(/\s/)[0];
      if (remoteHead && remoteHead !== pr.head.sha) continue;
      const shared = open.some(
        other =>
          other.number !== pr.number &&
          other.head.repo?.full_name === ctx.repository &&
          other.head.ref === pr.head.ref,
      );
      if (!guard()) return;
      // Delete first, with a compare-and-swap lease; never close a newly updated fix.
      if (remoteHead && !shared)
        git(['push', `--force-with-lease=${ref}:${pr.head.sha}`, 'origin', `:${ref}`]);
      if (api(`pulls/${pr.number}`).merged_at) continue;
      api(`pulls/${pr.number}`, ['-X', 'PATCH', '-f', 'state=closed']);
      api(`issues/${pr.number}/comments`, ['-f', `body=${reason}`]);
    }
  }

  function dispatch(config, reportPr, fixUrl = '') {
    const ref = config['report-workflow-ref'] || ctx.targetRef;
    const args = ['workflow', 'run', config['report-workflow'], '--ref', ref];
    const fields = dispatchProvenance(ctx, reportPr, fixUrl);
    for (const name of Object.keys(inputDefinitions)) fields[name] = config[name];
    for (const [name, value] of Object.entries(fields)) args.push('-f', `${name}=${value}`);
    gh(args); // Fail visibly: persistence succeeded, but reporting must be retried.
    if (ctx.output) appendFileSync(ctx.output, 'report-requested=true\n');
  }

  const helper = (name, args, env = {}, stdout = 'pipe') =>
    execFileSync(process.execPath, [path.join(actionPath, name), ...args], {
      cwd: ctx.workspace,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', stdout, 'pipe'],
      env: { ...process.env, ...env, RULING_REPOSITORY_PATH: ctx.workspace },
    });

  function generateReport(config) {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'ruling-report-'));
    let file;
    try {
      file = openSync(path.join(directory, 'report.md'), 'w+');
      helper(
        'generate-report.mjs',
        [config['old-results-path']],
        {
          BASE_SHA: ctx.base,
          SOURCES_PATH: config['sources-path'],
          SOURCES_REPO_URL: config['sources-repo-url'],
          RSPEC_BASE_URL: config['rspec-base-url'],
          MAX_INLINE_SNIPPETS: String(config['max-inline-snippets']),
        },
        file,
      );
      // stdout goes directly to disk; only the comment-sized prefix enters controller memory.
      const bytes = Buffer.alloc(commentLimit + 1);
      const length = readSync(file, bytes, 0, bytes.length, 0);
      let end = Math.min(length, commentLimit);
      while (end < length && (bytes[end] & 0xc0) === 0x80) end--;
      return {
        report: bytes.subarray(0, end).toString('utf8'),
        truncated: fstatSync(file).size > end,
      };
    } finally {
      if (file !== undefined) closeSync(file);
      rmSync(directory, { recursive: true, force: true });
    }
  }

  function testedTree() {
    if (git(['rev-parse', 'HEAD']) !== ctx.testedCommit)
      throw new Error('Checkout does not match the tested ruling commit.');
    if (ctx.isPullRequest) {
      const base = git(['rev-parse', '--verify', 'HEAD^1^{commit}']);
      const head = git(['rev-parse', '--verify', 'HEAD^2^{commit}']);
      if (ctx.base && ctx.base !== base)
        throw new Error('Report base does not match the tested merge first parent.');
      if (ctx.testedHead && ctx.testedHead !== head)
        throw new Error('PR head does not match the tested merge second parent.');
      ctx.base = base;
      ctx.testedHead = head;
    } else {
      ctx.testedHead ||= ctx.testedCommit;
      ctx.base ||= ctx.testedCommit;
    }
    if (!/^[0-9a-f]{40}$/.test(ctx.base)) throw new Error('Invalid ruling report base SHA.');
    git(['cat-file', '-e', `${ctx.base}^{commit}`]);
  }

  async function update(config) {
    testedTree();
    if (!fresh()) return 'stale';
    if (!ctx.failed) {
      closeFixes('No longer needed: the original branch now passes ruling.');
      if (ctx.isPullRequest && fresh()) dispatch(config, ctx.pr);
      return 'passed';
    }
    helper('sync-results.mjs', [config['new-results-path'], config['old-results-path']]);
    if (!git(['status', '--porcelain', '--', config['old-results-path']]))
      throw new Error('Ruling failed without generated expectation changes.');
    git(['stash', 'push', '-u', '-m', 'ruling-sync-changes', '--', config['old-results-path']]);
    git(['fetch', 'origin', `+refs/heads/${ctx.targetRef}:refs/remotes/origin/${ctx.targetRef}`]);
    if (git(['rev-parse', `origin/${ctx.targetRef}`]) !== ctx.testedHead || !fresh())
      return 'stale';
    const open = pages('pulls?state=open&per_page=100');
    const existing = open.find(pr => managed(pr) && pr.base.ref === ctx.targetRef);
    const marker = `<!-- ruling-bot-target: ${JSON.stringify(identity())} -->`;
    const usedByOtherPr = branch =>
      open.some(
        pr =>
          pr.number !== existing?.number &&
          pr.head.repo?.full_name === ctx.repository &&
          pr.head.ref === branch,
      );
    const recoverable = ref => {
      // Recover modern orphans and branches left by closed, unmerged legacy fixes.
      git(['fetch', 'origin', ref]);
      const message = git(['log', '-1', '--format=%B', 'FETCH_HEAD']);
      const legacy =
        legacyCommitMessages.has(message) &&
        git(['log', '-1', '--format=%an%n%ae%n%cn%n%ce', 'FETCH_HEAD']) ===
          [
            'github-actions[bot]',
            'github-actions[bot]@users.noreply.github.com',
            'github-actions[bot]',
            'github-actions[bot]@users.noreply.github.com',
          ].join('\n');
      return message.includes(marker) || legacy;
    };
    let branch = existing?.head.ref || fixBranch();
    let ref = `refs/heads/${branch}`;
    let oldFix = git(['ls-remote', 'origin', ref]).split(/\s/)[0];
    let recovered = false;
    const sharedOriginalBranch = open.some(
      pr =>
        Number(pr.number) !== Number(ctx.pr) &&
        pr.head.repo?.full_name === ctx.repository &&
        pr.head.ref === ctx.targetRef,
    );
    if (!existing && !oldFix && ctx.isPullRequest && !sharedOriginalBranch) {
      const legacyBranch = legacyFixBranch();
      const legacyRef = `refs/heads/${legacyBranch}`;
      const legacyHead = git(['ls-remote', 'origin', legacyRef]).split(/\s/)[0];
      if (legacyHead && !usedByOtherPr(legacyBranch) && recoverable(legacyRef)) {
        branch = legacyBranch;
        ref = legacyRef;
        oldFix = legacyHead;
        recovered = true;
      }
    }
    if (usedByOtherPr(branch))
      throw new Error('Refusing to overwrite a fix branch used by another open PR.');
    if (oldFix && !existing && !recovered && !recoverable(ref))
      throw new Error('Refusing to overwrite a fix branch not owned by this ruling target.');
    git(['config', 'user.name', 'github-actions[bot]']);
    git(['config', 'user.email', 'github-actions[bot]@users.noreply.github.com']);
    // Retain the tested base history: base-only expectations must exist when restoring changes.
    // The generated fix commit changes expectations on top of that exact tree.
    git(['checkout', '-f', '-B', branch, ctx.testedCommit]);
    git(['stash', 'pop']);
    git(['add', '--', config['old-results-path']]);
    if (!git(['diff', '--cached', '--name-only', '--', config['old-results-path']]))
      throw new Error('Generated results no longer differ from the target branch.');
    git(['commit', '-m', `${generatedCommitMessage}\n\n${marker}`]);
    if (!fresh()) return 'stale';
    git(['push', `--force-with-lease=${ref}:${oldFix}`, 'origin', `${branch}:${ref}`]);
    if (!fresh()) return 'stale';
    const baseNotice = ctx.isPullRequest
      ? `This fix starts from the tested merge, including base commit ${ctx.base}. If your branch is behind that base, incorporate it before merging this fix; squash and rebase merges do not preserve the fix branch's base ancestry. If updating your branch triggers ruling again, review the refreshed fix.\n\n`
      : '';
    const body = `${description}\n\n${baseNotice}Generated with GitHub Actions\n\n${marker}`;
    let fix;
    if (existing) fix = api(`pulls/${existing.number}`, ['-X', 'PATCH', '-f', `body=${body}`]);
    else {
      const url = gh([
        'pr',
        'create',
        '--title',
        title,
        '--base',
        ctx.targetRef,
        '--head',
        branch,
        '--body',
        body,
      ]);
      fix = JSON.parse(gh(['pr', 'view', url, '--json', 'number,url']));
    }
    const fixUrl = fix.html_url || fix.url;
    if (ctx.summary) appendFileSync(ctx.summary, `Ruling fix PR: ${fixUrl}\n`);
    if (fresh())
      dispatch(config, ctx.isPullRequest ? ctx.pr : fix.number, ctx.isPullRequest ? fixUrl : '');
    return 'updated';
  }

  async function report(config) {
    testedTree();
    if (!fresh(true)) return 'stale';
    if (ctx.failed)
      helper('sync-results.mjs', [config['new-results-path'], config['old-results-path']]);
    const { report, truncated } = generateReport(config);
    const existing = pages(`issues/${ctx.pr}/comments?per_page=100`).find(
      comment =>
        comment.user.login === 'github-actions[bot]' && comment.body.startsWith(commentMarker),
    );
    const provenance = `<!-- ruling-report-run: ${ctx.testedCommit} ${ctx.runId || ''} ${ctx.runAttempt || ''} -->`;
    if (!ctx.runId) {
      const completed = existing?.body.match(
        /<!-- ruling-report-run: ([0-9a-f]{40}) (\d+) \d+ -->/,
      );
      if (completed) {
        // Build results remain authoritative for this head across different tested merges.
        if (completed[1] === ctx.testedCommit) return 'completed-report-exists';
        const run = api(`actions/runs/${completed[2]}`);
        if (run.head_sha === ctx.testedHead && sameTarget(run)) return 'completed-report-exists';
      }
    }
    // Empty Build reports delete their comments. The Build's successful dispatch step preserves
    // authority independently of the visible comment, including across different tested merges.
    if (!ctx.runId && completedDispatch(config)) return 'completed-report-exists';
    if (!fresh(true)) return 'stale';
    if (!report && !ctx.failed && !ctx.fixUrl) {
      if (existing) api(`issues/comments/${existing.id}`, ['-X', 'DELETE']);
      return 'empty';
    }
    const notice = ctx.fixUrl
      ? `Ruling needs updating. A [fix PR](${ctx.fixUrl}) has been created. Please review and merge it into your branch.\n\n`
      : ctx.failed && ctx.isPullRequest
        ? 'Ruling needs updating.\n\n'
        : '';
    const content =
      report ||
      (ctx.isPullRequest
        ? `## Ruling Report\n\nNo net issue changes relative to the tested base; the branch expectations still need ${ctx.fixUrl ? 'the linked fix' : 'updating'}.\n`
        : '## Ruling Report\n\nNo net issue changes relative to the tested base.\n');
    let body = `${commentMarker}\n${provenance}\n${notice}${content}`;
    const bytes = Buffer.from(body);
    if (bytes.length > commentLimit || truncated) {
      let end = Math.min(bytes.length, commentLimit);
      while ((bytes[end] & 0xc0) === 0x80) end--;
      body =
        bytes.subarray(0, end).toString('utf8') +
        '\n\n_(truncated; see the expected JSON files for the complete results)_\n';
    }
    // File-backed fields preserve multiline UTF-8 and avoid platform argument-size limits.
    const directory = mkdtempSync(path.join(os.tmpdir(), 'ruling-comment-'));
    try {
      const file = path.join(directory, 'comment.md');
      writeFileSync(file, body);
      api(existing ? `issues/comments/${existing.id}` : `issues/${ctx.pr}/comments`, [
        ...(existing ? ['-X', 'PATCH'] : []),
        '-F',
        `body=@${file}`,
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
    return 'reported';
  }

  async function checkReport(config) {
    testedTree();
    if (ctx.output)
      appendFileSync(
        ctx.output,
        `results-path=${path.resolve(ctx.workspace, config['new-results-path'])}\n`,
      );
    return fresh(true);
  }

  async function cleanup() {
    const closed = () => api(`pulls/${ctx.pr}`).state === 'closed';
    if (!closed()) return 'reopened';
    closeFixes(`No longer needed: original PR #${ctx.pr} was merged or closed.`, closed);
    return 'closed';
  }
  return { fresh, managed, update, report, checkReport, cleanup };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ctx = context();
  if (process.argv[2] === 'report' || process.argv[2] === 'check-report') {
    ctx.runId = process.env.BUILD_RUN_ID;
    ctx.runAttempt = process.env.BUILD_RUN_ATTEMPT;
  }
  const bot = controller(ctx);
  const config = process.argv[2] === 'cleanup' ? undefined : environmentConfiguration(process.env);
  if (process.argv[2] === 'check-report') {
    appendFileSync(process.env.GITHUB_OUTPUT, `fresh=${await bot.checkReport(config)}\n`);
    process.exit(0);
  }
  const result =
    process.argv[2] === 'cleanup' ? await bot.cleanup() : await bot[process.argv[2]](config);
  console.log(`Ruling bot: ${result}`);
}
