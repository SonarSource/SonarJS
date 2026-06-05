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
import { graphqlCodegenDetector } from '../../../src/jsts/rules/helpers/generated-sources/detectors/graphql-codegen.js';
import {
  GENERATED_SOURCE_DETECTORS,
  GENERATED_SOURCE_TASK_INVOCATION_PROVIDERS,
  collectGeneratedSourceTaskInvocations,
  getGeneratedSourceWatchedFilenames,
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
const GRAPHQL_CODEGEN_FAMILY = '@graphql-codegen/cli';
const OPENAPI_GENERATOR_FAMILY = '@openapitools/openapi-generator-cli';
const PROTO_LOADER_GEN_TYPES_FAMILY = 'proto-loader-gen-types';

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

async function writeOpenApiFilesManifest(outputDir: string, filePaths: string[]) {
  await writeFixtureFile(
    join(outputDir, '.openapi-generator', 'FILES'),
    `${filePaths.join('\n')}\n`,
  );
}

describe('generated sources project metadata', () => {
  beforeEach(() => {
    dependencyManifestStore.clearCache();
    generatedSourceStore.clearCache();
    sourceFileStore.clearCache();
  });

  it('registers the GraphQL, OpenAPI, and proto-loader detectors through the shared contract', () => {
    expect(GENERATED_SOURCE_DETECTORS.map(detector => detector.family)).toEqual([
      GRAPHQL_CODEGEN_FAMILY,
      OPENAPI_GENERATOR_FAMILY,
      PROTO_LOADER_GEN_TYPES_FAMILY,
    ]);
    expect(GENERATED_SOURCE_TASK_INVOCATION_PROVIDERS.map(provider => provider.kind)).toEqual([
      'package-json-scripts',
    ]);
    expect(getGeneratedSourceWatchedFilenames()).toEqual(
      expect.arrayContaining([
        '.graphqlrc',
        '.graphqlrc.cjs',
        '.graphqlrc.cts',
        '.graphqlrc.js',
        '.graphqlrc.json',
        '.graphqlrc.mjs',
        '.graphqlrc.mts',
        '.graphqlrc.ts',
        '.graphqlrc.yaml',
        '.graphqlrc.yml',
        '.graphqlconfig',
        '.graphqlconfig.json',
        '.graphqlconfig.yaml',
        '.graphqlconfig.yml',
        'codegen.config.cjs',
        'codegen.config.cts',
        'codegen.config.js',
        'codegen.config.mjs',
        'codegen.config.mts',
        'codegen.config.ts',
        'codegen.cts',
        'codegen.js',
        'codegen.json',
        'codegen.mts',
        'codegen.ts',
        'codegen.yaml',
        'codegen.yml',
        '.codegenrc.js',
        '.codegenrc.json',
        '.codegenrc.ts',
        '.codegenrc.yaml',
        '.codegenrc.yml',
        'graphql.config.cjs',
        'graphql.config.cts',
        'graphql.config.js',
        'graphql.config.json',
        'graphql.config.mjs',
        'graphql.config.mts',
        'graphql.config.ts',
        'graphql.config.yaml',
        'graphql.config.yml',
        'package.json',
      ]),
    );
    expect(getGeneratedSourceWatchedFilenames()).not.toEqual(
      expect.arrayContaining(['.graphqlrc.toml', 'graphql.config.toml']),
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
            openapi: 'npx openapi-generator-cli generate --output ./src/api',
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
          taskName: 'openapi',
          commandLine: 'npx openapi-generator-cli generate --output ./src/api',
          command: 'openapi-generator-cli',
          args: ['generate', '--output', './src/api'],
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

  it('derives GraphQL outputs from explicit codegen.cts and codegen.mts flags', async () => {
    const cases = [
      {
        configContents: `const config = {
  generates: {
    './src/generated/sdk.ts': {
      plugins: ['typescript'],
    },
  },
};

export = config;
`,
        configFilename: 'codegen.cts',
      },
      {
        configContents: `const config = {
  generates: {
    './src/generated/sdk.ts': {
      plugins: ['typescript'],
    },
  },
};

export default config;
`,
        configFilename: 'codegen.mts',
      },
    ] satisfies ReadonlyArray<{
      configContents: string;
      configFilename: string;
    }>;

    for (const testCase of cases) {
      const baseDir = await createTempBaseDir();
      const configPath = joinPaths(baseDir, testCase.configFilename);
      const outputPath = joinPaths(baseDir, 'src', 'generated', 'sdk.ts');

      try {
        await writeFixtureFile(configPath, testCase.configContents);
        await writeFixtureFile(outputPath, 'export const sdk = true;\n');

        const derived = await deriveGeneratedSources(
          baseDir,
          createPackageJsonMap(baseDir, {
            devDependencies: {
              [GRAPHQL_CODEGEN_FAMILY]: '1.0.0',
            },
            scripts: {
              codegen: `graphql-codegen --config ./${testCase.configFilename}`,
            },
          }),
        );

        expect(derived.configPaths).toEqual(new Set([configPath]));
        expect(derived.familyByFile.get(outputPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
      } finally {
        await rm(baseDir, { recursive: true, force: true });
      }
    }
  });

  it('derives GraphQL outputs from an implicit codegen.config.js fallback file', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, 'codegen.config.js');
    const outputPath = joinPaths(baseDir, 'src', 'generated', 'sdk.ts');

    try {
      await writeFixtureFile(
        configPath,
        `module.exports = {
  generates: {
    './src/generated/sdk.ts': {
      plugins: ['typescript'],
    },
  },
};
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
            codegen: 'graphql-codegen',
          },
        }),
      );

      expect(derived.configPaths).toEqual(new Set([configPath]));
      expect(derived.familyByFile.get(outputPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
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
    expect(
      extractFlagValues('openapi-generator-cli generate -o ./src/api --output=./src/other', [
        '-o',
        '--output',
      ]),
    ).toEqual(['./src/api', './src/other']);
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

  it('does not tag handwritten files for near-operation-file directory outputs', async () => {
    const baseDir = await createTempBaseDir();
    const handWrittenPath = joinPaths(baseDir, 'src', 'App.tsx');
    const generatedPath = joinPaths(baseDir, 'src', 'App.generated.tsx');

    try {
      await writeFixtureFile(
        join(baseDir, 'codegen.ts'),
        `const config = {
  generates: {
    './src/': {
      preset: 'near-operation-file',
      presetConfig: {
        extension: '.generated.tsx',
      },
    },
  },
};

export default config;
`,
      );
      await writeFixtureFile(handWrittenPath, 'export const app = true;\n');
      await writeFixtureFile(generatedPath, 'export const generated = true;\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          devDependencies: {
            [GRAPHQL_CODEGEN_FAMILY]: '1.0.0',
          },
        }),
      );

      expect(derived.familyByFile.get(handWrittenPath)).toBeUndefined();
      expect(derived.familyByFile.get(generatedPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
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

  it('does not derive nested package GraphQL outputs from workspace-root-relative fallback paths', async () => {
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
        join(packageDir, 'codegen.yml'),
        `generates:
  libs/shared/cms/src/__generated__/graphql.ts:
    plugins:
      - typescript
`,
      );
      await writeFixtureFile(outputPath, 'export const generated = true;\n');

      await initFileStores(createConfiguration({ baseDir }));

      expect(generatedSourceStore.getFamily(outputPath)).toBeUndefined();
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('resolves explicit GraphQL config outputs from the package directory, not the config directory', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, 'config', 'custom-codegen.ts');
    const outputPath = joinPaths(baseDir, 'src', 'generated', 'sdk.ts');
    const configRelativePath = joinPaths(baseDir, 'config', 'src', 'generated', 'sdk.ts');

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
      await writeFixtureFile(configRelativePath, 'export const stray = true;\n');

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
      expect(derived.familyByFile.get(configRelativePath)).toBeUndefined();
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

  it('derives GraphQL outputs from an explicit short config flag', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, 'config', 'custom-codegen.ts');
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
          scripts: {
            codegen: 'graphql-codegen -c ./config/custom-codegen.ts',
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
          scripts: {
            codegen: 'graphql-codegen --config ./codegen.config.cts',
          },
        }),
      );

      expect(derived.familyByFile.get(outputPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('ignores circular identifier references while resolving GraphQL config objects', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, 'codegen.ts');
    const outputPath = joinPaths(baseDir, 'src', 'generated', 'sdk.ts');

    try {
      await writeFixtureFile(
        configPath,
        `const circularA = circularB;
const circularB = circularA;
const config = {
  generates: {
    './src/generated/sdk.ts': {
      presetConfig: circularA,
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
            codegen: 'graphql-codegen --config ./codegen.ts',
          },
        }),
      );

      expect(derived.familyByFile.get(outputPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('ignores GraphQL fallback configs without task or dependency evidence', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, 'codegen.yml');
    const outputPath = joinPaths(baseDir, 'src', 'generated', 'sdk.ts');

    try {
      await writeFixtureFile(
        configPath,
        `generates:
  ./src/generated/sdk.ts:
    plugins:
      - typescript
`,
      );
      await writeFixtureFile(outputPath, 'export const sdk = true;\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          scripts: {
            lint: 'eslint .',
          },
        }),
      );

      expect(derived.configPaths).toEqual(new Set());
      expect(derived.familyByFile.get(outputPath)).toBeUndefined();
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('skips GraphQL fallback config probing without task or dependency evidence', async ({
    mock,
  }) => {
    const baseDir = await createTempBaseDir();
    const packageJson = {
      name: 'graphql-no-evidence-fixture',
      scripts: {
        lint: 'eslint .',
      },
    };

    try {
      await writeFixtureFile(join(baseDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      mock.method(JSON, 'parse');
      const jsonParseMock = (JSON.parse as Mock<typeof JSON.parse>).mock;

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, packageJson),
      );

      expect(derived.configPaths).toEqual(new Set());
      expect(derived.familyByFile).toEqual(new Map());
      expect(jsonParseMock.calls).toHaveLength(1);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('supports additional GraphQL source config syntaxes and watched directories', async () => {
    const baseDir = await createTempBaseDir();
    const mtsConfigPath = joinPaths(baseDir, 'codegen.config.mts');
    const jsConfigPath = joinPaths(baseDir, 'codegen.js');
    const generatedNearOperationPath = joinPaths(baseDir, 'src', 'App.generated.ts');
    const handWrittenPath = joinPaths(baseDir, 'src', 'App.ts');
    const asExpressionPath = joinPaths(baseDir, 'src', 'generated', 'as-expression.ts');
    const callExpressionPath = joinPaths(baseDir, 'src', 'generated', 'call-expression.ts');
    const satisfiesExpressionPath = joinPaths(
      baseDir,
      'src',
      'generated',
      'satisfies-expression.ts',
    );
    const typeAssertionPath = joinPaths(baseDir, 'src', 'generated', 'type-asserted.ts');
    const watchedOutputDirectory = joinPaths(baseDir, 'src', 'runtime');

    try {
      await writeFixtureFile(
        mtsConfigPath,
        `const dynamicKey = './src/generated/ignored-computed.ts';
const config = ({
  1: true,
  generates: {
    [dynamicKey]: { plugins: ['typescript'] },
    '$INVALID_OUTPUT': { plugins: ['typescript'] },
    './src/': {
      preset: 'near-operation-file',
    },
    './src/generated/as-expression.ts': ({ plugins: ['typescript'] } as const),
    './src/generated/call-expression.ts': buildTarget(),
    './src/generated/satisfies-expression.ts': ({
      plugins: ['typescript'],
    } satisfies Record<string, unknown>),
    './src/generated/type-asserted.ts': <Record<string, unknown>>{
      plugins: ['typescript'],
    },
  },
});

function buildTarget() {
  return { plugins: ['typescript'] };
}

export default config;
`,
      );
      await writeFixtureFile(
        jsConfigPath,
        `module.exports = {
  generates: {
    './src/runtime/': {
      plugins: ['typescript'],
    },
  },
};
`,
      );
      await writeFixtureFile(generatedNearOperationPath, 'export const generated = true;\n');
      await writeFixtureFile(handWrittenPath, 'export const handwritten = true;\n');
      await writeFixtureFile(asExpressionPath, 'export const asExpression = true;\n');
      await writeFixtureFile(callExpressionPath, 'export const callExpression = true;\n');
      await writeFixtureFile(satisfiesExpressionPath, 'export const satisfiesExpression = true;\n');
      await writeFixtureFile(typeAssertionPath, 'export const typeAssertion = true;\n');
      await writeFixtureFile(join(watchedOutputDirectory, 'placeholder.txt'), 'placeholder\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          devDependencies: {
            [GRAPHQL_CODEGEN_FAMILY]: '1.0.0',
          },
          scripts: {
            codegenJs: 'graphql-codegen --config ./codegen.js',
            codegenMts: 'graphql-codegen --config ./codegen.config.mts',
          },
        }),
      );

      expect(derived.configPaths).toEqual(new Set([jsConfigPath, mtsConfigPath]));
      expect(derived.familyByFile.get(generatedNearOperationPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
      expect(derived.familyByFile.get(handWrittenPath)).toBeUndefined();
      expect(derived.familyByFile.get(asExpressionPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
      expect(derived.familyByFile.get(callExpressionPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
      expect(derived.familyByFile.get(satisfiesExpressionPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
      expect(derived.familyByFile.get(typeAssertionPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
      expect(
        derived.familyByFile.get(joinPaths(baseDir, 'src', 'generated', 'ignored-computed.ts')),
      ).toBeUndefined();
      expect(derived.watchedOutputPaths.has(watchedOutputDirectory)).toBe(true);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('handles unsupported GraphQL config structures defensively', async () => {
    const cases = [
      {
        configFilename: 'codegen.json',
        configContents: JSON.stringify(
          {
            generates: {
              $INVALID_OUTPUT: {
                plugins: ['typescript'],
              },
              './src/generated/sdk.ts': {
                plugins: ['typescript'],
              },
            },
          },
          null,
          2,
        ),
        expectedOutputDetected: true,
        script: 'graphql-codegen --config ./codegen.json',
      },
      {
        configFilename: 'codegen.yml',
        configContents: 'generates: true\n',
        expectedOutputDetected: false,
        script: 'graphql-codegen --config ./codegen.yml',
      },
      {
        configFilename: 'codegen.json',
        configContents: JSON.stringify(
          {
            generates: ['./src/generated/sdk.ts'],
          },
          null,
          2,
        ),
        expectedOutputDetected: false,
        expectNoWatchedOutputs: true,
        script: 'graphql-codegen --config ./codegen.json',
      },
      {
        configFilename: 'codegen.ts',
        configContents: `function createConfig() {
  return {
    generates: {
      './src/generated/sdk.ts': {
        plugins: ['typescript'],
      },
    },
  };
}

export default createConfig();
`,
        expectedOutputDetected: false,
        script: 'graphql-codegen --config ./codegen.ts',
      },
      {
        configFilename: 'codegen.config.ts',
        configContents: `export default {
  generates: 0,
};
`,
        expectedOutputDetected: false,
        script: 'graphql-codegen --config ./codegen.config.ts',
      },
      {
        configFilename: 'codegen.config.cjs',
        configContents: `module.exports = {
  generates: {
    '../../../outside/': {
      plugins: ['typescript'],
    },
  },
};
`,
        expectedOutputDetected: false,
        expectNoWatchedOutputs: true,
        script: 'graphql-codegen --config ./codegen.config.cjs',
      },
    ] satisfies ReadonlyArray<{
      configFilename: string;
      configContents: string;
      expectedOutputDetected: boolean;
      expectNoWatchedOutputs?: boolean;
      script: string;
    }>;

    for (const {
      configFilename,
      configContents,
      expectedOutputDetected,
      expectNoWatchedOutputs = false,
      script,
    } of cases) {
      const baseDir = await createTempBaseDir();
      const configPath = joinPaths(baseDir, configFilename);
      const outputPath = joinPaths(baseDir, 'src', 'generated', 'sdk.ts');

      try {
        await writeFixtureFile(configPath, configContents);
        await writeFixtureFile(outputPath, 'export const sdk = true;\n');

        const derived = await deriveGeneratedSources(
          baseDir,
          createPackageJsonMap(baseDir, {
            devDependencies: {
              [GRAPHQL_CODEGEN_FAMILY]: '1.0.0',
            },
            scripts: {
              codegen: script,
            },
          }),
        );

        expect(derived.familyByFile.get(outputPath) !== undefined).toBe(expectedOutputDetected);
        if (expectNoWatchedOutputs) {
          expect(derived.watchedOutputPaths).toEqual(new Set());
        }
      } finally {
        await rm(baseDir, { recursive: true, force: true });
      }
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
    './src/generated/sdk.ts': {
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
    const configPath = joinPaths(baseDir, 'codegen.ts');
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

  it('derives OpenAPI outputs from .openapi-generator/FILES manifests', async () => {
    const baseDir = joinPaths(fixtures, 'openapi');
    await initFileStores(createConfiguration({ baseDir }));

    expect(generatedSourceStore.getFamily(joinPaths(baseDir, 'src', 'api', 'index.ts'))).toEqual(
      OPENAPI_GENERATOR_FAMILY,
    );
    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'src', 'api', 'models', 'pet.ts')),
    ).toEqual(OPENAPI_GENERATOR_FAMILY);
    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'build', 'api', 'ignored.ts')),
    ).toEqual(OPENAPI_GENERATOR_FAMILY);
    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'src', 'api', 'manual.ts')),
    ).toBeUndefined();
  });

  it('derives OpenAPI outputs from an output flag using equals syntax', async () => {
    const baseDir = await createTempBaseDir();
    const outputPath = joinPaths(baseDir, 'src', 'api', 'index.ts');

    try {
      await writeFixtureFile(outputPath, 'export const api = true;\n');
      await writeOpenApiFilesManifest(join(baseDir, 'src', 'api'), ['index.ts']);

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          devDependencies: {
            [OPENAPI_GENERATOR_FAMILY]: '1.0.0',
          },
          scripts: {
            generate:
              'openapi-generator-cli generate --generator-name=typescript-axios --output=./src/api',
          },
        }),
      );

      expect(derived.familyByFile.get(outputPath)).toEqual(OPENAPI_GENERATOR_FAMILY);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('derives OpenAPI outputs from an npx-wrapped command', async () => {
    const baseDir = await createTempBaseDir();
    const outputPath = joinPaths(baseDir, 'src', 'api', 'index.ts');

    try {
      await writeFixtureFile(outputPath, 'export const api = true;\n');
      await writeOpenApiFilesManifest(join(baseDir, 'src', 'api'), ['index.ts']);

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          devDependencies: {
            [OPENAPI_GENERATOR_FAMILY]: '1.0.0',
          },
          scripts: {
            generate: 'npx openapi-generator-cli generate -g typescript-axios --output ./src/api',
          },
        }),
      );

      expect(derived.familyByFile.get(outputPath)).toEqual(OPENAPI_GENERATOR_FAMILY);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('does not derive OpenAPI outputs without an .openapi-generator/FILES manifest', async () => {
    const baseDir = await createTempBaseDir();
    const outputPath = joinPaths(baseDir, 'src', 'api', 'index.ts');

    try {
      await writeFixtureFile(outputPath, 'export const api = true;\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          devDependencies: {
            [OPENAPI_GENERATOR_FAMILY]: '1.0.0',
          },
          scripts: {
            generate: 'openapi-generator-cli generate -g typescript-axios --output ./src/api',
          },
        }),
      );

      expect(derived.familyByFile.get(outputPath)).toBeUndefined();
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('does not tag handwritten files outside the OpenAPI FILES manifest for mixed output roots', async () => {
    const baseDir = await createTempBaseDir();
    const generatedPath = joinPaths(baseDir, 'src', 'generated.ts');
    const handwrittenPath = joinPaths(baseDir, 'src', 'handwritten.ts');

    try {
      await writeFixtureFile(generatedPath, 'export const generated = true;\n');
      await writeFixtureFile(handwrittenPath, 'export const handwritten = true;\n');
      await writeOpenApiFilesManifest(baseDir, ['src/generated.ts']);

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          devDependencies: {
            [OPENAPI_GENERATOR_FAMILY]: '1.0.0',
          },
          scripts: {
            generate: 'openapi-generator-cli generate -g typescript-axios -o .',
          },
        }),
      );

      expect(derived.familyByFile.get(generatedPath)).toEqual(OPENAPI_GENERATOR_FAMILY);
      expect(derived.familyByFile.get(handwrittenPath)).toBeUndefined();
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('refreshes generated-source metadata when a declared OpenAPI output file is created later', async () => {
    const baseDir = await createTempBaseDir();
    const outputPath = joinPaths(baseDir, 'src', 'api', 'index.ts');

    try {
      await writeFixtureFile(
        join(baseDir, 'package.json'),
        JSON.stringify(
          {
            devDependencies: {
              [OPENAPI_GENERATOR_FAMILY]: '1.0.0',
            },
            scripts: {
              generate: 'openapi-generator-cli generate -g typescript-axios --output ./src/api',
            },
          },
          null,
          2,
        ),
      );

      await initFileStores(createConfiguration({ baseDir }));
      expect(generatedSourceStore.getFamily(outputPath)).toBeUndefined();

      await writeFixtureFile(outputPath, 'export const api = true;\n');
      await writeOpenApiFilesManifest(join(baseDir, 'src', 'api'), ['index.ts']);

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

      expect(generatedSourceStore.getFamily(outputPath)).toEqual(OPENAPI_GENERATOR_FAMILY);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('does not derive OpenAPI outputs when openapi-generator-cli is only echoed', async () => {
    const baseDir = await createTempBaseDir();
    const outputPath = joinPaths(baseDir, 'src', 'api', 'index.ts');

    try {
      await writeFixtureFile(outputPath, 'export const api = true;\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          devDependencies: {
            [OPENAPI_GENERATOR_FAMILY]: '1.0.0',
          },
          scripts: {
            generate: 'echo openapi-generator-cli generate --output=./src/api',
          },
        }),
      );

      expect(derived.familyByFile.get(outputPath)).toBeUndefined();
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('does not derive OpenAPI outputs without an explicit JS/TS generator name', async () => {
    const baseDir = await createTempBaseDir();
    const outputPath = joinPaths(baseDir, 'src', 'api', 'index.ts');

    try {
      await writeFixtureFile(outputPath, 'export const api = true;\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          devDependencies: {
            [OPENAPI_GENERATOR_FAMILY]: '1.0.0',
          },
          scripts: {
            generate: 'openapi-generator-cli generate --output=./src/api',
          },
        }),
      );

      expect(derived.familyByFile.get(outputPath)).toBeUndefined();
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('does not derive OpenAPI outputs for non-JS generators', async () => {
    const baseDir = await createTempBaseDir();
    const outputPath = joinPaths(baseDir, 'src', 'index.ts');

    try {
      await writeFixtureFile(outputPath, 'export const handwritten = true;\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          devDependencies: {
            [OPENAPI_GENERATOR_FAMILY]: '1.0.0',
          },
          scripts: {
            generate: 'openapi-generator-cli generate -g java -o .',
          },
        }),
      );

      expect(derived.familyByFile.get(outputPath)).toBeUndefined();
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

  it('derives GraphQL outputs from an explicit package-local codegen.config.ts flag', async () => {
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
          scripts: {
            codegen: 'graphql-codegen --config ./codegen.config.ts',
          },
        }),
      );

      expect(derived.configPaths).toEqual(new Set([configPath]));
      expect(derived.familyByFile.get(outputPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('derives GraphQL outputs from explicit GraphQL Config paths', async () => {
    const cases = [
      {
        configContents: JSON.stringify(
          {
            name: 'graphql-explicit-package-json-fixture',
            scripts: {
              codegen: 'graphql-codegen --config ./package.json',
            },
            devDependencies: {
              [GRAPHQL_CODEGEN_FAMILY]: '1.0.0',
            },
            graphql: {
              extensions: {
                codegen: {
                  generates: {
                    './src/gql/': {
                      preset: 'client',
                    },
                  },
                },
              },
            },
          },
          null,
          2,
        ),
        configFilename: 'package.json',
        outputPath: 'src/gql/graphql.ts',
      },
      {
        configContents: `projects:
  server:
    extensions:
      codegen:
        generates:
          src/contra-api/__generated__/types.ts:
            plugins:
              - typescript
`,
        configFilename: '.graphqlrc',
        outputPath: 'src/contra-api/__generated__/types.ts',
      },
      {
        configContents: `const config = {
  extensions: {
    codegen: {
      generates: {
        './src/generated/graphql.ts': {
          plugins: ['typescript'],
        },
      },
    },
  },
};

export default config;
`,
        configFilename: 'graphql.config.ts',
        outputPath: 'src/generated/graphql.ts',
      },
    ] satisfies ReadonlyArray<{
      configContents: string;
      configFilename: string;
      outputPath: string;
    }>;

    for (const testCase of cases) {
      const baseDir = await createTempBaseDir();
      const configPath = joinPaths(baseDir, testCase.configFilename);
      const outputPath = joinPaths(baseDir, testCase.outputPath);

      try {
        await writeFixtureFile(configPath, testCase.configContents);
        await writeFixtureFile(outputPath, 'export const generated = true;\n');

        const packageJson =
          testCase.configFilename === 'package.json'
            ? JSON.parse(testCase.configContents)
            : {
                scripts: {
                  codegen: `graphql-codegen --config ./${testCase.configFilename}`,
                },
                devDependencies: {
                  [GRAPHQL_CODEGEN_FAMILY]: '1.0.0',
                },
              };

        const derived = await deriveGeneratedSources(
          baseDir,
          createPackageJsonMap(baseDir, packageJson),
        );

        expect(derived.configPaths).toEqual(new Set([configPath]));
        expect(derived.familyByFile.get(outputPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
      } finally {
        await rm(baseDir, { recursive: true, force: true });
      }
    }
  });

  it('does not auto-discover a package-local codegen.config.ts without an explicit task invocation', async () => {
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

      expect(derived.configPaths).toEqual(new Set());
      expect(derived.familyByFile.get(outputPath)).toBeUndefined();
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('does not auto-discover package-local codegen.cts or codegen.mts without an explicit task invocation', async () => {
    const cases = [
      {
        configContents: `const config = {
  generates: {
    './src/generated/sdk.ts': {
      plugins: ['typescript'],
    },
  },
};

export = config;
`,
        configFilename: 'codegen.cts',
      },
      {
        configContents: `const config = {
  generates: {
    './src/generated/sdk.ts': {
      plugins: ['typescript'],
    },
  },
};

export default config;
`,
        configFilename: 'codegen.mts',
      },
    ] satisfies ReadonlyArray<{
      configContents: string;
      configFilename: string;
    }>;

    for (const testCase of cases) {
      const baseDir = await createTempBaseDir();
      const configPath = joinPaths(baseDir, testCase.configFilename);
      const outputPath = joinPaths(baseDir, 'src', 'generated', 'sdk.ts');

      try {
        await writeFixtureFile(configPath, testCase.configContents);
        await writeFixtureFile(outputPath, 'export const sdk = true;\n');

        const derived = await deriveGeneratedSources(
          baseDir,
          createPackageJsonMap(baseDir, {
            devDependencies: {
              [GRAPHQL_CODEGEN_FAMILY]: '1.0.0',
            },
            scripts: {
              codegen: 'graphql-codegen',
            },
          }),
        );

        expect(derived.configPaths).toEqual(new Set());
        expect(derived.familyByFile.get(outputPath)).toBeUndefined();
      } finally {
        await rm(baseDir, { recursive: true, force: true });
      }
    }
  });

  it('derives GraphQL outputs from a package-local .codegenrc.yml fallback file', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, '.codegenrc.yml');
    const outputPath = joinPaths(baseDir, 'src', 'generated', 'sdk.ts');

    try {
      await writeFixtureFile(
        configPath,
        `generates:
  ./src/generated/sdk.ts:
    plugins:
      - typescript
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

  it('derives YAML near-operation outputs from merged GraphQL config entries', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, 'codegen.yml');
    const outputPath = joinPaths(baseDir, 'src', 'query.gql.ts');

    try {
      await writeFixtureFile(
        configPath,
        `shared: &shared
  preset: near-operation-file
  presetConfig:
    extension: .gql.ts

generates:
  ./src/:
    <<: *shared
    plugins:
      - typescript
`,
      );
      await writeFixtureFile(outputPath, 'export const query = true;\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          devDependencies: {
            [GRAPHQL_CODEGEN_FAMILY]: '1.0.0',
          },
          scripts: {
            codegen: 'graphql-codegen',
          },
        }),
      );

      expect(derived.configPaths).toEqual(new Set([configPath]));
      expect(derived.familyByFile.get(outputPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('derives GraphQL outputs from a package-local .codegenrc.ts fallback file', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, '.codegenrc.ts');
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

  it('derives GraphQL outputs from package.json#codegen fallback config', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, 'package.json');
    const outputPath = joinPaths(baseDir, 'src', 'gql', 'graphql.ts');
    const packageJson = {
      name: 'graphql-package-config-fixture',
      scripts: {
        codegen: 'graphql-codegen',
      },
      devDependencies: {
        [GRAPHQL_CODEGEN_FAMILY]: '1.0.0',
      },
      codegen: {
        generates: {
          './src/gql/': {
            preset: 'client',
          },
        },
      },
    };

    try {
      await writeFixtureFile(configPath, JSON.stringify(packageJson, null, 2));
      await writeFixtureFile(outputPath, 'export const graphql = true;\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, packageJson),
      );

      expect(derived.configPaths).toEqual(new Set([configPath]));
      expect(derived.familyByFile.get(outputPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('derives GraphQL outputs from package.json#graphql.extensions.codegen fallback config', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, 'package.json');
    const outputPath = joinPaths(baseDir, 'src', 'gql', 'graphql.ts');
    const packageJson = {
      name: 'graphql-package-graphql-config-fixture',
      scripts: {
        codegen: 'graphql-codegen',
      },
      devDependencies: {
        [GRAPHQL_CODEGEN_FAMILY]: '1.0.0',
      },
      graphql: {
        extensions: {
          codegen: {
            generates: {
              './src/gql/': {
                preset: 'client',
              },
            },
          },
        },
      },
    };

    try {
      await writeFixtureFile(configPath, JSON.stringify(packageJson, null, 2));
      await writeFixtureFile(outputPath, 'export const graphql = true;\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, packageJson),
      );

      expect(derived.configPaths).toEqual(new Set([configPath]));
      expect(derived.familyByFile.get(outputPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('does not treat a plain package.json as GraphQL config evidence', async () => {
    const baseDir = await createTempBaseDir();
    let dependencyLookups = 0;

    try {
      await writeFixtureFile(
        joinPaths(baseDir, 'package.json'),
        JSON.stringify({ name: 'plain-package-json-fixture' }, null, 2),
      );

      const derived = await graphqlCodegenDetector.detect({
        baseDir,
        packageDir: baseDir,
        getDependencies: () => {
          dependencyLookups++;
          return new Map([[GRAPHQL_CODEGEN_FAMILY, '1.0.0']]);
        },
        taskInvocations: [],
        sourceFileMatcher: undefined,
      });

      expect(derived.configPaths).toEqual(new Set());
      expect(derived.familyByFile.size).toEqual(0);
      expect(dependencyLookups).toEqual(1);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('derives GraphQL outputs from a package-local .graphqlrc fallback file', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, '.graphqlrc');
    const outputPath = joinPaths(baseDir, 'src', 'contra-api', '__generated__', 'types.ts');

    try {
      await writeFixtureFile(
        configPath,
        `projects:
  app:
    extensions:
      codegen:
        generates:
          ../../packages/graphql-types/src/types.ts:
            plugins:
              - typescript
  server:
    extensions:
      codegen:
        generates:
          src/contra-api/__generated__/types.ts:
            plugins:
              - typescript
`,
      );
      await writeFixtureFile(outputPath, 'export const types = true;\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          scripts: {
            codegen: 'graphql-codegen',
          },
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

  it('derives GraphQL outputs from dotted .graphqlrc fallback variants', async () => {
    const cases = [
      {
        configContents: `projects:
  server:
    extensions:
      codegen:
        generates:
          src/contra-api/__generated__/types.ts:
            plugins:
              - typescript
`,
        configFilename: '.graphqlrc.yml',
      },
      {
        configContents: `projects:
  server:
    extensions:
      codegen:
        generates:
          src/contra-api/__generated__/types.ts:
            plugins:
              - typescript
`,
        configFilename: '.graphqlrc.yaml',
      },
      {
        configContents: JSON.stringify(
          {
            projects: {
              server: {
                extensions: {
                  codegen: {
                    generates: {
                      'src/contra-api/__generated__/types.ts': {
                        plugins: ['typescript'],
                      },
                    },
                  },
                },
              },
            },
          },
          null,
          2,
        ),
        configFilename: '.graphqlrc.json',
      },
      {
        configContents: `const config = {
  projects: {
    server: {
      extensions: {
        codegen: {
          generates: {
            'src/contra-api/__generated__/types.ts': {
              plugins: ['typescript'],
            },
          },
        },
      },
    },
  },
};

export default config;
`,
        configFilename: '.graphqlrc.ts',
      },
      {
        configContents: `module.exports = {
  projects: {
    server: {
      extensions: {
        codegen: {
          generates: {
            'src/contra-api/__generated__/types.ts': {
              plugins: ['typescript'],
            },
          },
        },
      },
    },
  },
};
`,
        configFilename: '.graphqlrc.cjs',
      },
      {
        configContents: `const config = {
  projects: {
    server: {
      extensions: {
        codegen: {
          generates: {
            'src/contra-api/__generated__/types.ts': {
              plugins: ['typescript'],
            },
          },
        },
      },
    },
  },
};

export = config;
`,
        configFilename: '.graphqlrc.cts',
      },
      {
        configContents: `export default {
  projects: {
    server: {
      extensions: {
        codegen: {
          generates: {
            'src/contra-api/__generated__/types.ts': {
              plugins: ['typescript'],
            },
          },
        },
      },
    },
  },
};
`,
        configFilename: '.graphqlrc.mjs',
      },
      {
        configContents: `export default {
  projects: {
    server: {
      extensions: {
        codegen: {
          generates: {
            'src/contra-api/__generated__/types.ts': {
              plugins: ['typescript'],
            },
          },
        },
      },
    },
  },
};
`,
        configFilename: '.graphqlrc.mts',
      },
    ] satisfies ReadonlyArray<{
      configContents: string;
      configFilename: string;
    }>;

    for (const testCase of cases) {
      const baseDir = await createTempBaseDir();
      const configPath = joinPaths(baseDir, testCase.configFilename);
      const outputPath = joinPaths(baseDir, 'src', 'contra-api', '__generated__', 'types.ts');

      try {
        await writeFixtureFile(configPath, testCase.configContents);
        await writeFixtureFile(outputPath, 'export const types = true;\n');

        const derived = await deriveGeneratedSources(
          baseDir,
          createPackageJsonMap(baseDir, {
            scripts: {
              codegen: 'graphql-codegen',
            },
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
    }
  });

  it('derives GraphQL outputs from legacy .graphqlconfig fallback variants', async () => {
    const cases = [
      {
        configContents: `projects:
  server:
    extensions:
      codegen:
        generates:
          src/contra-api/__generated__/types.ts:
            plugins:
              - typescript
`,
        configFilename: '.graphqlconfig',
      },
      {
        configContents: `projects:
  server:
    extensions:
      codegen:
        generates:
          src/contra-api/__generated__/types.ts:
            plugins:
              - typescript
`,
        configFilename: '.graphqlconfig.yml',
      },
    ] satisfies ReadonlyArray<{
      configContents: string;
      configFilename: string;
    }>;

    for (const testCase of cases) {
      const baseDir = await createTempBaseDir();
      const configPath = joinPaths(baseDir, testCase.configFilename);
      const outputPath = joinPaths(baseDir, 'src', 'contra-api', '__generated__', 'types.ts');

      try {
        await writeFixtureFile(configPath, testCase.configContents);
        await writeFixtureFile(outputPath, 'export const types = true;\n');

        const derived = await deriveGeneratedSources(
          baseDir,
          createPackageJsonMap(baseDir, {
            scripts: {
              codegen: 'graphql-codegen',
            },
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
    }
  });

  it('derives GraphQL outputs from a package-local graphql.config.ts fallback file', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, 'graphql.config.ts');
    const generatedFilePath = joinPaths(baseDir, 'src', 'generated', 'graphql.ts');
    const nearOperationGeneratedPath = joinPaths(baseDir, 'lib', 'user.generated.ts');
    const handWrittenPath = joinPaths(baseDir, 'lib', 'user.ts');

    try {
      await writeFixtureFile(
        configPath,
        `const config = {
  schema: 'schema.graphql',
  extensions: {
    codegen: {
      generates: {
        './src/generated/graphql.ts': {
          plugins: ['typescript'],
        },
        './lib/': {
          preset: 'near-operation-file-preset',
          presetConfig: {
            extension: '.generated.ts',
          },
        },
      },
    },
  },
};

export default config;
`,
      );
      await writeFixtureFile(generatedFilePath, 'export const generated = true;\n');
      await writeFixtureFile(nearOperationGeneratedPath, 'export const near = true;\n');
      await writeFixtureFile(handWrittenPath, 'export const handWritten = true;\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          scripts: {
            codegen: 'graphql-codegen',
          },
          devDependencies: {
            [GRAPHQL_CODEGEN_FAMILY]: '1.0.0',
          },
        }),
      );

      expect(derived.configPaths).toEqual(new Set([configPath]));
      expect(derived.familyByFile.get(generatedFilePath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
      expect(derived.familyByFile.get(nearOperationGeneratedPath)).toEqual(GRAPHQL_CODEGEN_FAMILY);
      expect(derived.familyByFile.get(handWrittenPath)).toBeUndefined();
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('does not derive GraphQL outputs from a package-local graphql.config.toml file', async () => {
    const baseDir = await createTempBaseDir();
    const configPath = joinPaths(baseDir, 'graphql.config.toml');
    const outputPath = joinPaths(baseDir, 'src', 'contra-api', '__generated__', 'types.ts');

    try {
      await writeFixtureFile(
        configPath,
        `[projects.app.extensions.codegen.generates."../../packages/graphql-types/src/types.ts"]
plugins = [
  "typescript",
]

[projects.server.extensions.codegen.generates."src/contra-api/__generated__/types.ts"]
plugins = [
  "typescript",
]
`,
      );
      await writeFixtureFile(outputPath, 'export const types = true;\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          scripts: {
            codegen: 'graphql-codegen',
          },
          devDependencies: {
            [GRAPHQL_CODEGEN_FAMILY]: '1.0.0',
          },
        }),
      );

      expect(derived.configPaths).toEqual(new Set());
      expect(derived.familyByFile.get(outputPath)).toBeUndefined();
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('derives proto-loader outputs from the standard fixture', async () => {
    const baseDir = joinPaths(fixtures, 'proto-loader');
    await initFileStores(createConfiguration({ baseDir }));

    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'src', 'generated', 'service.ts')),
    ).toEqual(PROTO_LOADER_GEN_TYPES_FAMILY);
    expect(
      generatedSourceStore.getFamily(joinPaths(baseDir, 'build', 'generated', 'ignored.ts')),
    ).toEqual(PROTO_LOADER_GEN_TYPES_FAMILY);
  });

  it('derives recursive proto-loader outputs rooted under dist while pruning nested build/cache folders', async () => {
    const baseDir = await createTempBaseDir();
    const outputPath = joinPaths(baseDir, 'dist', 'generated', 'nested', 'service.ts');
    const ignoredBuildFile = joinPaths(baseDir, 'dist', 'generated', 'build', 'ignored.ts');
    const ignoredCacheFile = joinPaths(baseDir, 'dist', 'generated', '.cache', 'ignored.ts');

    try {
      await writeFixtureFile(outputPath, 'export const service = true;\n');
      await writeFixtureFile(ignoredBuildFile, 'export const ignored = true;\n');
      await writeFixtureFile(ignoredCacheFile, 'export const ignored = true;\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          scripts: {
            codegen: 'proto-loader-gen-types -O=./dist/generated ./proto/service.proto',
          },
        }),
      );

      expect(derived.familyByFile.get(outputPath)).toEqual(PROTO_LOADER_GEN_TYPES_FAMILY);
      expect(derived.familyByFile.get(ignoredBuildFile)).toBeUndefined();
      expect(derived.familyByFile.get(ignoredCacheFile)).toBeUndefined();
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('derives proto-loader outputs from generated-like directory names with separator variants', async () => {
    const cases = [
      {
        outputDirFlag: './src/generated-types',
        outputPathSegments: ['src', 'generated-types', 'service.ts'],
      },
      {
        outputDirFlag: './src/generated_types',
        outputPathSegments: ['src', 'generated_types', 'service.ts'],
      },
      {
        outputDirFlag: './src/types-generated',
        outputPathSegments: ['src', 'types-generated', 'service.ts'],
      },
      {
        outputDirFlag: './src/types_generated',
        outputPathSegments: ['src', 'types_generated', 'service.ts'],
      },
    ] satisfies ReadonlyArray<{
      outputDirFlag: string;
      outputPathSegments: readonly string[];
    }>;

    for (const testCase of cases) {
      const baseDir = await createTempBaseDir();
      const outputPath = joinPaths(baseDir, ...testCase.outputPathSegments);

      try {
        await writeFixtureFile(outputPath, 'export const service = true;\n');

        const derived = await deriveGeneratedSources(
          baseDir,
          createPackageJsonMap(baseDir, {
            scripts: {
              codegen: `proto-loader-gen-types -O=${testCase.outputDirFlag} ./proto/service.proto`,
            },
          }),
        );

        expect(derived.familyByFile.get(outputPath)).toEqual(PROTO_LOADER_GEN_TYPES_FAMILY);
      } finally {
        await rm(baseDir, { recursive: true, force: true });
      }
    }
  });

  it('derives proto-loader outputs from the --outDir long flag', async () => {
    const baseDir = await createTempBaseDir();
    const outputPath = joinPaths(baseDir, 'src', 'generated', 'service.ts');

    try {
      await writeFixtureFile(outputPath, 'export const service = true;\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          scripts: {
            codegen: 'proto-loader-gen-types --outDir=./src/generated ./proto/service.proto',
          },
        }),
      );

      expect(derived.familyByFile.get(outputPath)).toEqual(PROTO_LOADER_GEN_TYPES_FAMILY);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('does not derive proto-loader outputs from arbitrary directory names', async () => {
    const baseDir = await createTempBaseDir();
    const outputDirectory = joinPaths(baseDir, 'src', 'types');
    const outputPath = joinPaths(outputDirectory, 'service.ts');

    try {
      await writeFixtureFile(outputPath, 'export const service = true;\n');

      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(baseDir, {
          scripts: {
            codegen: 'proto-loader-gen-types -O=./src/types ./proto/service.proto',
          },
        }),
      );

      expect(derived.familyByFile.get(outputPath)).toBeUndefined();
      expect(derived.watchedOutputPaths).toEqual(new Set([outputDirectory]));
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

  it('reuses derived generated-source metadata when only exclusions change', async () => {
    const baseDir = joinPaths(fixtures, 'graphql-codegen-standard');
    const generatedFile = joinPaths(baseDir, 'src', 'generated', 'graphql.ts');

    await initFileStores(createConfiguration({ baseDir }));

    const generatedSourceStoreState = generatedSourceStore as unknown as {
      derivedFamilyByFile: Map<NormalizedAbsolutePath, string>;
      familyByFile: Map<NormalizedAbsolutePath, string>;
    };
    const initialDerivedFamilyByFile = generatedSourceStoreState.derivedFamilyByFile;
    const initialFamilyByFile = generatedSourceStoreState.familyByFile;

    expect(generatedSourceStore.getFamily(generatedFile)).toEqual(GRAPHQL_CODEGEN_FAMILY);

    await initFileStores(
      createConfiguration({
        baseDir,
        jsTsExclusions: ['**/src/generated/**'],
      }),
    );

    expect(generatedSourceStoreState.derivedFamilyByFile).toBe(initialDerivedFamilyByFile);
    expect(generatedSourceStoreState.familyByFile).not.toBe(initialFamilyByFile);
    expect(generatedSourceStore.getFamily(generatedFile)).toBeUndefined();
  });

  it('memoizes explicit request-file keys per analyzable-file set', async () => {
    const baseDir = joinPaths(fixtures, 'graphql-codegen-standard');
    const generatedFile = joinPaths(baseDir, 'src', 'generated', 'graphql.ts');
    const configuration = createConfiguration({ baseDir });
    const { files: inputFiles } = await sanitizeRawInputFiles(
      {
        [generatedFile]: {
          filePath: generatedFile,
          fileType: 'MAIN',
        },
      },
      configuration,
    );

    await initFileStores(configuration, inputFiles);

    const explicitRequestFilesKeys = (
      generatedSourceStore as unknown as {
        explicitRequestFilesKeys?: WeakMap<object, string>;
      }
    ).explicitRequestFilesKeys;
    expect(explicitRequestFilesKeys).toBeInstanceOf(WeakMap);

    const cachedKey = explicitRequestFilesKeys?.get(inputFiles);
    expect(cachedKey).toBeDefined();

    await generatedSourceStore.isInitialized(configuration, inputFiles);

    expect(explicitRequestFilesKeys?.get(inputFiles)).toEqual(cachedKey);
  });

  it('records the current configuration when post-processing exits early', async () => {
    const baseDir = joinPaths(fixtures, 'graphql-codegen-standard');
    const configuration = createConfiguration({ baseDir, canAccessFileSystem: false });

    await generatedSourceStore.postProcess(configuration);

    expect(await generatedSourceStore.isInitialized(configuration)).toBe(true);
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
