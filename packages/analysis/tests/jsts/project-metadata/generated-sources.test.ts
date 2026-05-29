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
import { sanitizeRawInputFiles } from '../../../src/common/input-sanitize.js';
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
  GRAPHQL_CODEGEN_FAMILY,
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

const fixtures = joinPaths(
  normalizeToAbsolutePath(import.meta.dirname),
  'fixtures',
  'generated-sources',
);

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

  it('registers the GraphQL detector through the shared contract', () => {
    expect(GENERATED_SOURCE_DETECTORS.map(detector => detector.family)).toEqual([
      GRAPHQL_CODEGEN_FAMILY,
    ]);
    expect(GENERATED_SOURCE_TASK_INVOCATION_PROVIDERS.map(provider => provider.kind)).toEqual([
      'package-json-scripts',
    ]);
    expect(GENERATED_SOURCE_WATCHED_FILENAMES).toEqual(
      expect.arrayContaining([
        'codegen.config.cjs',
        'codegen.config.cts',
        'codegen.config.js',
        'codegen.config.mjs',
        'codegen.config.mts',
        'codegen.config.ts',
        'codegen.js',
        'codegen.json',
        'codegen.ts',
        'codegen.yaml',
        'codegen.yml',
      ]),
    );
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

  it('derives GraphQL outputs from the standard fixture', async () => {
    const baseDir = joinPaths(fixtures, 'graphql-codegen-standard');
    await initFileStores(createConfiguration({ baseDir }));

    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'src', 'generated', 'graphql.ts')),
    ).toEqual(GRAPHQL_CODEGEN_FAMILY);
    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'src', 'generated', 'types', 'schema.ts')),
    ).toEqual(GRAPHQL_CODEGEN_FAMILY);
    expect(
      generatedSourceStore.getFamily(
        joinPaths(baseDir, 'src', 'generated', 'types', 'nested', 'schema.ts'),
      ),
    ).toEqual(GRAPHQL_CODEGEN_FAMILY);
    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'dist', 'generated', 'ignored.ts')),
    ).toBeUndefined();
  });

  it('inherits parent GraphQL Code Generator dependencies into nested packages', async () => {
    const baseDir = await createTempBaseDir();
    const packageDir = joinPaths(baseDir, 'packages', 'app');
    const outputPath = joinPaths(packageDir, 'src', 'generated', 'graphql.ts');

    try {
      await writeFixtureFile(
        join(baseDir, 'package.json'),
        JSON.stringify(
          {
            private: true,
            devDependencies: {
              [GRAPHQL_CODEGEN_FAMILY]: '5.0.0',
            },
          },
          null,
          2,
        ),
      );
      await writeFixtureFile(join(packageDir, 'package.json'), JSON.stringify({ name: 'app' }));
      await writeFixtureFile(
        join(packageDir, 'codegen.yml'),
        `generates:
  ./src/generated/graphql.ts:
    plugins:
      - typescript
`,
      );
      await writeFixtureFile(outputPath, 'export const generated = true;\n');

      await initFileStores(createConfiguration({ baseDir }));

      expect(generatedSourceStore.getFamily(outputPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('derives package-local GraphQL outputs declared relative to the workspace root', async () => {
    const baseDir = await createTempBaseDir();
    const packageDir = joinPaths(baseDir, 'libs', 'shared', 'cms');
    const outputPath = joinPaths(packageDir, 'src', '__generated__', 'graphql.ts');

    try {
      await writeFixtureFile(
        join(baseDir, 'package.json'),
        JSON.stringify(
          {
            private: true,
            devDependencies: {
              [GRAPHQL_CODEGEN_FAMILY]: '5.0.0',
            },
          },
          null,
          2,
        ),
      );
      await writeFixtureFile(join(packageDir, 'package.json'), JSON.stringify({ name: 'cms' }));
      await writeFixtureFile(
        join(packageDir, 'codegen.config.ts'),
        `const config = {
  generates: {
    'libs/shared/cms/src/__generated__/': {
      preset: 'client',
    },
  },
};

export default config;
`,
      );
      await writeFixtureFile(outputPath, 'export const generated = true;\n');

      await initFileStores(createConfiguration({ baseDir }));

      expect(generatedSourceStore.getFamily(outputPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('derives GraphQL outputs from an explicit config flag using equals syntax', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, 'config', 'custom-codegen.ts');
    const outputPath = joinPaths(baseDir, 'src', 'generated', 'sdk.ts');

    try {
      await writeFixtureFile(
        configPath,
        `const config = {
  generates: {
    '../src/generated/sdk.ts': {
      plugins: ['typescript'],
    },
  },
};

export default config;
`,
      );
      await writeFixtureFile(outputPath, 'export const sdk = true;\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          devDependencies: {
            [GRAPHQL_CODEGEN_FAMILY]: '1.0.0',
          },
          scripts: {
            codegen: 'graphql-codegen --config=./config/custom-codegen.ts',
          },
        }),
      );

      expect(derived.familyByFile.get(outputPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('derives GraphQL outputs from a codegen.config.cts file using export equals', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, 'codegen.config.cts');
    const outputPath = joinPaths(baseDir, 'src', 'generated', 'sdk.ts');

    try {
      await writeFixtureFile(
        configPath,
        `const config = {
  generates: {
    './src/generated/sdk.ts': {
      plugins: ['typescript'],
    },
  },
};

export = config;
`,
      );
      await writeFixtureFile(outputPath, 'export const sdk = true;\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          devDependencies: {
            [GRAPHQL_CODEGEN_FAMILY]: '1.0.0',
          },
        }),
      );

      expect(derived.familyByFile.get(outputPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('refreshes generated-source metadata when an explicit GraphQL config file is created later', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, 'config', 'custom-codegen.ts');
    const outputPath = joinPaths(baseDir, 'src', 'generated', 'sdk.ts');

    try {
      await writeFixtureFile(
        join(baseDir, 'package.json'),
        JSON.stringify(
          {
            devDependencies: {
              [GRAPHQL_CODEGEN_FAMILY]: '1.0.0',
            },
            scripts: {
              codegen: 'graphql-codegen --config ./config/custom-codegen.ts',
            },
          },
          null,
          2,
        ),
      );

      await initFileStores(createConfiguration({ baseDir }));
      expect(generatedSourceStore.getFamily(outputPath)).toBeUndefined();

      await writeFixtureFile(
        configPath,
        `const config = {
  generates: {
    '../src/generated/sdk.ts': {
      plugins: ['typescript'],
    },
  },
};

export default config;
`,
      );
      await writeFixtureFile(outputPath, 'export const sdk = true;\n');

      const configuration = createConfiguration({
        baseDir,
        fsEvents: {
          [configPath]: 'CREATED',
          [outputPath]: 'CREATED',
        },
      });
      const { files: inputFiles } = await sanitizeRawInputFiles(
        {
          [outputPath]: {
            filePath: outputPath,
            fileType: 'MAIN',
          },
        },
        configuration,
      );

      await initFileStores(configuration, inputFiles);

      expect(generatedSourceStore.getFamily(outputPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('refreshes generated-source metadata when a declared GraphQL output file is created later', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, 'codegen.config.ts');
    const outputPath = joinPaths(baseDir, 'src', 'generated', 'sdk.ts');

    try {
      await writeFixtureFile(
        join(baseDir, 'package.json'),
        JSON.stringify(
          {
            devDependencies: {
              [GRAPHQL_CODEGEN_FAMILY]: '1.0.0',
            },
          },
          null,
          2,
        ),
      );
      await writeFixtureFile(
        configPath,
        `const config = {
  generates: {
    './src/generated/sdk.ts': {
      plugins: ['typescript'],
    },
  },
};

export default config;
`,
      );

      await initFileStores(createConfiguration({ baseDir }));
      expect(generatedSourceStore.getFamily(outputPath)).toBeUndefined();

      await writeFixtureFile(outputPath, 'export const sdk = true;\n');

      const configuration = createConfiguration({
        baseDir,
        fsEvents: {
          [outputPath]: 'CREATED',
        },
      });
      const { files: inputFiles } = await sanitizeRawInputFiles(
        {
          [outputPath]: {
            filePath: outputPath,
            fileType: 'MAIN',
          },
        },
        configuration,
      );

      await initFileStores(configuration, inputFiles);

      expect(generatedSourceStore.getFamily(outputPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('does not derive GraphQL outputs when graphql-codegen is only echoed', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, 'config', 'custom-codegen.ts');
    const outputPath = joinPaths(baseDir, 'src', 'generated', 'sdk.ts');

    try {
      await writeFixtureFile(
        configPath,
        `const config = {
  generates: {
    '../src/generated/sdk.ts': {
      plugins: ['typescript'],
    },
  },
};

export default config;
`,
      );
      await writeFixtureFile(outputPath, 'export const sdk = true;\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          devDependencies: {
            [GRAPHQL_CODEGEN_FAMILY]: '1.0.0',
          },
          scripts: {
            codegen: 'echo graphql-codegen --config ./config/custom-codegen.ts',
          },
        }),
      );

      expect(derived.familyByFile.get(outputPath)).toBeUndefined();
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('derives GraphQL outputs from a package-local codegen.config.ts fallback file', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, 'codegen.config.ts');
    const outputPath = joinPaths(baseDir, 'src', 'generated', 'sdk.ts');

    try {
      await writeFixtureFile(
        configPath,
        `const config = {
  generates: {
    './src/generated/sdk.ts': {
      plugins: ['typescript'],
    },
  },
};

export default config;
`,
      );
      await writeFixtureFile(outputPath, 'export const sdk = true;\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          devDependencies: {
            [GRAPHQL_CODEGEN_FAMILY]: '1.0.0',
          },
        }),
      );

      expect(derived.configPaths).toEqual(new Set([configPath]));
      expect(derived.familyByFile.get(outputPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('refreshes generated-source matches when the explicit request file set changes', async () => {
    const baseDir = joinPaths(fixtures, 'graphql-codegen-standard');
    const firstGeneratedFile = joinPaths(baseDir, 'src', 'generated', 'graphql.ts');
    const secondGeneratedFile = joinPaths(baseDir, 'src', 'generated', 'types', 'schema.ts');
    const configuration = createConfiguration({ baseDir });
    const { files: firstInputFiles } = await sanitizeRawInputFiles(
      {
        [firstGeneratedFile]: {
          filePath: firstGeneratedFile,
          fileType: 'MAIN',
        },
      },
      configuration,
    );

    await initFileStores(configuration, firstInputFiles);

    expect(generatedSourceStore.getFamily(firstGeneratedFile)).toEqual(GRAPHQL_CODEGEN_FAMILY);
    expect(generatedSourceStore.getFamily(secondGeneratedFile)).toBeUndefined();

    const { files: secondInputFiles } = await sanitizeRawInputFiles(
      {
        [secondGeneratedFile]: {
          filePath: secondGeneratedFile,
          fileType: 'MAIN',
        },
      },
      configuration,
    );

    expect(await generatedSourceStore.isInitialized(configuration, secondInputFiles)).toBe(true);

    expect(generatedSourceStore.getFamily(firstGeneratedFile)).toBeUndefined();
    expect(generatedSourceStore.getFamily(secondGeneratedFile)).toEqual(GRAPHQL_CODEGEN_FAMILY);
  });

  it('recomputes generated-source metadata when filesystem access becomes available again', async () => {
    const baseDir = joinPaths(fixtures, 'graphql-codegen-standard');

    await initFileStores(createConfiguration({ baseDir, canAccessFileSystem: false }));
    await initFileStores(createConfiguration({ baseDir }));

    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'src', 'generated', 'graphql.ts')),
    ).toEqual(GRAPHQL_CODEGEN_FAMILY);
  });

  it('ignores malformed GraphQL config parse errors', async () => {
    const baseDir = await createTempBaseDir();

    try {
      for (const [filename, configContents] of [
        ['codegen.json', '{ invalid json'],
        ['codegen.yml', 'generates: ['],
      ]) {
        await writeFile(join(baseDir, filename), configContents);

        const derived = await deriveGeneratedSources(
          baseDir,
          createPackageJsonMap(baseDir, {
            devDependencies: {
              [GRAPHQL_CODEGEN_FAMILY]: '1.0.0',
            },
            scripts: {
              codegen: `graphql-codegen --config ${filename}`,
            },
          }),
        );

        expect([...derived.familyByFile.keys()]).toEqual([]);
      }
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });
});
