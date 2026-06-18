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
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { normalizeSitBundles } from './normalize-sit-bundles.js';
import { parseRuleKeys, runOneRule, sanitizeRuleKey } from './run-fps-batch.js';
import { loadFpsReportMetrics, summarizeFpsTsv } from './summarize-fps-results.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('normalizeSitBundles', () => {
  it('normalizes SonarJS flat SIT exports and creates missing sources directories', async () => {
    const root = await tempRoot();
    const inputDir = join(root, 'sit-input');
    const outputDir = join(root, 'sit-input-bundles');
    await writeJson(join(inputDir, 'custom-jsts', 'metadata.json'), { project_key: 'custom-jsts' });
    await writeFile(join(inputDir, 'custom-jsts', 'issues.jsonl'), '');

    const result = await normalizeSitBundles({ inputDir, outputDir });

    assert.equal(result.bundleCount, 1);
    assert.deepEqual(result.bundleNames, ['custom-jsts']);
    assert.deepEqual(
      JSON.parse(await readFile(join(outputDir, 'custom-jsts', 'metadata.json'), 'utf8')),
      {
        project_key: 'custom-jsts',
      },
    );
    assert.equal(await exists(join(outputDir, 'custom-jsts', 'sources')), true);
  });

  it('normalizes language-scoped SIT exports with prefixed bundle names', async () => {
    const root = await tempRoot();
    const inputDir = join(root, 'sit-input');
    const outputDir = join(root, 'sit-input-bundles');
    await writeJson(join(inputDir, 'js', 'custom-jsts', 'metadata.json'), {
      project_key: 'custom-jsts',
    });
    await writeFile(join(inputDir, 'js', 'custom-jsts', 'issues.jsonl'), '');

    const result = await normalizeSitBundles({ inputDir, outputDir });

    assert.deepEqual(result.bundleNames, ['js__custom-jsts']);
    assert.equal(await exists(join(outputDir, 'js__custom-jsts', 'sources')), true);
  });
});

describe('run-fps-batch helpers', () => {
  it('deduplicates rule keys and sanitizes output prefixes', () => {
    assert.deepEqual(parseRuleKeys('\n javascript:S1116\njavascript:S1116\ncss:S125\n'), [
      'javascript:S1116',
      'css:S125',
    ]);
    assert.equal(sanitizeRuleKey('javascript:S1116'), 'javascript__S1116');
  });

  it('runs FPS with SIT input and treats the FPS no-issues exit code as success', async () => {
    const root = await tempRoot();
    const calls: unknown[] = [];

    const exitCode = await runOneRule({
      fpsProjectDir: join(root, 'dev-tools', 'scripts'),
      runDir: join(root, 'build', 'sit-fps'),
      sitInput: join(root, 'sit-input-bundles'),
      ruleKey: 'javascript:S1116',
      outputPrefix: 'prefix',
      runCommand: command => {
        calls.push(command);
        return { status: 2, stdout: '', stderr: '' };
      },
    });

    assert.equal(exitCode, 0);
    assert.deepEqual(calls, [
      [
        'uv',
        'run',
        '--project',
        join(root, 'dev-tools', 'scripts'),
        'fps',
        '--source',
        'sit',
        '--sit-input',
        join(root, 'sit-input-bundles'),
        '--limit',
        '1000',
        '--export-json',
        '--output-prefix',
        'prefix',
        'javascript:S1116',
      ],
    ]);
    assert.deepEqual(
      JSON.parse(
        await readFile(join(root, 'build', 'sit-fps', 'reports', 'prefix_summary.json'), 'utf8'),
      ),
      {
        metrics: {
          total_issues_analyzed: 0,
          false_positive_rate: 0.0,
          total_clusters: 0,
        },
        clusters: [],
      },
    );
  });
});

describe('summarizeFpsTsv', () => {
  it('enriches FPS batch rows with report metrics', async () => {
    const root = await tempRoot();
    const reportsDir = join(root, 'reports');
    await writeFile(
      join(root, 'summary.tsv'),
      'javascript:S1116\tprefix\tsuccess\t0\tstart\tend\ncss:S125\tmissing\tfailure\t1\tstart\tend\n',
    );
    await writeJson(join(reportsDir, 'prefix_summary.json'), {
      metrics: {
        total_issues_analyzed: 12,
        false_positive_rate: 25,
        total_clusters: 1,
      },
      clusters: [
        {
          cluster_id: 'c1',
          cluster_name: 'Alpha',
          metrics: { issue_count: 3, cluster_fp_rate: 50 },
        },
      ],
    });

    const payload = await summarizeFpsTsv({
      inputTsv: join(root, 'summary.tsv'),
      outputJson: join(root, 'out', 'fps-summary.json'),
      reportsDir,
      allowedRoot: root,
    });

    assert.equal(payload.total, 2);
    assert.equal(payload.failed, 1);
    assert.equal(payload.results[0].issues_analyzed, 12);
    assert.equal(payload.results[0].clusters[0].cluster_name, 'Alpha');
    assert.deepEqual(payload.results[1].clusters, []);
  });

  it('returns empty metrics for malformed FPS reports', async () => {
    const root = await tempRoot();
    await mkdir(join(root, 'reports'), { recursive: true });
    await writeFile(join(root, 'reports', 'bad_summary.json'), '{not-json');

    assert.deepEqual(await loadFpsReportMetrics(join(root, 'reports'), 'bad'), {
      issues_analyzed: null,
      false_positive_rate: null,
      cluster_count: null,
      clusters: [],
    });
  });
});

async function tempRoot() {
  const root = await mkdtemp(join(tmpdir(), 'sonarjs-sit-fps-'));
  roots.push(root);
  return root;
}

async function writeJson(path: string, payload: object) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`);
}

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}
