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
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { detectChangedRules, type ChangedFile } from './detect-changed-rules.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('detectChangedRules', () => {
  it('maps JS/TS rule implementation paths using compatibleLanguages', async () => {
    const root = await repoRoot();
    await writeRuleMetadata(root, 'S1116', ['js', 'ts']);

    const rules = await detectChangedRules(root, [
      added('packages/analysis/src/jsts/rules/S1116/rule.ts'),
    ]);

    assert.deepEqual(rules, [
      { repository: 'javascript', language: 'js', ruleKey: 'S1116' },
      { repository: 'typescript', language: 'ts', ruleKey: 'S1116' },
    ]);
  });

  it('maps JS-only and TS-only rules without duplicates', async () => {
    const root = await repoRoot();
    await writeRuleMetadata(root, 'S3758', ['js']);
    await writeRuleMetadata(root, 'S7648', ['ts']);

    const rules = await detectChangedRules(root, [
      added('packages/analysis/src/jsts/rules/S7648/rule.ts'),
      added(
        'sonar-plugin/javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/javascript/S3758.json',
      ),
      added('packages/analysis/src/jsts/rules/S7648/meta.ts'),
    ]);

    assert.deepEqual(rules, [
      { repository: 'javascript', language: 'js', ruleKey: 'S3758' },
      { repository: 'typescript', language: 'ts', ruleKey: 'S7648' },
    ]);
  });

  it('falls back to resources/rule-data when deployed metadata is unavailable', async () => {
    const root = await repoRoot();
    await writeRuleDataMetadata(root, 'S2925', ['js', 'ts']);

    const rules = await detectChangedRules(root, [
      added('packages/analysis/src/jsts/rules/S2925/rule.ts'),
    ]);

    assert.deepEqual(rules, [
      { repository: 'javascript', language: 'js', ruleKey: 'S2925' },
      { repository: 'typescript', language: 'ts', ruleKey: 'S2925' },
    ]);
  });

  it('maps CSS rule implementation and metadata paths', async () => {
    const root = await repoRoot();

    const rules = await detectChangedRules(root, [
      added('packages/analysis/src/css/rules/S4660/config.ts'),
      added('sonar-plugin/css/src/main/resources/org/sonar/l10n/css/rules/css/S125.json'),
    ]);

    assert.deepEqual(rules, [
      { repository: 'css', language: 'css', ruleKey: 'S125' },
      { repository: 'css', language: 'css', ruleKey: 'S4660' },
    ]);
  });

  it('ignores deleted files and unsupported paths', async () => {
    const root = await repoRoot();
    await writeRuleMetadata(root, 'S1116', ['js', 'ts']);

    const rules = await detectChangedRules(root, [
      { status: 'D', path: 'packages/analysis/src/jsts/rules/S1116/rule.ts' },
      added('packages/analysis/src/jsts/README.md'),
    ]);

    assert.deepEqual(rules, []);
  });
});

function added(path: string): ChangedFile {
  return { status: 'A', path };
}

async function repoRoot() {
  const root = await mkdtemp(join(tmpdir(), 'sonarjs-sit-detector-'));
  roots.push(root);
  return root;
}

async function writeRuleMetadata(root: string, ruleKey: string, compatibleLanguages: string[]) {
  const dir = join(
    root,
    'sonar-plugin/javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/javascript',
  );
  await writeMetadataFile(dir, ruleKey, compatibleLanguages);
}

async function writeRuleDataMetadata(root: string, ruleKey: string, compatibleLanguages: string[]) {
  const dir = join(root, 'resources/rule-data/javascript');
  await writeMetadataFile(dir, ruleKey, compatibleLanguages);
}

async function writeMetadataFile(dir: string, ruleKey: string, compatibleLanguages: string[]) {
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${ruleKey}.json`),
    JSON.stringify({
      sqKey: ruleKey,
      compatibleLanguages,
    }),
  );
}
