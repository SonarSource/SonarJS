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
import type { GeneratedSourceDetector } from '../../../src/jsts/rules/helpers/generated-sources/contracts.js';
import {
  hasToolEvidence,
  resolveConfigPaths,
  resolveGeneratedOutputsFromLiteralPaths,
  type ResolvedGeneratedOutputs,
} from '../../../src/jsts/rules/helpers/generated-sources/detector-api.js';
import {
  deriveGeneratedSources,
  extractFlagValues,
} from '../../../src/jsts/rules/helpers/generated-sources/derive.js';
import {
  GENERATED_SOURCE_DETECTORS,
  GENERATED_SOURCE_TASK_INVOCATION_PROVIDERS,
  collectGeneratedSourceTaskInvocations,
  getGeneratedSourceWatchedFilenames,
} from '../../../src/jsts/rules/helpers/generated-sources/index.js';
import {
  addFamilyFiles,
  createDerivedGeneratedSources,
  isLiteralPathToken,
} from '../../../src/jsts/rules/helpers/generated-sources/shared.js';
import {
  taskInvocationInvokesCommand,
  type TaskInvocation,
} from '../../../src/jsts/rules/helpers/generated-sources/task-invocations.js';
import { createAnalyzableFiles, type AnalyzableFiles } from '../../../src/projectAnalysis.js';
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

function createObservedInputFiles(filePaths: NormalizedAbsolutePath[]) {
  const analyzableFiles = createAnalyzableFiles();
  for (const filePath of filePaths) {
    analyzableFiles[filePath] = {
      filePath,
      fileContent: '',
      fileType: 'MAIN',
      fileStatus: 'SAME',
    };
  }

  let ownKeysCalls = 0;
  const observedInputFiles = new Proxy(analyzableFiles, {
    ownKeys(target) {
      ownKeysCalls++;
      return Reflect.ownKeys(target);
    },
  }) as AnalyzableFiles;

  return {
    ownKeysCalls: () => ownKeysCalls,
    observedInputFiles,
  };
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
    expect(getGeneratedSourceWatchedFilenames()).toEqual([]);
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

  it('filters explicit generated-source families, reuses stable request keys, and resets on discovery-config changes', async () => {
    let configuration = createConfiguration({
      baseDir: normalizeToAbsolutePath('/generated-sources-fixture'),
    });
    const includedFile = joinPaths(configuration.baseDir, 'src', 'generated', 'graphql.ts');
    const excludedFile = joinPaths(configuration.baseDir, 'src', 'generated', 'graphql-extra.ts');
    const state = generatedSourceStore as unknown as {
      derivedFamilyByFile: Map<NormalizedAbsolutePath, string>;
    };
    const { ownKeysCalls, observedInputFiles } = createObservedInputFiles([includedFile]);

    generatedSourceStore.setup(configuration);
    state.derivedFamilyByFile = new Map([
      [includedFile, 'graphql-codegen'],
      [excludedFile, 'graphql-codegen'],
    ]);

    await generatedSourceStore.isInitialized(configuration, observedInputFiles);
    expect(generatedSourceStore.getFamily(includedFile)).toEqual('graphql-codegen');
    expect(generatedSourceStore.getFamily(excludedFile)).toBeUndefined();

    await generatedSourceStore.isInitialized(configuration, observedInputFiles);
    expect(ownKeysCalls()).toEqual(1);

    configuration = createConfiguration({
      baseDir: configuration.baseDir,
      jsTsExclusions: ['**/dist/**'],
    });
    expect(await generatedSourceStore.isInitialized(configuration, observedInputFiles)).toBe(false);
    expect(generatedSourceStore.getFamily(includedFile)).toBeUndefined();
  });

  it('keeps all derived generated-source families in filesystem mode and invalidates on relevant file events', async () => {
    let configuration = createConfiguration({
      baseDir: normalizeToAbsolutePath('/generated-sources-all-files'),
    });
    const generatedFile = joinPaths(configuration.baseDir, 'src', 'generated', 'graphql.ts');
    const state = generatedSourceStore as unknown as {
      derivedFamilyByFile: Map<NormalizedAbsolutePath, string>;
    };

    generatedSourceStore.setup(configuration);
    state.derivedFamilyByFile = new Map([[generatedFile, 'graphql-codegen']]);

    await generatedSourceStore.isInitialized(configuration);
    expect(generatedSourceStore.getFamily(generatedFile)).toEqual('graphql-codegen');

    configuration = createConfiguration({
      baseDir: configuration.baseDir,
      fsEvents: [generatedFile],
    });
    expect(await generatedSourceStore.isInitialized(configuration)).toBe(false);
  });

  it('invalidates the generated-source store on detector watched filenames', async () => {
    const registeredDetectors = GENERATED_SOURCE_DETECTORS as GeneratedSourceDetector[];
    const originalDetectorCount = registeredDetectors.length;
    const baseDir = normalizeToAbsolutePath('/generated-sources-watched-filename');

    registeredDetectors.push({
      family: 'graphql-codegen',
      watchedFilenames: ['Codegen.yml'],
      async detect() {
        return createDerivedGeneratedSources();
      },
    });

    try {
      expect(getGeneratedSourceWatchedFilenames()).toEqual(['codegen.yml']);

      let configuration = createConfiguration({ baseDir });
      generatedSourceStore.setup(configuration);
      expect(await generatedSourceStore.isInitialized(configuration)).toBe(true);

      configuration = createConfiguration({
        baseDir,
        fsEvents: [joinPaths(baseDir, 'codegen.yml')],
      });
      expect(await generatedSourceStore.isInitialized(configuration)).toBe(false);
    } finally {
      registeredDetectors.splice(originalDetectorCount);
    }
  });

  it('exercises the detector foundation helpers through realistic task/config/output flows', async () => {
    const baseDir = await createTempBaseDir();
    const packageDir = joinPaths(baseDir, 'packages', 'app');
    const configPath = joinPaths(packageDir, 'codegen.yml');
    const outputDirectory = joinPaths(packageDir, 'src', 'generated');
    const outputFile = joinPaths(outputDirectory, 'graphql.ts');
    const nestedOutputFile = joinPaths(outputDirectory, 'nested', 'types.ts');
    const ignoredBuildOutput = joinPaths(outputDirectory, 'dist', 'ignored.ts');
    const taskInvocations: TaskInvocation[] = [
      {
        source: 'package-json-script',
        taskName: 'codegen',
        commandLine: 'npx graphql-codegen --config ./codegen.yml',
        command: 'graphql-codegen',
        args: ['--config', './codegen.yml'],
      },
    ];

    try {
      await writeFixtureFile(configPath, 'schema: schema.graphql\n');
      await writeFixtureFile(outputFile, 'export const output = true;\n');
      await writeFixtureFile(nestedOutputFile, 'export const nested = true;\n');
      await writeFixtureFile(ignoredBuildOutput, 'export const ignored = true;\n');

      expect(
        hasToolEvidence({
          getDependencies: () => new Map([['@graphql-codegen/cli', '5.0.0']]),
          taskInvocations: [],
          dependencyName: '@graphql-codegen/cli',
          matchesTaskInvocation: invocation =>
            taskInvocationInvokesCommand(invocation, 'graphql-codegen'),
        }),
      ).toBe(true);
      expect(taskInvocationInvokesCommand(taskInvocations[0], 'graphql-codegen')).toBe(true);

      const declaredConfigPaths = await resolveConfigPaths({
        baseDir,
        packageDir,
        taskInvocations,
        matchesTaskInvocation: invocation =>
          taskInvocationInvokesCommand(invocation, 'graphql-codegen'),
        flags: ['--config'],
        fallbackBasenames: ['fallback-codegen.yml'],
      });
      expect([...declaredConfigPaths]).toEqual([configPath]);

      const fallbackConfigPaths = await resolveConfigPaths({
        baseDir,
        packageDir,
        taskInvocations: [],
        matchesTaskInvocation: invocation =>
          taskInvocationInvokesCommand(invocation, 'graphql-codegen'),
        flags: ['--config'],
        fallbackBasenames: ['codegen.yml'],
      });
      expect([...fallbackConfigPaths]).toEqual([configPath]);

      expect(isLiteralPathToken('./src/generated')).toBe(true);
      expect(isLiteralPathToken('$(pwd)/generated')).toBe(false);

      const resolvedOutputs: ResolvedGeneratedOutputs =
        await resolveGeneratedOutputsFromLiteralPaths(
          baseDir,
          packageDir,
          ['./src/generated/graphql.ts', './src/generated', '../../../outside.ts'],
          true,
        );
      expect([...resolvedOutputs.filePaths]).toEqual([outputFile, nestedOutputFile]);
      expect([...resolvedOutputs.outputDirectories]).toEqual([outputDirectory]);
      expect([...resolvedOutputs.watchedOutputPaths]).toEqual([outputFile, outputDirectory]);

      const derived = createDerivedGeneratedSources();
      addFamilyFiles('graphql-codegen', [nestedOutputFile, outputFile], derived);
      expect([...derived.familyByFile.entries()]).toEqual([
        [outputFile, 'graphql-codegen'],
        [nestedOutputFile, 'graphql-codegen'],
      ]);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });

  it('merges detector output and falls back to raw package dependencies for synthetic manifests', async () => {
    const baseDir = await createTempBaseDir();
    const packageDir = joinPaths(baseDir, 'packages', 'fixture');
    const configPath = joinPaths(packageDir, 'codegen.yml');
    const outputDirectory = joinPaths(packageDir, 'src', 'generated');
    const outputFile = joinPaths(outputDirectory, 'graphql.ts');
    const registeredDetectors = GENERATED_SOURCE_DETECTORS as GeneratedSourceDetector[];
    const originalDetectorCount = registeredDetectors.length;

    registeredDetectors.push({
      family: 'graphql-codegen',
      async detect({ getDependencies, taskInvocations }) {
        expect(getDependencies().get('@graphql-codegen/cli')).toEqual('5.0.0');
        expect(taskInvocations).toEqual([
          {
            source: 'package-json-script',
            taskName: 'codegen',
            commandLine: 'graphql-codegen --config ./codegen.yml',
            command: 'graphql-codegen',
            args: ['--config', './codegen.yml'],
          },
        ]);

        const derived = createDerivedGeneratedSources();
        addFamilyFiles('graphql-codegen', [outputFile], derived);
        derived.configPaths.add(configPath);
        derived.watchedOutputPaths.add(outputDirectory);
        return derived;
      },
    });

    try {
      const derived = await deriveGeneratedSources(
        baseDir,
        createPackageJsonMap(packageDir, {
          devDependencies: {
            '@graphql-codegen/cli': '5.0.0',
          },
          scripts: {
            codegen: 'graphql-codegen --config ./codegen.yml',
          },
        }),
      );

      expect([...derived.familyByFile.entries()]).toEqual([[outputFile, 'graphql-codegen']]);
      expect([...derived.configPaths]).toEqual([configPath]);
      expect([...derived.watchedOutputPaths]).toEqual([outputDirectory]);
    } finally {
      registeredDetectors.splice(originalDetectorCount);
      await rm(baseDir, { recursive: true, force: true });
    }
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

  it('skips package metadata traversal when no detector is registered', async () => {
    const packageJsons = {
      *[Symbol.iterator](): IterableIterator<[NormalizedAbsolutePath, File]> {
        throw new Error('package.json metadata should not be read without detectors');
      },
    } as ReadonlyMap<NormalizedAbsolutePath, File>;

    const derived = await deriveGeneratedSources(
      normalizeToAbsolutePath('/generated-sources-no-detectors'),
      packageJsons,
    );

    expect(derived.familyByFile).toEqual(new Map());
    expect(derived.configPaths).toEqual(new Set());
    expect(derived.watchedOutputPaths).toEqual(new Set());
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
