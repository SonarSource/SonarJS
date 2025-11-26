/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */

import { describe, it, beforeEach, afterEach, type Mock, mock } from 'node:test';
import { expect } from 'expect';
import { join } from 'node:path/posix';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { toUnixPath } from '../../src/rules/helpers/index.js';
import { analyzeProject } from '../../src/analysis/projectAnalysis/analyzeProject.js';
import {
  sourceFileStore,
  tsConfigStore,
} from '../../src/analysis/projectAnalysis/file-stores/index.js';
import { setGlobalConfiguration } from '../../../shared/src/helpers/configuration.js';
import type { RuleConfig } from '../../src/linter/config/rule-config.js';
import type { JsTsFiles } from '../../src/analysis/projectAnalysis/projectAnalysis.js';
import { getProgramCacheManager } from '../../src/program/cache/programCache.js';
import { clearProgramOptionsCache } from '../../src/program/cache/programOptionsCache.js';

const rules: RuleConfig[] = [
  {
    key: 'S1116',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'ts',
    analysisModes: ['DEFAULT'],
  },
];

describe('SonarLint tsconfig change detection', () => {
  let tempDir: string;
  let filePath: string;
  let tsconfigPath: string;

  beforeEach(async () => {
    // Create temp directory
    tempDir = toUnixPath(await mkdtemp(join(tmpdir(), 'sonarlint-test-')));
    filePath = join(tempDir, 'file.ts');
    tsconfigPath = join(tempDir, 'tsconfig.json');

    // Clear all caches
    tsConfigStore.clearCache();
    sourceFileStore.clearCache();
    getProgramCacheManager().clear();
    clearProgramOptionsCache();
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should use default options after tsconfig.json no longer includes the file', async () => {
    // Step 1: Create tsconfig.json that includes file.ts
    const initialTsconfig = {
      compilerOptions: {
        target: 'ES2020',
        strict: true,
      },
      files: ['file.ts'],
    };
    await writeFile(tsconfigPath, JSON.stringify(initialTsconfig, null, 2));
    await writeFile(filePath, 'const x: number = 1;');

    // Step 2: First analysis - should use the tsconfig
    console.log = mock.fn(console.log);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;

    const files: JsTsFiles = {
      [filePath]: {
        filePath,
        fileType: 'MAIN',
        fileContent: 'const x: number = 1;',
      },
    };

    setGlobalConfiguration({ baseDir: tempDir, sonarlint: true });

    const result1 = await analyzeProject({
      rules,
      files,
      configuration: {
        baseDir: tempDir,
        sonarlint: true,
      },
    });

    expect(result1.files[filePath]).toBeDefined();

    // Verify it used the tsconfig
    const usedTsconfigLog = consoleLogMock.calls.find(call =>
      (call.arguments[0] as string)?.includes(`Using tsconfig ${tsconfigPath}`),
    );
    expect(usedTsconfigLog).toBeDefined();

    // Step 3: Modify tsconfig.json to remove file.ts and add a non-existing file
    const modifiedTsconfig = {
      compilerOptions: {
        target: 'ES2020',
        strict: true,
      },
      files: ['non-existing-file.ts'],
    };
    await writeFile(tsconfigPath, JSON.stringify(modifiedTsconfig, null, 2));

    // Step 4: Set fsEvents to trigger cache invalidation
    // Reset mocks
    consoleLogMock.calls.length = 0;

    // Set fsEvents indicating tsconfig.json was modified
    setGlobalConfiguration({
      baseDir: tempDir,
      sonarlint: true,
      fsEvents: {
        [tsconfigPath]: 'MODIFIED',
      },
    });

    // Step 5: Second analysis - should use default options since no tsconfig matches
    const result2 = await analyzeProject({
      rules,
      files,
      configuration: {
        baseDir: tempDir,
        sonarlint: true,
        fsEvents: {
          [tsconfigPath]: 'MODIFIED',
        },
      },
    });

    expect(result2.files[filePath]).toBeDefined();

    // Verify it fell back to default options
    const usedDefaultLog = consoleLogMock.calls.find(call =>
      (call.arguments[0] as string)?.includes('No tsconfig found for files, using default options'),
    );
    expect(usedDefaultLog).toBeDefined();
  });

  it('should clear cache when tsconfig.json is deleted', async () => {
    // Step 1: Create tsconfig.json that includes file.ts
    const initialTsconfig = {
      compilerOptions: {
        target: 'ES2020',
      },
      files: ['file.ts'],
    };
    await writeFile(tsconfigPath, JSON.stringify(initialTsconfig, null, 2));
    await writeFile(filePath, 'const x: number = 1;');

    // Step 2: First analysis
    console.log = mock.fn(console.log);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;

    const files: JsTsFiles = {
      [filePath]: {
        filePath,
        fileType: 'MAIN',
        fileContent: 'const x: number = 1;',
      },
    };

    setGlobalConfiguration({ baseDir: tempDir, sonarlint: true });

    await analyzeProject({
      rules,
      files,
      configuration: {
        baseDir: tempDir,
        sonarlint: true,
      },
    });

    // Verify it used the tsconfig
    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes(`Using tsconfig ${tsconfigPath}`),
      ),
    ).toBe(true);

    // Step 3: Delete tsconfig.json
    await rm(tsconfigPath);

    // Step 4: Set fsEvents to trigger cache invalidation
    consoleLogMock.calls.length = 0;

    // Step 5: Second analysis - should use default options
    await analyzeProject({
      rules,
      files,
      configuration: {
        baseDir: tempDir,
        sonarlint: true,
        fsEvents: {
          [tsconfigPath]: 'DELETED',
        },
      },
    });

    // Verify it fell back to default options
    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes(
          'No tsconfig found for files, using default options',
        ),
      ),
    ).toBe(true);
  });

  it('should pick up new tsconfig when file is moved to a different folder', async () => {
    // Create two directories with their own tsconfigs
    const dir1 = join(tempDir, 'dir1');
    const dir2 = join(tempDir, 'dir2');
    await mkdir(dir1);
    await mkdir(dir2);

    const tsconfig1 = join(dir1, 'tsconfig.json');
    const tsconfig2 = join(dir2, 'tsconfig.json');
    const file1 = join(dir1, 'file.ts');
    const file2 = join(dir2, 'file.ts');

    // tsconfig1 includes file.ts
    await writeFile(
      tsconfig1,
      JSON.stringify({
        compilerOptions: { target: 'ES2015' },
        files: ['file.ts'],
      }),
    );
    await writeFile(file1, 'const x: number = 1;');

    // tsconfig2 also includes file.ts
    await writeFile(
      tsconfig2,
      JSON.stringify({
        compilerOptions: { target: 'ES2020' },
        files: ['file.ts'],
      }),
    );
    await writeFile(file2, 'const y: number = 2;');

    console.log = mock.fn(console.log);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;

    // Analyze file in dir1
    setGlobalConfiguration({ baseDir: tempDir, sonarlint: true });

    await analyzeProject({
      rules,
      files: {
        [file1]: {
          filePath: file1,
          fileType: 'MAIN',
          fileContent: 'const x: number = 1;',
        },
      },
      configuration: {
        baseDir: tempDir,
        sonarlint: true,
      },
    });

    // Should use tsconfig from dir1 (longer path = more specific)
    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes(`Using tsconfig ${tsconfig1}`),
      ),
    ).toBe(true);

    // Now analyze file in dir2
    consoleLogMock.calls.length = 0;

    await analyzeProject({
      rules,
      files: {
        [file2]: {
          filePath: file2,
          fileType: 'MAIN',
          fileContent: 'const y: number = 2;',
        },
      },
      configuration: {
        baseDir: tempDir,
        sonarlint: true,
      },
    });

    // Should use tsconfig from dir2
    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes(`Using tsconfig ${tsconfig2}`),
      ),
    ).toBe(true);
  });

  it('should recreate program when source file content changes but tsconfig stays the same', async () => {
    // Create tsconfig.json
    const tsconfig = {
      compilerOptions: {
        target: 'ES2020',
        strict: true,
      },
      files: ['file.ts'],
    };
    await writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    await writeFile(filePath, 'const x: number = 1;');

    console.log = mock.fn(console.log);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;

    const initialContent = 'const x: number = 1;';
    const modifiedContent = 'const x: number = 2; const y: string = "hello";';

    // Step 1: First analysis - should be a cache miss
    setGlobalConfiguration({ baseDir: tempDir, sonarlint: true });

    await analyzeProject({
      rules,
      files: {
        [filePath]: {
          filePath,
          fileType: 'MAIN',
          fileContent: initialContent,
        },
      },
      configuration: {
        baseDir: tempDir,
        sonarlint: true,
      },
    });

    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes('Cache MISS: Creating new program'),
      ),
    ).toBe(true);

    // Step 2: Second analysis with same content - should reuse program
    consoleLogMock.calls.length = 0;

    await analyzeProject({
      rules,
      files: {
        [filePath]: {
          filePath,
          fileType: 'MAIN',
          fileContent: initialContent,
        },
      },
      configuration: {
        baseDir: tempDir,
        sonarlint: true,
      },
    });

    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes('Cache HIT: Reusing program'),
      ),
    ).toBe(true);

    // Step 3: Third analysis with modified content - should recreate program
    consoleLogMock.calls.length = 0;

    await analyzeProject({
      rules,
      files: {
        [filePath]: {
          filePath,
          fileType: 'MAIN',
          fileContent: modifiedContent,
        },
      },
      configuration: {
        baseDir: tempDir,
        sonarlint: true,
        fsEvents: {
          [filePath]: 'MODIFIED',
        },
      },
    });

    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes('Cache HIT: Recreating program with changes'),
      ),
    ).toBe(true);
  });
});
