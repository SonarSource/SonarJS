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
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { prepareDiffsitInputs } from './prepare-diffsit-inputs.js';
import { summarizeDiffsitReports } from './summarize-diffsit-reports.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('prepareDiffsitInputs', () => {
  it('synthesizes missing baseline project exports for SonarJS flat SIT bundles', async () => {
    const root = await tempRoot();
    const targetMetadata = {
      project_key: 'sit-export-custom-jsts',
      rule_keys: ['javascript:S1116'],
    };
    await writeExport(
      root,
      'target',
      'custom-jsts',
      targetMetadata,
      '{"rule_key":"javascript:S1116"}\n',
    );

    const manifest = await prepareDiffsitInputs({
      rulesJson: JSON.stringify([
        { repository: 'typescript', language: 'ts', ruleKey: 'S1116' },
        { repository: 'javascript', language: 'js', ruleKey: 'S1116' },
        { repository: 'javascript', language: 'js', ruleKey: 'S1116' },
      ]),
      baseDir: join(root, 'base'),
      targetDir: join(root, 'target'),
      reportsDir: join(root, 'reports'),
      manifestOutput: join(root, 'build', 'diffsit-manifest.json'),
    });

    assert.deepEqual(manifest, {
      runs: [
        {
          name: 'sonarjs',
          rule_keys: ['javascript:S1116', 'typescript:S1116'],
          rule_filter: 'javascript:S1116,typescript:S1116',
          base_dir: join(root, 'build', 'prepared-base'),
          target_dir: join(root, 'target'),
          report_dir: join(root, 'reports'),
          reports: {
            json: join(root, 'reports', 'diffsit-report.json'),
            text: join(root, 'reports', 'diffsit-report.txt'),
            html: join(root, 'reports', 'diffsit-report.html'),
          },
        },
      ],
    });

    assert.equal(
      await readFile(join(root, 'build', 'prepared-base', 'custom-jsts', 'issues.jsonl'), 'utf8'),
      '',
    );
    assert.deepEqual(
      JSON.parse(
        await readFile(
          join(root, 'build', 'prepared-base', 'custom-jsts', 'metadata.json'),
          'utf8',
        ),
      ),
      targetMetadata,
    );
  });

  it('fails clearly when a target project export is missing issues.jsonl', async () => {
    const root = await tempRoot();
    await mkdir(join(root, 'target', 'custom-jsts'), { recursive: true });

    await assert.rejects(
      () =>
        prepareDiffsitInputs({
          rulesJson: '[{"repository":"javascript","language":"js","ruleKey":"S1116"}]',
          baseDir: join(root, 'base'),
          targetDir: join(root, 'target'),
          reportsDir: join(root, 'reports'),
          manifestOutput: join(root, 'manifest.json'),
        }),
      /target project export\(s\) missing issues\.jsonl/,
    );
  });
});

describe('summarizeDiffsitReports', () => {
  it('aggregates DiffSIT JSON reports from the generated manifest', async () => {
    const root = await tempRoot();
    const reportPath = join(root, 'reports', 'diffsit-report.json');
    await writeJson(reportPath, {
      overall_summary: {
        projects: 2,
        base_count: 10,
        target_count: 9,
        new: 1,
        removed: 2,
        changed: 3,
        message_changes: 2,
        secondary_changes: 1,
        unchanged: 4,
        only_in_base: ['old-project'],
        only_in_target: ['new-project'],
      },
      projects: [],
    });
    const manifestPath = join(root, 'manifest.json');
    await writeJson(manifestPath, {
      runs: [
        {
          name: 'sonarjs',
          rule_keys: ['javascript:S1116'],
          rule_filter: 'javascript:S1116',
          reports: { json: reportPath },
        },
      ],
    });

    const payload = await summarizeDiffsitReports({
      manifest: manifestPath,
      summaryOutput: join(root, 'summary.json'),
    });

    assert.deepEqual(payload, {
      total: 1,
      overall: {
        projects: 2,
        base_count: 10,
        target_count: 9,
        new: 1,
        removed: 2,
        changed: 3,
        message_changes: 2,
        secondary_changes: 1,
        unchanged: 4,
        only_in_base: [{ run: 'sonarjs', project: 'old-project' }],
        only_in_target: [{ run: 'sonarjs', project: 'new-project' }],
      },
      results: [
        {
          name: 'sonarjs',
          rule_keys: ['javascript:S1116'],
          rule_filter: 'javascript:S1116',
          report_path: reportPath,
          projects: 2,
          base_count: 10,
          target_count: 9,
          new: 1,
          removed: 2,
          changed: 3,
          message_changes: 2,
          secondary_changes: 1,
          unchanged: 4,
          only_in_base: ['old-project'],
          only_in_target: ['new-project'],
        },
      ],
    });
  });

  it('coerces non-finite summary fields to zero', async () => {
    const root = await tempRoot();
    const reportPath = join(root, 'reports', 'diffsit-report.json');
    await writeJson(reportPath, {
      overall_summary: {
        projects: 'oops',
        base_count: 4,
        target_count: null,
        new: 'NaN',
        removed: 1,
        changed: undefined,
        message_changes: '2',
        secondary_changes: Number.NaN,
        unchanged: 3,
        only_in_base: [],
        only_in_target: [],
      },
      projects: [],
    });
    const manifestPath = join(root, 'manifest.json');
    await writeJson(manifestPath, {
      runs: [
        {
          name: 'sonarjs',
          rule_keys: ['javascript:S1116'],
          rule_filter: 'javascript:S1116',
          reports: { json: reportPath },
        },
      ],
    });

    const payload = await summarizeDiffsitReports({
      manifest: manifestPath,
      summaryOutput: join(root, 'summary.json'),
    });

    assert.deepEqual(payload.overall, {
      projects: 0,
      base_count: 4,
      target_count: 0,
      new: 0,
      removed: 1,
      changed: 0,
      message_changes: 2,
      secondary_changes: 0,
      unchanged: 3,
      only_in_base: [],
      only_in_target: [],
    });
  });
});

async function tempRoot() {
  const root = await mkdtemp(join(tmpdir(), 'sonarjs-sit-diffsit-'));
  roots.push(root);
  return root;
}

async function writeExport(
  root: string,
  side: 'base' | 'target',
  project: string,
  metadata: object,
  issues: string,
) {
  const projectDir = join(root, side, project);
  await mkdir(projectDir, { recursive: true });
  await writeFile(join(projectDir, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  await writeFile(join(projectDir, 'issues.jsonl'), issues);
}

async function writeJson(path: string, payload: object) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`);
}
