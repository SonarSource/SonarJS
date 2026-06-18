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
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  COMMENT_MARKER,
  buildCommentLines,
  buildPublishPayload,
  buildRuleStatuses,
  loadArtifactLinks,
  resolveWorkflowOutcome,
} from './build-publish-payload.js';
import {
  Comment,
  PullRequestComments,
  publishComment,
  selectPreviousSummaryCommentIds,
  splitRepository,
} from './publish-pr-comment.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('build-publish-payload', () => {
  it('renders the Skunk-style SIT/FPS summary for SonarJS rule keys', () => {
    const lines = buildCommentLines(
      {
        rules: [
          { repository: 'javascript', language: 'js', ruleKey: 'S1116' },
          { repository: 'typescript', language: 'ts', ruleKey: 'S1116' },
        ],
        hasRules: true,
        languages: ['js', 'ts'],
        fullRuleKeys: ['javascript:S1116', 'typescript:S1116'],
        sitResult: 'success',
        diffsitResult: 'success',
        fpsResult: 'success',
        pluginVersion: '1.2.3',
        runUrl: 'https://run',
        fpsSummary: {
          results: [
            {
              rule_key: 'javascript:S1116',
              status: 'success',
              issues_analyzed: 5,
              false_positive_rate: 20,
              clusters: [{ cluster_name: 'A|B', issue_count: 5, cluster_fp_rate: 20 }],
            },
          ],
        },
        diffsitSummary: {
          overall: {
            projects: 1,
            base_count: 3,
            target_count: 2,
            new: 0,
            changed: 0,
            message_changes: 0,
            secondary_changes: 0,
            removed: 1,
            unchanged: 2,
          },
        },
        artifactLinks: {
          'sit-export-target': 'https://target-artifact',
          'sit-export-baseline': 'https://baseline-artifact',
          'sit-timing-summary': 'https://sit-timing-summary',
          'fps-reports': 'https://fps-reports',
          'fps-run-summary': 'https://fps-summary',
          'diffsit-reports': 'https://diffsit-reports',
          'diffsit-run-summary': 'https://diffsit-summary',
        },
      },
      'Success',
    );
    const text = lines.join('\n');

    assert.equal(lines[0], COMMENT_MARKER);
    assert.match(text, /## SIT\/FPS PR Automation/);
    assert.match(text, /- Plugin version: `1\.2\.3`/);
    assert.match(text, /- Changed rules: `javascript:S1116, typescript:S1116`/);
    assert.match(text, /\[`sit-export-target`\]\(https:\/\/target-artifact\)/);
    assert.match(text, /#### `javascript:S1116` - `success` - 5 issues - FP rate 20\.0%/);
    assert.match(text, /\| A\\\|B \| 5 \| 20\.0% \|/);
    assert.match(text, /\| 1 \| 3 \| 2 \| 0 \| 0 \| 0 \| 0 \| 1 \| 2 \|/);
  });

  it('summarizes sharded SIT artifacts and timing', () => {
    const lines = buildCommentLines(
      {
        rules: [{ repository: 'javascript', language: 'js', ruleKey: 'S5759' }],
        hasRules: true,
        languages: ['js'],
        fullRuleKeys: ['javascript:S5759'],
        sitResult: 'success',
        diffsitResult: 'success',
        fpsResult: 'success',
        pluginVersion: '1.2.3',
        runUrl: 'https://run',
        fpsSummary: { results: [] },
        diffsitSummary: { overall: {} },
        sitSummary: {
          target: {
            project_count: 2,
            total_analysis_duration_ms: 185000,
            average_analysis_duration_ms: 92500,
            slowest_projects: [
              { project_key: 'kibana', analysis_duration_ms: 120000 },
              { project_key: 'react', analysis_duration_ms: 65000 },
            ],
          },
          baseline: {
            project_count: 2,
            total_analysis_duration_ms: 150000,
            average_analysis_duration_ms: 75000,
            slowest_projects: [{ project_key: 'kibana', analysis_duration_ms: 110000 }],
          },
        },
        artifactLinks: {
          'sit-export-target-01': 'https://target-01',
          'sit-export-target-02': 'https://target-02',
          'sit-export-baseline-01': 'https://baseline-01',
          'sit-export-baseline-02': 'https://baseline-02',
          'sit-timing-summary': 'https://timing',
          'fps-reports': 'https://fps-reports',
          'fps-run-summary': 'https://fps-summary',
          'diffsit-reports': 'https://diffsit-reports',
          'diffsit-run-summary': 'https://diffsit-summary',
        },
      },
      'Success',
    );
    const text = lines.join('\n');

    assert.match(text, /sit-export-target-\*` \(2 shards\)/);
    assert.match(text, /### SIT timing/);
    assert.match(text, /\| Target \| 2 \| 3m 5s \| 1m 33s \|/);
    assert.match(text, /- Target slowest: `kibana` \(2m 0s\), `react` \(1m 5s\)/);
  });

  it('builds overall and per-rule commit statuses', () => {
    assert.deepEqual(resolveWorkflowOutcome(true, 'success', 'success', 'success'), {
      state: 'success',
      description: 'SIT/FPS/DiffSIT completed successfully',
      workflowStatus: 'Success',
    });
    assert.deepEqual(
      buildRuleStatuses(
        [
          {
            rule_key: 'javascript:S1116',
            status: 'success',
            issues_analyzed: 4,
            false_positive_rate: 25,
            cluster_count: 2,
          },
        ],
        'https://run',
      ),
      [
        {
          context: 'sit-fps/javascript:S1116',
          state: 'success',
          description: 'FPS success (issues=4, fp=25.0%, clusters=2)',
          target_url: 'https://run',
        },
      ],
    );
  });

  it('writes comment, rule-status files, and GitHub Action outputs', async () => {
    const root = await tempRoot();
    await writeJson(join(root, 'fps-summary.json'), {
      results: [
        {
          rule_key: 'javascript:S1116',
          status: 'success',
          issues_analyzed: 2,
          false_positive_rate: 0,
          cluster_count: 1,
          clusters: [],
        },
      ],
    });
    await writeJson(join(root, 'diffsit-summary.json'), { overall: {}, results: [] });
    await writeJson(join(root, 'artifacts.json'), {
      artifacts: [{ id: 77, name: 'fps-reports' }],
    });

    const outputs = new Map<string, string>();
    const payload = await buildPublishPayload(
      {
        rulesJson: '[{"repository":"javascript","language":"js","ruleKey":"S1116"}]',
        sitResult: 'success',
        diffsitResult: 'success',
        fpsResult: 'success',
        pluginVersion: '1.2.3',
        runUrl: 'https://run',
        repository: 'org/repo',
        runId: '12',
        fpsSummaryPath: join(root, 'fps-summary.json'),
        diffsitSummaryPath: join(root, 'diffsit-summary.json'),
        artifactsJsonPath: join(root, 'artifacts.json'),
        commentPath: join(root, 'out', 'comment.md'),
        ruleStatusesPath: join(root, 'out', 'rule-statuses.json'),
      },
      (key, value) => outputs.set(key, value),
    );

    assert.equal(payload.outcome.state, 'success');
    assert.equal(
      (await readFile(join(root, 'out', 'comment.md'), 'utf8')).startsWith(COMMENT_MARKER),
      true,
    );
    assert.equal(
      JSON.parse(await readFile(join(root, 'out', 'rule-statuses.json'), 'utf8'))[0].context,
      'sit-fps/javascript:S1116',
    );
    assert.deepEqual(Object.fromEntries(outputs), {
      state: 'success',
      description: 'SIT/FPS/DiffSIT completed successfully',
    });
  });

  it('loads artifact links from the GitHub artifacts payload', async () => {
    const root = await tempRoot();
    await writeJson(join(root, 'artifacts.json'), {
      artifacts: [{ id: 99, name: 'diffsit-reports' }, { name: 'missing-id' }],
    });

    assert.deepEqual(await loadArtifactLinks(join(root, 'artifacts.json'), 'org/repo', '12'), {
      'diffsit-reports': 'https://github.com/org/repo/actions/runs/12/artifacts/99',
    });
  });
});

describe('publish-pr-comment', () => {
  it('selects marked and legacy previous summary comments', () => {
    assert.deepEqual(
      selectPreviousSummaryCommentIds([
        new Comment('marked', `${COMMENT_MARKER}\nold`, false, 'octocat'),
        new Comment(
          'legacy-diffsit',
          '<!-- sit-diffsit-report -->\nold',
          false,
          'github-actions[bot]',
        ),
        new Comment('legacy', '  ## SIT/FPS PR Automation\nold', false, 'github-actions[bot]'),
        new Comment('minimized', `${COMMENT_MARKER}\nold`, true, 'github-actions[bot]'),
        new Comment('manual', '## SIT/FPS PR Automation\nmanual', false, 'octocat'),
      ]),
      ['marked', 'legacy-diffsit', 'legacy'],
    );
  });

  it('posts a fresh comment and minimizes previous summaries', async () => {
    const client = new FakeGithubClient(
      new PullRequestComments('PR_id', [
        new Comment('old_marked', `${COMMENT_MARKER}\nold`, false, 'github-actions[bot]'),
        new Comment('old_unrelated', 'hello', false, 'github-actions[bot]'),
      ]),
    );

    await publishComment(client, 'org/repo', 123, 'new body');

    assert.deepEqual(client.mutations, [
      { kind: 'add', variables: { subjectId: 'PR_id', body: 'new body' } },
      { kind: 'minimize', variables: { subjectId: 'old_marked' } },
    ]);
  });

  it('validates repository owner/name syntax', () => {
    assert.deepEqual(splitRepository('org/repo'), ['org', 'repo']);
    assert.throws(() => splitRepository('repo'), /owner\/name/);
  });
});

class FakeGithubClient {
  mutations: Array<{ kind: string; variables: object }> = [];

  constructor(private readonly comments: PullRequestComments) {}

  async fetchPrComments() {
    return this.comments;
  }

  async addComment(prId: string, body: string) {
    this.mutations.push({ kind: 'add', variables: { subjectId: prId, body } });
    return 'new_comment';
  }

  async minimizeComment(commentId: string) {
    this.mutations.push({ kind: 'minimize', variables: { subjectId: commentId } });
  }
}

async function tempRoot() {
  const root = await mkdtemp(join(tmpdir(), 'sonarjs-sit-publish-'));
  roots.push(root);
  return root;
}

async function writeJson(path: string, payload: object) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`);
}
