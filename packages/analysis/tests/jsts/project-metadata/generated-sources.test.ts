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
  GENERATED_SOURCE_WATCHED_FILENAMES,
  SUPPORTED_GENERATED_SOURCE_FAMILIES,
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
    expect(GENERATED_SOURCE_WATCHED_FILENAMES).toHaveLength(5);
    expect(GENERATED_SOURCE_WATCHED_FILENAMES).toEqual(
      expect.arrayContaining([
        'codegen.js',
        'codegen.json',
        'codegen.ts',
        'codegen.yaml',
        'codegen.yml',
      ]),
    );
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

  it('derives OpenAPI Generator outputs from a literal output directory', async () => {
    const baseDir = joinPaths(fixtures, 'openapi');
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    expect(generatedSourceStore.getFamily(joinPaths(baseDir, 'src', 'api', 'index.ts'))).toEqual(
      '@openapitools/openapi-generator-cli',
    );
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

  it('derives OpenAPI Generator outputs rooted under dist while pruning nested cache folders', async () => {
    const baseDir = await createTempBaseDir();
    const outputFile = joinPaths(baseDir, 'dist', 'api', 'index.ts');
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

  it('derives proto-loader outputs from a bin target flag using equals syntax', async () => {
    const baseDir = await createTempBaseDir();
    const outputFile = joinPaths(baseDir, 'src', 'generated', 'service.ts');

    try {
      await writeFixtureFile(outputFile, 'export const service = true;\n');

      const packageJsons = createPackageJsonMap(baseDir, {
        scripts: {
          codegen: 'node ./bin/proto-loader-gen-types.js -O=./src/generated ./proto/service.proto',
        },
        bin: {
          'proto-loader-gen-types': './bin/proto-loader-gen-types.js',
        },
      });

      const derived = await deriveGeneratedSources(baseDir, packageJsons);

      expect(derived.familyByFile.get(outputFile)).toEqual('proto-loader-gen-types');
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
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

  it('records the current configuration when post-processing exits early', async () => {
    const baseDir = joinPaths(fixtures, 'graphql-codegen-standard');
    const configuration = createConfiguration({ baseDir, canAccessFileSystem: false });

    await generatedSourceStore.postProcess(configuration);

    expect(await generatedSourceStore.isInitialized(configuration)).toBe(true);
  });

  it('rethrows malformed GraphQL config parse errors', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, 'codegen.json');

    try {
      await writeFile(configPath, '{ invalid json');

      const packageJsons = createPackageJsonMap(baseDir, {
        devDependencies: {
          '@graphql-codegen/cli': '1.0.0',
        },
        scripts: {
          codegen: 'graphql-codegen --config codegen.json',
        },
      });

      await expect(deriveGeneratedSources(baseDir, packageJsons)).rejects.toThrow(SyntaxError);
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
