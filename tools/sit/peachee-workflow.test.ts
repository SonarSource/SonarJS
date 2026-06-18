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
import { strict as assert } from 'node:assert';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { generatePeacheeManifest } from './generate-peachee-manifest.js';
import { generatePeacheePublicSnapshot } from './generate-peachee-public-snapshot.js';
import { renderPeacheeShardMatrix } from './render-peachee-shard-matrix.js';
import { summarizeSitExports } from './summarize-sit-exports.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('peachee workflow helpers', () => {
  it('generates a manifest from enabled peachee projects and keeps analysis properties', async () => {
    const root = await tempRoot();
    await writeJson(join(root, 'projects.json'), {
      alpha: { repo: 'https://example.com/alpha.git', ref: '123' },
      beta: { repo: 'https://example.com/beta.git', ref: '456', analysis: false },
    });
    await mkdir(join(root, 'alpha', 'workspace'), { recursive: true });
    await writeFile(
      join(root, 'alpha', 'sonar-project.properties'),
      [
        'sonar.projectKey=js:alpha',
        'sonar.projectName=js:alpha',
        'sonar.sources=\\',
        '  src, \\',
        '  packages',
        'sonar.tests=tests',
        'sonar.exclusions=\\',
        '  **/dist/**, \\',
        '  **/node_modules/**/*',
        'sonar.test.inclusions=**/*.spec.ts',
        'sonar.links.homepage=https://example.com/alpha',
        '',
      ].join('\n'),
      'utf8',
    );

    const outputPath = join(root, 'out', 'manifest.json');
    const manifest = await generatePeacheeManifest({
      peacheeRoot: root,
      outputPath,
      projectFilter: '',
    });

    assert.equal(manifest.length, 1);
    assert.deepEqual(manifest[0], {
      name: 'alpha',
      folder: resolve(root, 'alpha', 'workspace'),
      scannerProperties: {
        'sonar.sources': 'src, packages',
        'sonar.tests': 'tests',
        'sonar.exclusions': '**/dist/**, **/node_modules/**/*',
        'sonar.test.inclusions': '**/*.spec.ts',
      },
    });
    assert.deepEqual(JSON.parse(await readFile(outputPath, 'utf8')), manifest);
  });

  it('renders stable peachee shard matrices', async () => {
    const root = await tempRoot();
    await writeJson(join(root, 'projects.json'), {
      gamma: { repo: 'https://example.com/gamma.git', ref: '789' },
      alpha: { repo: 'https://example.com/alpha.git', ref: '123' },
      beta: { repo: 'https://example.com/beta.git', ref: '456' },
    });

    const outputPath = join(root, 'out', 'matrix.json');
    const matrix = await renderPeacheeShardMatrix({
      peacheeRoot: root,
      outputPath,
      projectFilter: '',
      projectsPerShard: 2,
    });

    assert.deepEqual(matrix, {
      include: [
        {
          shard: '01',
          label: '1/2',
          project_count: 2,
          project_filter: 'alpha,beta',
          projects: ['alpha', 'beta'],
        },
        {
          shard: '02',
          label: '2/2',
          project_count: 1,
          project_filter: 'gamma',
          projects: ['gamma'],
        },
      ],
    });
    assert.deepEqual(JSON.parse(await readFile(outputPath, 'utf8')), matrix);
  });

  it('skips auth-gated peachee projects in the public-only SIT fallback', async () => {
    const root = await tempRoot();
    await writeJson(join(root, 'projects.json'), {
      alpha: { repo: 'https://example.com/alpha.git', ref: '123' },
      secure: {
        repo: 'https://example.com/secure.git',
        ref: '456',
        auth: 'github_token',
      },
    });
    await mkdir(join(root, 'alpha', 'workspace'), { recursive: true });
    await writeFile(join(root, 'alpha', 'sonar-project.properties'), 'sonar.sources=src\n', 'utf8');

    const manifest = await generatePeacheeManifest({
      peacheeRoot: root,
      outputPath: join(root, 'out', 'manifest.json'),
      projectFilter: '',
    });

    assert.deepEqual(
      manifest.map(project => project.name),
      ['alpha'],
    );

    await assert.rejects(
      renderPeacheeShardMatrix({
        peacheeRoot: root,
        outputPath: join(root, 'out', 'matrix.json'),
        projectFilter: 'secure',
        projectsPerShard: 1,
      }),
      /Unknown, disabled, auth-gated, or unsupported peachee-js project\(s\): secure/,
    );
  });

  it('generates manifests from checked-in peachee snapshot metadata', async () => {
    const root = await tempRoot();
    await writeJson(join(root, 'projects.json'), {
      alpha: {
        repo: 'https://example.com/alpha.git',
        ref: '123',
        scannerProperties: {
          'sonar.sources': 'src',
          'sonar.tests': 'test',
        },
      },
    });

    const manifest = await generatePeacheeManifest({
      peacheeRoot: root,
      outputPath: join(root, 'out', 'manifest.json'),
      projectFilter: '',
    });

    assert.deepEqual(manifest, [
      {
        name: 'alpha',
        folder: resolve(root, 'alpha', 'workspace'),
        scannerProperties: {
          'sonar.sources': 'src',
          'sonar.tests': 'test',
        },
      },
    ]);
  });

  it('writes a public peachee snapshot from local peachee metadata', async () => {
    const root = await tempRoot();
    await writeJson(join(root, 'projects.json'), {
      alpha: { repo: 'https://example.com/alpha.git', ref: '123' },
      secure: {
        repo: 'https://example.com/secure.git',
        ref: '456',
        auth: 'github_token',
      },
    });
    await mkdir(join(root, 'alpha', 'workspace'), { recursive: true });
    await writeFile(join(root, 'alpha', 'sonar-project.properties'), 'sonar.sources=src\n', 'utf8');

    const snapshot = await generatePeacheePublicSnapshot({
      peacheeRoot: root,
      outputPath: join(root, 'out', 'snapshot.json'),
    });

    assert.deepEqual(snapshot, {
      alpha: {
        repo: 'https://example.com/alpha.git',
        ref: '123',
        scannerProperties: {
          'sonar.sources': 'src',
        },
      },
    });
    assert.deepEqual(
      JSON.parse(await readFile(join(root, 'out', 'snapshot.json'), 'utf8')),
      snapshot,
    );
  });

  it('skips unsupported peachee projects that need custom checkout scripts', async () => {
    const root = await tempRoot();
    await writeJson(join(root, 'projects.json'), {
      supported: { repo: 'https://example.com/supported.git', ref: '123' },
      scripted: { checkout: 'script' },
    });

    const matrix = await renderPeacheeShardMatrix({
      peacheeRoot: root,
      outputPath: join(root, 'out', 'matrix.json'),
      projectFilter: '',
      projectsPerShard: 2,
    });

    assert.deepEqual(matrix.include[0].projects, ['supported']);

    await assert.rejects(
      renderPeacheeShardMatrix({
        peacheeRoot: root,
        outputPath: join(root, 'out', 'filtered-matrix.json'),
        projectFilter: 'scripted',
        projectsPerShard: 1,
      }),
      /Unknown, disabled, auth-gated, or unsupported peachee-js project\(s\): scripted/,
    );
  });

  it('summarizes SIT export timings from metadata', async () => {
    const root = await tempRoot();
    await writeExport(root, 'baseline', 'alpha', 1_500);
    await writeExport(root, 'baseline', 'beta', 500);
    await writeExport(root, 'target', 'alpha', 2_000);
    await writeExport(root, 'target', 'beta', 1_000);

    const summary = await summarizeSitExports({
      baseDir: join(root, 'baseline'),
      targetDir: join(root, 'target'),
      summaryOutput: join(root, 'summary.json'),
    });

    assert.deepEqual(summary.baseline, {
      project_count: 2,
      total_analysis_duration_ms: 2_000,
      average_analysis_duration_ms: 1_000,
      slowest_projects: [
        { project_key: 'alpha', analysis_duration_ms: 1_500 },
        { project_key: 'beta', analysis_duration_ms: 500 },
      ],
      projects: [
        { project_key: 'alpha', analysis_duration_ms: 1_500 },
        { project_key: 'beta', analysis_duration_ms: 500 },
      ],
    });
    assert.equal(summary.target.total_analysis_duration_ms, 3_000);
    assert.equal(summary.target.slowest_projects[0].project_key, 'alpha');
  });
});

async function tempRoot() {
  const root = await mkdtemp(join(tmpdir(), 'sonarjs-sit-peachee-'));
  roots.push(root);
  return root;
}

async function writeExport(root: string, label: string, projectKey: string, durationMs: number) {
  const projectDir = join(root, label, projectKey);
  await mkdir(projectDir, { recursive: true });
  await writeFile(join(projectDir, 'issues.jsonl'), '', 'utf8');
  await writeJson(join(projectDir, 'metadata.json'), {
    project_key: projectKey,
    analysis_duration_ms: durationMs,
  });
}

async function writeJson(path: string, payload: object) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
