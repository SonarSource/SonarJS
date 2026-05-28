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
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { beforeEach, describe, it, type Mock } from 'node:test';
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
  GENERATED_SOURCE_DETECTORS,
  GENERATED_SOURCE_TASK_INVOCATION_PROVIDERS,
  GENERATED_SOURCE_WATCHED_FILENAMES,
  SUPPORTED_GENERATED_SOURCE_FAMILIES,
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

async function createTempBaseDirInBuildParent() {
  const buildParentDir = join(tmpdir(), 'build');
  await mkdir(buildParentDir, { recursive: true });
  return normalizeToAbsolutePath(await mkdtemp(join(buildParentDir, 'generated-sources-test-')));
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

  it('exposes only the currently supported generated-source families', () => {
    expect(SUPPORTED_GENERATED_SOURCE_FAMILIES).toEqual([
      '@graphql-codegen/cli',
      '@openapitools/openapi-generator-cli',
      'proto-loader-gen-types',
    ]);
  });

  it('registers detectors through a shared generated-source contract', () => {
    expect(GENERATED_SOURCE_DETECTORS.map(detector => detector.family)).toEqual([
      ...SUPPORTED_GENERATED_SOURCE_FAMILIES,
    ]);
    expect(GENERATED_SOURCE_WATCHED_FILENAMES).toHaveLength(11);
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

  it('registers task invocation providers through a shared generated-source contract', () => {
    expect(GENERATED_SOURCE_TASK_INVOCATION_PROVIDERS.map(provider => provider.kind)).toEqual([
      'package-json-scripts',
    ]);
  });

  it('collects package.json task invocations as tokenized scripts', async () => {
    const baseDir = await createTempBaseDir();

    try {
      const taskInvocations = await collectGeneratedSourceTaskInvocations({
        baseDir,
        packageDir: baseDir,
        packageJson: {
          scripts: {
            graphql: 'graphql-codegen --config ./codegen.yml',
            proto: 'node ./bin/internal-proto-codegen.js -O=./src/generated ./proto/service.proto',
          },
        },
      });

      expect(taskInvocations).toEqual([
        {
          source: 'package-json-script',
          taskName: 'graphql',
          commandLine: 'graphql-codegen --config ./codegen.yml',
          tokens: ['graphql-codegen', '--config', './codegen.yml'],
        },
        {
          source: 'package-json-script',
          taskName: 'proto',
          commandLine:
            'node ./bin/internal-proto-codegen.js -O=./src/generated ./proto/service.proto',
          tokens: [
            'node',
            './bin/internal-proto-codegen.js',
            '-O=./src/generated',
            './proto/service.proto',
          ],
        },
      ]);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('extracts output flag values from separate and equals syntax', () => {
    expect(
      extractFlagValues('openapi-generator-cli generate -o ./src/api --output=./src/other', [
        '-o',
        '--output',
      ]),
    ).toEqual(['./src/api', './src/other']);
  });

  it('derives GraphQL Code Generator outputs from a standard config file', async () => {
    const baseDir = joinPaths(fixtures, 'graphql-codegen-standard');
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'src', 'generated', 'graphql.ts')),
    ).toEqual('@graphql-codegen/cli');
    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'src', 'generated', 'types', 'schema.ts')),
    ).toEqual('@graphql-codegen/cli');
    expect(
      generatedSourceStore.getFamily(
        joinPaths(baseDir, 'src', 'generated', 'types', 'nested', 'schema.ts'),
      ),
    ).toEqual('@graphql-codegen/cli');
    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'dist', 'generated', 'ignored.ts')),
    ).toBeUndefined();
  });

  it('derives GraphQL Code Generator outputs from catalog-resolved peer dependencies', async () => {
    const baseDir = await createTempBaseDir();
    const outputPath = joinPaths(baseDir, 'src', 'generated', 'graphql.ts');

    try {
      await writeFixtureFile(
        join(baseDir, 'package.json'),
        JSON.stringify(
          {
            name: 'catalog-peer-dependency-fixture',
            peerDependencies: {
              '@graphql-codegen/cli': 'catalog:',
            },
          },
          null,
          2,
        ),
      );
      await writeFixtureFile(
        join(baseDir, 'pnpm-workspace.yaml'),
        `catalog:
  "@graphql-codegen/cli": "^5.0.0"
`,
      );
      await writeFixtureFile(
        join(baseDir, 'codegen.yml'),
        `generates:
  ./src/generated/graphql.ts:
    plugins:
      - typescript
`,
      );
      await writeFixtureFile(outputPath, 'export const generated = true;\n');

      await initFileStores(createConfiguration({ baseDir }));

      expect(generatedSourceStore.getFamily(outputPath)).toEqual('@graphql-codegen/cli');
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
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
              '@graphql-codegen/cli': '5.0.0',
            },
          },
          null,
          2,
        ),
      );
      await writeFixtureFile(
        join(packageDir, 'package.json'),
        JSON.stringify(
          {
            name: 'app',
          },
          null,
          2,
        ),
      );
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

      expect(generatedSourceStore.getFamily(outputPath)).toEqual('@graphql-codegen/cli');
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('derives GraphQL Code Generator outputs from an explicit config file', async () => {
    const baseDir = joinPaths(fixtures, 'graphql-codegen-explicit');
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'src', 'generated', 'sdk.ts')),
    ).toEqual('@graphql-codegen/cli');
    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'build', 'generated', 'ignored.ts')),
    ).toEqual('@graphql-codegen/cli');
  });

  it('derives GraphQL Code Generator outputs from an explicit config flag using equals syntax', async () => {
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

      const packageJsons = createPackageJsonMap(baseDir, {
        devDependencies: {
          '@graphql-codegen/cli': '1.0.0',
        },
        scripts: {
          codegen: 'graphql-codegen --config=./config/custom-codegen.ts',
        },
      });

      const derived = await deriveGeneratedSources(baseDir, packageJsons);

      expect(derived.familyByFile.get(outputPath)).toEqual('@graphql-codegen/cli');
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('ignores GraphQL config flags with unterminated quoted values', async () => {
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

      const packageJsons = createPackageJsonMap(baseDir, {
        devDependencies: {
          '@graphql-codegen/cli': '1.0.0',
        },
        scripts: {
          codegen: 'graphql-codegen --config "./config/custom-codegen.ts',
        },
      });

      const derived = await deriveGeneratedSources(baseDir, packageJsons);

      expect(derived.configPaths).toEqual(new Set());
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

      const packageJsons = createPackageJsonMap(baseDir, {
        devDependencies: {
          '@graphql-codegen/cli': '1.0.0',
        },
      });

      const derived = await deriveGeneratedSources(baseDir, packageJsons);

      expect(derived.configPaths).toEqual(new Set([configPath]));
      expect(derived.familyByFile.get(outputPath)).toEqual('@graphql-codegen/cli');
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('derives OpenAPI Generator outputs from a literal output directory', async () => {
    const baseDir = joinPaths(fixtures, 'openapi');
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    expect(generatedSourceStore.getFamily(joinPaths(baseDir, 'src', 'api', 'index.ts'))).toEqual(
      '@openapitools/openapi-generator-cli',
    );
    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'src', 'api', 'models', 'pet.ts')),
    ).toEqual('@openapitools/openapi-generator-cli');
    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'build', 'api', 'ignored.ts')),
    ).toEqual('@openapitools/openapi-generator-cli');
  });

  it('derives OpenAPI Generator outputs from an output flag using equals syntax', async () => {
    const baseDir = await createTempBaseDir();
    const outputFile = joinPaths(baseDir, 'src', 'api', 'index.ts');

    try {
      await writeFixtureFile(outputFile, 'export const api = true;\n');

      const packageJsons = createPackageJsonMap(baseDir, {
        devDependencies: {
          '@openapitools/openapi-generator-cli': '1.0.0',
        },
        scripts: {
          generate: 'openapi-generator-cli generate --output=./src/api',
        },
      });

      const derived = await deriveGeneratedSources(baseDir, packageJsons);

      expect(derived.familyByFile.get(outputFile)).toEqual('@openapitools/openapi-generator-cli');
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('does not derive generated sources from Nx metadata without supported task invocations', async () => {
    const baseDir = await createTempBaseDir();
    const outputFile = joinPaths(baseDir, 'src', 'api', 'index.ts');

    try {
      await writeFixtureFile(outputFile, 'export const api = true;\n');
      await writeFixtureFile(
        join(baseDir, 'project.json'),
        JSON.stringify(
          {
            targets: {
              generate: {
                executor: 'nx:run-commands',
                options: {
                  command: 'openapi-generator-cli generate --output=./src/api',
                },
              },
            },
          },
          null,
          2,
        ),
      );

      const packageJsons = createPackageJsonMap(baseDir, {
        devDependencies: {
          '@openapitools/openapi-generator-cli': '1.0.0',
        },
      });

      const derived = await deriveGeneratedSources(baseDir, packageJsons);

      expect(derived.familyByFile.get(outputFile)).toBeUndefined();
      expect([...derived.outputDirectories]).toEqual([]);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('derives OpenAPI Generator outputs rooted under dist while pruning nested cache folders', async () => {
    const baseDir = await createTempBaseDir();
    const outputFile = joinPaths(baseDir, 'dist', 'api', 'models', 'index.ts');
    const ignoredCacheFile = joinPaths(baseDir, 'dist', 'api', '.cache', 'ignored.ts');

    try {
      await writeFixtureFile(outputFile, 'export const api = true;\n');
      await writeFixtureFile(ignoredCacheFile, 'export const ignored = true;\n');

      const packageJsons = createPackageJsonMap(baseDir, {
        devDependencies: {
          '@openapitools/openapi-generator-cli': '1.0.0',
        },
        scripts: {
          generate: 'openapi-generator-cli generate --output=./dist/api',
        },
      });

      const derived = await deriveGeneratedSources(baseDir, packageJsons);

      expect(derived.familyByFile.get(outputFile)).toEqual('@openapitools/openapi-generator-cli');
      expect(derived.familyByFile.get(ignoredCacheFile)).toBeUndefined();
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('aligns generated-source classification with configured analyzable suffixes', async () => {
    const baseDir = await createTempBaseDir();
    const generatedFile = joinPaths(baseDir, 'src', 'api', 'index.foo');

    try {
      await writeFixtureFile(
        joinPaths(baseDir, 'package.json'),
        JSON.stringify(
          {
            devDependencies: {
              '@openapitools/openapi-generator-cli': '1.0.0',
            },
            scripts: {
              generate: 'openapi-generator-cli generate --output=./src/api',
            },
          },
          null,
          2,
        ),
      );
      await writeFixtureFile(generatedFile, 'export const api = true;\n');

      await initFileStores(
        createConfiguration({
          baseDir,
          jsSuffixes: ['.foo'],
          tsSuffixes: [],
        }),
      );

      expect(sourceFileStore.getFiles()[generatedFile]).toBeDefined();
      expect(generatedSourceStore.getFamily(generatedFile)).toEqual(
        '@openapitools/openapi-generator-cli',
      );
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('rebuilds warmed stores when analyzable suffixes change', async () => {
    const baseDir = await createTempBaseDir();
    const generatedFile = joinPaths(baseDir, 'src', 'api', 'index.foo');

    try {
      await writeFixtureFile(
        joinPaths(baseDir, 'package.json'),
        JSON.stringify(
          {
            devDependencies: {
              '@openapitools/openapi-generator-cli': '1.0.0',
            },
            scripts: {
              generate: 'openapi-generator-cli generate --output=./src/api',
            },
          },
          null,
          2,
        ),
      );
      await writeFixtureFile(generatedFile, 'export const api = true;\n');

      await initFileStores(createConfiguration({ baseDir }));

      expect(sourceFileStore.getFiles()[generatedFile]).toBeUndefined();
      expect(generatedSourceStore.getFamily(generatedFile)).toBeUndefined();

      await initFileStores(
        createConfiguration({
          baseDir,
          jsSuffixes: ['.foo'],
          tsSuffixes: [],
        }),
      );

      expect(sourceFileStore.getFiles()[generatedFile]).toBeDefined();
      expect(generatedSourceStore.getFamily(generatedFile)).toEqual(
        '@openapitools/openapi-generator-cli',
      );
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('does not classify excluded generated outputs', async () => {
    const baseDir = await createTempBaseDir();
    const generatedFile = joinPaths(baseDir, 'src', 'api', 'index.ts');

    try {
      await writeFixtureFile(
        joinPaths(baseDir, 'package.json'),
        JSON.stringify(
          {
            devDependencies: {
              '@openapitools/openapi-generator-cli': '1.0.0',
            },
            scripts: {
              generate: 'openapi-generator-cli generate --output=./src/api',
            },
          },
          null,
          2,
        ),
      );
      await writeFixtureFile(generatedFile, 'export const api = true;\n');

      await initFileStores(
        createConfiguration({
          baseDir,
          jsTsExclusions: ['src/api/**'],
        }),
      );

      expect(sourceFileStore.getFiles()[generatedFile]).toBeUndefined();
      expect(generatedSourceStore.getFamily(generatedFile)).toBeUndefined();
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('rebuilds warmed stores when source exclusions change', async () => {
    const baseDir = await createTempBaseDir();
    const generatedFile = joinPaths(baseDir, 'src', 'api', 'index.ts');

    try {
      await writeFixtureFile(
        joinPaths(baseDir, 'package.json'),
        JSON.stringify(
          {
            devDependencies: {
              '@openapitools/openapi-generator-cli': '1.0.0',
            },
            scripts: {
              generate: 'openapi-generator-cli generate --output=./src/api',
            },
          },
          null,
          2,
        ),
      );
      await writeFixtureFile(generatedFile, 'export const api = true;\n');

      await initFileStores(createConfiguration({ baseDir }));

      expect(sourceFileStore.getFiles()[generatedFile]).toBeDefined();
      expect(generatedSourceStore.getFamily(generatedFile)).toEqual(
        '@openapitools/openapi-generator-cli',
      );

      await initFileStores(
        createConfiguration({
          baseDir,
          jsTsExclusions: ['src/api/**'],
        }),
      );

      expect(sourceFileStore.getFiles()[generatedFile]).toBeUndefined();
      expect(generatedSourceStore.getFamily(generatedFile)).toBeUndefined();
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('records generated-source observability for tagged, excluded, and out-of-scope files', async ({
    mock,
  }) => {
    const baseDir = await createTempBaseDir();
    const taggedFile = joinPaths(baseDir, 'src', 'generated', 'keep.ts');
    const excludedFile = joinPaths(baseDir, 'src', 'excluded', 'blocked.ts');
    const outOfScopeFile = joinPaths(baseDir, 'outside', 'api', 'index.ts');
    console.log = mock.fn(console.log);

    try {
      await writeFixtureFile(
        joinPaths(baseDir, 'package.json'),
        JSON.stringify(
          {
            devDependencies: {
              '@graphql-codegen/cli': '1.0.0',
              '@openapitools/openapi-generator-cli': '1.0.0',
            },
            scripts: {
              graphql: 'graphql-codegen --config ./codegen.yml',
              openapi: 'openapi-generator-cli generate --output=./outside/api',
            },
          },
          null,
          2,
        ),
      );
      await writeFixtureFile(
        joinPaths(baseDir, 'codegen.yml'),
        `generates:
  ./src/generated/keep.ts:
    plugins:
      - typescript
  ./src/excluded/blocked.ts:
    plugins:
      - typescript
`,
      );
      await writeFixtureFile(taggedFile, 'export const tagged = true;\n');
      await writeFixtureFile(excludedFile, 'export const excluded = true;\n');
      await writeFixtureFile(outOfScopeFile, 'export const outOfScope = true;\n');

      await initFileStores(
        createConfiguration({
          baseDir,
          sources: ['src'],
          exclusions: ['src/excluded/**'],
        }),
      );

      expect(generatedSourceStore.getFamily(taggedFile)).toEqual('@graphql-codegen/cli');
      expect(generatedSourceStore.getFamily(excludedFile)).toBeUndefined();
      expect(generatedSourceStore.getFamily(outOfScopeFile)).toBeUndefined();
      expect(generatedSourceStore.getObservabilityTelemetry()).toEqual({
        familyCount: 2,
        resolvedFileCount: 3,
        taggedFileCount: 1,
        outOfScopeFileCount: 1,
        excludedFileCount: 1,
        families: [
          {
            family: '@graphql-codegen/cli',
            resolvedFileCount: 2,
            taggedFileCount: 1,
            outOfScopeFileCount: 0,
            excludedFileCount: 1,
          },
          {
            family: '@openapitools/openapi-generator-cli',
            resolvedFileCount: 1,
            taggedFileCount: 0,
            outOfScopeFileCount: 1,
            excludedFileCount: 0,
          },
        ],
      });

      const logs = (console.log as Mock<typeof console.log>).mock.calls.map(
        call => call.arguments[0],
      );
      expect(logs).toContain(
        'Generated source observability: families=2, resolvedFiles=3, taggedFiles=1, outOfScopeFiles=1, excludedFiles=1',
      );
      expect(logs).toContain(
        'Generated source family=@graphql-codegen/cli resolvedFiles=2 taggedFiles=1 outOfScopeFiles=0 excludedFiles=1',
      );
      expect(logs).toContain(
        'DEBUG Generated source family=@graphql-codegen/cli excluded sample=src/excluded/blocked.ts',
      );
      expect(logs).toContain(
        'DEBUG Generated source family=@openapitools/openapi-generator-cli outOfScope sample=outside/api/index.ts',
      );
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('ignores declaration-only default-excluded generated families in observability', async ({
    mock,
  }) => {
    const baseDir = await createTempBaseDir();
    const declarationFile = joinPaths(baseDir, 'src', 'generated', 'operations.d.ts');
    console.log = mock.fn(console.log);

    try {
      await writeFixtureFile(
        joinPaths(baseDir, 'package.json'),
        JSON.stringify(
          {
            devDependencies: {
              '@graphql-codegen/cli': '1.0.0',
            },
            scripts: {
              graphql: 'graphql-codegen --config ./codegen.yml',
            },
          },
          null,
          2,
        ),
      );
      await writeFixtureFile(
        joinPaths(baseDir, 'codegen.yml'),
        `generates:
  ./src/generated/operations.d.ts:
    plugins:
      - typescript
`,
      );
      await writeFixtureFile(declarationFile, 'export type Operation = string;\n');

      await initFileStores(
        createConfiguration({
          baseDir,
          sources: ['src'],
        }),
      );

      expect(sourceFileStore.getFiles()[declarationFile]).toBeUndefined();
      expect(generatedSourceStore.getFamily(declarationFile)).toBeUndefined();
      expect(generatedSourceStore.getObservabilityTelemetry()).toEqual({
        familyCount: 0,
        resolvedFileCount: 0,
        taggedFileCount: 0,
        outOfScopeFileCount: 0,
        excludedFileCount: 0,
        families: [],
      });

      const logs = (console.log as Mock<typeof console.log>).mock.calls.map(
        call => call.arguments[0],
      );
      expect(logs).toContain(
        'Generated source observability: families=0, resolvedFiles=0, taggedFiles=0, outOfScopeFiles=0, excludedFiles=0',
      );
      expect(logs).toContain(
        'DEBUG Generated source family=@graphql-codegen/cli ignored for observability because all resolved outputs are declaration files excluded by default **/*.d.ts: src/generated/operations.d.ts',
      );
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('derives OpenAPI Generator outputs when baseDir has a build parent segment', async () => {
    const baseDir = await createTempBaseDirInBuildParent();
    const outputFile = joinPaths(baseDir, 'src', 'api', 'index.ts');

    try {
      await writeFixtureFile(outputFile, 'export const api = true;\n');

      const packageJsons = createPackageJsonMap(baseDir, {
        devDependencies: {
          '@openapitools/openapi-generator-cli': '1.0.0',
        },
        scripts: {
          generate: 'openapi-generator-cli generate --output=./src/api',
        },
      });

      const derived = await deriveGeneratedSources(baseDir, packageJsons);

      expect(derived.familyByFile.get(outputFile)).toEqual('@openapitools/openapi-generator-cli');
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('derives proto-loader outputs from a literal output directory', async () => {
    const baseDir = joinPaths(fixtures, 'proto-loader');
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'src', 'generated', 'service.ts')),
    ).toEqual('proto-loader-gen-types');
    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'build', 'generated', 'ignored.ts')),
    ).toEqual('proto-loader-gen-types');
  });

  it('derives recursive proto-loader outputs rooted under dist while pruning nested build/cache folders', async () => {
    const baseDir = await createTempBaseDir();
    const outputFile = joinPaths(baseDir, 'dist', 'generated', 'nested', 'service.ts');
    const ignoredBuildFile = joinPaths(baseDir, 'dist', 'generated', 'build', 'ignored.ts');
    const ignoredCacheFile = joinPaths(baseDir, 'dist', 'generated', '.cache', 'ignored.ts');

    try {
      await writeFixtureFile(outputFile, 'export const service = true;\n');
      await writeFixtureFile(ignoredBuildFile, 'export const ignored = true;\n');
      await writeFixtureFile(ignoredCacheFile, 'export const ignored = true;\n');

      const packageJsons = createPackageJsonMap(baseDir, {
        scripts: {
          codegen: 'proto-loader-gen-types -O=./dist/generated ./proto/service.proto',
        },
      });

      const derived = await deriveGeneratedSources(baseDir, packageJsons);

      expect(derived.familyByFile.get(outputFile)).toEqual('proto-loader-gen-types');
      expect(derived.familyByFile.get(ignoredBuildFile)).toBeUndefined();
      expect(derived.familyByFile.get(ignoredCacheFile)).toBeUndefined();
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('clears generated-source cache when filesystem access is unavailable', async () => {
    const baseDir = joinPaths(fixtures, 'graphql-codegen-standard');
    await initFileStores(createConfiguration({ baseDir }));

    await initFileStores(createConfiguration({ baseDir, canAccessFileSystem: false }));

    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'src', 'generated', 'graphql.ts')),
    ).toBeUndefined();
  });

  it('recomputes generated-source metadata when filesystem access becomes available again', async () => {
    const baseDir = joinPaths(fixtures, 'graphql-codegen-standard');

    await initFileStores(createConfiguration({ baseDir, canAccessFileSystem: false }));
    await initFileStores(createConfiguration({ baseDir }));

    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'src', 'generated', 'graphql.ts')),
    ).toEqual('@graphql-codegen/cli');
  });

  it('clears generated-source cache when pnpm workspace manifests are updated', async () => {
    const baseDir = await createTempBaseDir();
    const outputPath = joinPaths(baseDir, 'src', 'generated', 'graphql.ts');

    try {
      await writeFixtureFile(
        join(baseDir, 'package.json'),
        JSON.stringify(
          {
            name: 'catalog-peer-dependency-fixture',
            peerDependencies: {
              '@graphql-codegen/cli': 'catalog:',
            },
          },
          null,
          2,
        ),
      );
      await writeFixtureFile(
        join(baseDir, 'pnpm-workspace.yaml'),
        `catalog:
  "@graphql-codegen/cli": "^5.0.0"
`,
      );
      await writeFixtureFile(
        join(baseDir, 'codegen.yml'),
        `generates:
  ./src/generated/graphql.ts:
    plugins:
      - typescript
`,
      );
      await writeFixtureFile(outputPath, 'export const generated = true;\n');

      let configuration = createConfiguration({ baseDir });
      await initFileStores(configuration);

      expect(generatedSourceStore.getFamily(outputPath)).toEqual('@graphql-codegen/cli');

      configuration = createConfiguration({
        baseDir,
        fsEvents: { [join(baseDir, 'pnpm-workspace.yaml')]: 'MODIFIED' },
      });
      generatedSourceStore.dirtyCachesIfNeeded(configuration);

      expect(generatedSourceStore.getFamily(outputPath)).toBeUndefined();
      expect(await generatedSourceStore.isInitialized(configuration)).toBe(false);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('recomputes generated-source matches when the request file set changes', async () => {
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

    expect(generatedSourceStore.getFamily(firstGeneratedFile)).toEqual('@graphql-codegen/cli');
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

    await initFileStores(configuration, secondInputFiles);

    expect(generatedSourceStore.getFamily(firstGeneratedFile)).toBeUndefined();
    expect(generatedSourceStore.getFamily(secondGeneratedFile)).toEqual('@graphql-codegen/cli');
  });

  it('records the current configuration when post-processing exits early', async () => {
    const baseDir = joinPaths(fixtures, 'graphql-codegen-standard');
    const configuration = createConfiguration({ baseDir, canAccessFileSystem: false });

    await generatedSourceStore.postProcess(configuration);

    expect(await generatedSourceStore.isInitialized(configuration)).toBe(true);
  });

  it('ignores malformed GraphQL config parse errors', async () => {
    const baseDir = await createTempBaseDir();

    try {
      for (const [filename, configContents] of [
        ['codegen.json', '{ invalid json'],
        ['codegen.yml', 'generates: ['],
      ]) {
        const configPath = joinPaths(baseDir, filename);
        await writeFile(configPath, configContents);

        const packageJsons = createPackageJsonMap(baseDir, {
          devDependencies: {
            '@graphql-codegen/cli': '1.0.0',
          },
          scripts: {
            codegen: `graphql-codegen --config ${filename}`,
          },
        });

        const derived = await deriveGeneratedSources(baseDir, packageJsons);

        expect([...derived.familyByFile.keys()]).toEqual([]);
      }
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it(
    'ignores unreadable generated output directories',
    { skip: process.platform === 'win32' },
    async () => {
      const baseDir = await createTempBaseDir();
      const outputDir = joinPaths(baseDir, 'src', 'generated');

      try {
        await mkdir(outputDir, { recursive: true });
        await chmod(outputDir, 0o000);

        const packageJsons = createPackageJsonMap(baseDir, {
          devDependencies: {
            '@openapitools/openapi-generator-cli': '1.0.0',
          },
          scripts: {
            generate: 'openapi-generator-cli generate -o src/generated',
          },
        });

        const derived = await deriveGeneratedSources(baseDir, packageJsons);

        expect([...derived.familyByFile.keys()]).toEqual([]);
        expect(derived.outputDirectories.has(outputDir)).toBe(true);
      } finally {
        await chmod(outputDir, 0o755).catch(() => undefined);
        await rm(baseDir, { recursive: true, force: true });
      }
    },
  );
});
