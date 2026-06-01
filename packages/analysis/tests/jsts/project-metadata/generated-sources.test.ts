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
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import { expect } from 'expect';
import { createConfiguration } from '../../../src/common/configuration.js';
import {
  dependencyManifestStore,
  generatedSourceStore,
  initFileStores,
  sourceFileStore,
} from '../../../src/file-stores/index.js';
import {
  deriveGeneratedSources,
  extractFlagValues,
} from '../../../src/jsts/rules/helpers/generated-sources/derive.js';
import {
  GENERATED_SOURCE_DETECTORS,
  GENERATED_SOURCE_TASK_INVOCATION_PROVIDERS,
  GENERATED_SOURCE_WATCHED_FILENAMES,
  collectGeneratedSourceTaskInvocations,
} from '../../../src/jsts/rules/helpers/generated-sources/index.js';
import {
  joinPaths,
  normalizeToAbsolutePath,
  type File,
  type NormalizedAbsolutePath,
} from '../../../../shared/src/helpers/files.js';

function createPackageJsonMap(
  packageDir: NormalizedAbsolutePath,
  packageJson: Record<string, unknown>,
) {
  const packageJsonPath = joinPaths(packageDir, 'package.json');
  return new Map<NormalizedAbsolutePath, File>([
    [packageDir, { path: packageJsonPath, content: JSON.stringify(packageJson, null, 2) }],
  ]);
}

async function createTempBaseDir() {
  return normalizeToAbsolutePath(await mkdtemp(join(tmpdir(), 'generated-sources-test-')));
}

async function writeFixtureFile(filePath: string, content = '') {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

describe('generated sources project metadata', () => {
  beforeEach(() => {
    dependencyManifestStore.clearCache();
    generatedSourceStore.clearCache();
    sourceFileStore.clearCache();
  });

  it('registers no detector yet through the shared contract', () => {
    expect(GENERATED_SOURCE_DETECTORS).toEqual([]);
    expect(GENERATED_SOURCE_TASK_INVOCATION_PROVIDERS.map(provider => provider.kind)).toEqual([
      'package-json-scripts',
    ]);
    expect(GENERATED_SOURCE_WATCHED_FILENAMES).toEqual([]);
  });

  it('collects and normalizes package.json task invocations', async () => {
    const baseDir = await createTempBaseDir();

    try {
      const taskInvocations = await collectGeneratedSourceTaskInvocations({
        baseDir,
        packageDir: baseDir,
        packageJson: {
          scripts: {
            codegen: 'graphql-codegen --config ./codegen.yml && prettier src/generated',
            wrapped: 'npx graphql-codegen --config ./codegen.yml',
            rawYarn: 'yarn graphql-codegen --config ./codegen.yml',
          },
        },
      });

      expect(taskInvocations).toEqual([
        {
          source: 'package-json-script',
          taskName: 'codegen',
          commandLine: 'graphql-codegen --config ./codegen.yml',
          command: 'graphql-codegen',
          args: ['--config', './codegen.yml'],
        },
        {
          source: 'package-json-script',
          taskName: 'codegen',
          commandLine: 'prettier src/generated',
          command: 'prettier',
          args: ['src/generated'],
        },
        {
          source: 'package-json-script',
          taskName: 'wrapped',
          commandLine: 'npx graphql-codegen --config ./codegen.yml',
          command: 'graphql-codegen',
          args: ['--config', './codegen.yml'],
        },
        {
          source: 'package-json-script',
          taskName: 'rawYarn',
          commandLine: 'yarn graphql-codegen --config ./codegen.yml',
          command: 'yarn',
          args: ['graphql-codegen', '--config', './codegen.yml'],
        },
      ]);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('extracts output flag values from separate and equals syntax', () => {
    expect(
      extractFlagValues('graphql-codegen --config ./codegen.yml --config=./other.yml', [
        '--config',
      ]),
    ).toEqual(['./codegen.yml', './other.yml']);
  });

  it('returns no derived metadata when no detector is registered', async () => {
    const baseDir = await createTempBaseDir();

    try {
      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          devDependencies: {
            '@graphql-codegen/cli': '1.0.0',
          },
          scripts: {
            codegen: 'graphql-codegen --config ./codegen.ts',
          },
        }),
      );

      expect(derived.familyByFile).toEqual(new Map());
      expect(derived.configPaths).toEqual(new Set());
      expect(derived.watchedOutputPaths).toEqual(new Set());
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('keeps the generated-source store empty when no detector is registered', async () => {
    const baseDir = await createTempBaseDir();
    const outputPath = joinPaths(baseDir, 'src', 'generated', 'graphql.ts');

    try {
      await writeFixtureFile(
        join(baseDir, 'package.json'),
        JSON.stringify(
          {
            devDependencies: {
              '@graphql-codegen/cli': '5.0.0',
            },
            scripts: {
              codegen: 'graphql-codegen --config ./codegen.ts',
            },
          },
          null,
          2,
        ),
      );
      await writeFixtureFile(
        join(baseDir, 'codegen.ts'),
        `export default {
  generates: {
    './src/generated/graphql.ts': {
      plugins: ['typescript'],
    },
  },
};
`,
      );
      await writeFixtureFile(outputPath, 'export const generated = true;\n');

      await initFileStores(createConfiguration({ baseDir }));

      expect(generatedSourceStore.getFamily(outputPath)).toBeUndefined();
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });
});
