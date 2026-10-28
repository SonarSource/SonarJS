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
import { afterEach, beforeEach, describe, it } from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeProject } from '../src/analyzeProject.js';
import { initFileStoresForAnalysis } from '../src/file-stores/index.js';
import { createConfigurationFromInput } from '../src/common/configuration.js';
import { sanitizeInputFiles } from '../src/common/input-sanitize.js';
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';
import { getProgramCacheManager } from '../src/jsts/program/cache/programCache.js';
import { clearProgramOptionsCache } from '../src/jsts/program/cache/programOptionsCache.js';
import { clearSourceFileContentCache } from '../src/jsts/program/cache/sourceFileCache.js';
import { ProgramSelectionArchive } from '../src/program-selection/archive.js';
import type { RuleConfig } from '../src/jsts/linter/config/rule-config.js';

const rules: RuleConfig[] = ['js', 'ts'].map(language => ({
  key: 'S3003',
  configurations: [],
  fileTypeTargets: ['MAIN'],
  language: language as 'js' | 'ts',
  analysisModes: ['DEFAULT'],
}));
const raw =
  '<template>\n<p>{{ label }}</p>\n</template>\n<script setup lang="ts">\nimport { label } from "./dep";\nif ("100" < label) console.log(label);\n</script>';

describe('Vue project analysis', () => {
  let baseDir: string;
  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'sonar-vue-analysis-'));
    getProgramCacheManager().clear();
    clearProgramOptionsCache();
    clearSourceFileContentCache();
    await writeFile(join(baseDir, 'dep.ts'), 'export const label: string = "200";');
    await writeFile(join(baseDir, 'Component.vue'), raw);
  });
  afterEach(async () => {
    getProgramCacheManager().clear();
    clearSourceFileContentCache();
    await rm(baseDir, { recursive: true, force: true });
  });

  for (const sonarlint of [false, true]) {
    for (const configured of [false, true]) {
      it(`uses script types in ${sonarlint ? 'IDE' : 'batch'} ${configured ? 'configured' : 'orphan'} Programs`, async () => {
        if (configured) {
          await writeFile(
            join(baseDir, 'tsconfig.json'),
            JSON.stringify({ compilerOptions: { noLib: true }, include: ['*.vue', '*.ts'] }),
          );
        }
        const filePath = normalizeToAbsolutePath(join(baseDir, 'Component.vue'));
        const configuration = createConfigurationFromInput({ baseDir, sonarlint });
        const input = await sanitizeInputFiles(
          { [filePath]: { filePath, fileContent: raw } },
          configuration,
        );
        await initFileStoresForAnalysis(configuration, input.files);
        const archivePath = join(baseDir, 'selection.pb.gz');
        const recorder = new ProgramSelectionArchive(
          archivePath,
          normalizeToAbsolutePath(baseDir),
          'record',
        );
        const results = await analyzeProject(
          { rules, bundles: [], programSelection: sonarlint ? undefined : recorder },
          configuration,
        );
        recorder.end();
        const file = results.files[filePath];
        assert(file && 'issues' in file);
        assert.equal(file.issues.length, 1);
        assert.equal(file.issues[0].line, 6);
        if (!sonarlint) {
          const replay = new ProgramSelectionArchive(
            archivePath,
            normalizeToAbsolutePath(baseDir),
            'replay',
          );
          await initFileStoresForAnalysis(configuration, input.files);
          const restored = await analyzeProject(
            { rules, bundles: [], programSelection: replay },
            configuration,
          );
          assert.deepEqual(restored.files[filePath], file);
        }
      });
    }
  }

  it('keeps explicit syntax-only analysis available', async () => {
    const configuration = createConfigurationFromInput({ baseDir, disableTypeChecking: true });
    await initFileStoresForAnalysis(configuration);
    const result = await analyzeProject({ rules, bundles: [] }, configuration);
    const file = result.files[normalizeToAbsolutePath(join(baseDir, 'Component.vue'))];
    assert(file && 'issues' in file);
    assert.equal(file.issues.length, 0);
    assert.equal(result.meta.telemetry?.programCreation.succeeded, 0);
  });
});
