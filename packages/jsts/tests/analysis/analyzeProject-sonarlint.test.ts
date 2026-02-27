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
import { normalizePath, normalizeToAbsolutePath } from '../../src/rules/helpers/index.js';
import {
  analyzeProject,
  cancelAnalysis,
} from '../../src/analysis/projectAnalysis/analyzeProject.js';
import { ErrorCode } from '../../../shared/src/errors/error.js';
import {
  sourceFileStore,
  tsConfigStore,
} from '../../src/analysis/projectAnalysis/file-stores/index.js';
import type { RuleConfig } from '../../src/linter/config/rule-config.js';
import { getProgramCacheManager } from '../../src/program/cache/programCache.js';
import { clearProgramOptionsCache } from '../../src/program/cache/programOptionsCache.js';
import { sanitizeProjectAnalysisInput } from '../../../shared/src/helpers/sanitize.js';

// Helper to initialize file stores for tests - wraps sanitizeProjectAnalysisInput
async function initForTest(configOptions: object, rawFiles: object) {
  const { configuration } = await sanitizeProjectAnalysisInput({
    configuration: configOptions,
    files: rawFiles,
  });
  return configuration;
}

const fixtures = normalizePath(join(import.meta.dirname, 'fixtures-sonarlint'));

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
    tempDir = normalizePath(await mkdtemp(join(tmpdir(), 'sonarlint-test-')));
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

    let configuration = await initForTest(
      { baseDir: tempDir, sonarlint: true },
      { [filePath]: { filePath, fileContent: 'const x: number = 1;' } },
    );

    const result1 = await analyzeProject({ rules, bundles: [] }, configuration);

    expect(result1.files[normalizeToAbsolutePath(filePath)]).toBeDefined();

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

    // Step 5: Second analysis - should use default options since no tsconfig matches
    configuration = await initForTest(
      { baseDir: tempDir, sonarlint: true, fsEvents: { [tsconfigPath]: 'MODIFIED' } },
      { [filePath]: { filePath, fileContent: 'const x: number = 1;' } },
    );

    const result2 = await analyzeProject({ rules, bundles: [] }, configuration);

    expect(result2.files[normalizeToAbsolutePath(filePath)]).toBeDefined();

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

    let configuration = await initForTest(
      { baseDir: tempDir, sonarlint: true },
      { [filePath]: { filePath, fileContent: 'const x: number = 1;' } },
    );

    await analyzeProject({ rules, bundles: [] }, configuration);

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
    configuration = await initForTest(
      { baseDir: tempDir, sonarlint: true, fsEvents: { [tsconfigPath]: 'DELETED' } },
      { [filePath]: { filePath, fileContent: 'const x: number = 1;' } },
    );

    await analyzeProject({ rules, bundles: [] }, configuration);

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
    let configuration = await initForTest(
      { baseDir: tempDir, sonarlint: true },
      { [file1]: { filePath: file1, fileContent: 'const x: number = 1;' } },
    );

    await analyzeProject({ rules, bundles: [] }, configuration);

    // Should use tsconfig from dir1 (longer path = more specific)
    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes(`Using tsconfig ${tsconfig1}`),
      ),
    ).toBe(true);

    // Now analyze file in dir2
    consoleLogMock.calls.length = 0;

    configuration = await initForTest(
      { baseDir: tempDir, sonarlint: true },
      { [file2]: { filePath: file2, fileContent: 'const y: number = 2;' } },
    );

    await analyzeProject({ rules, bundles: [] }, configuration);

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
    let configuration = await initForTest(
      { baseDir: tempDir, sonarlint: true },
      { [filePath]: { filePath, fileContent: initialContent } },
    );

    await analyzeProject({ rules, bundles: [] }, configuration);

    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes('Cache MISS: Creating new program'),
      ),
    ).toBe(true);

    // Step 2: Second analysis with same content - should reuse program
    consoleLogMock.calls.length = 0;

    configuration = await initForTest(
      { baseDir: tempDir, sonarlint: true },
      { [filePath]: { filePath, fileContent: initialContent } },
    );

    await analyzeProject({ rules, bundles: [] }, configuration);

    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes('Cache HIT: Reusing program'),
      ),
    ).toBe(true);

    // Step 3: Third analysis with modified content - should recreate program
    consoleLogMock.calls.length = 0;

    configuration = await initForTest(
      { baseDir: tempDir, sonarlint: true, fsEvents: { [filePath]: 'MODIFIED' } },
      { [filePath]: { filePath, fileContent: modifiedContent } },
    );

    await analyzeProject({ rules, bundles: [] }, configuration);

    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes('Cache HIT: Recreating program with changes'),
      ),
    ).toBe(true);
  });

  it('should handle parsing errors with watch program', async () => {
    // Create a file with a parsing error (incomplete function)
    await writeFile(filePath, 'function f() {\n  return;\n');

    const configuration = await initForTest(
      { baseDir: tempDir, sonarlint: true },
      { [filePath]: { filePath, fileContent: 'function f() {\n  return;\n' } },
    );

    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    // Should have a parsing error (exact message may vary between parsers)
    const fileResult = result.files[normalizeToAbsolutePath(filePath)] as {
      parsingError?: { code: ErrorCode; line?: number };
    };
    expect('parsingError' in fileResult).toBe(true);
    if ('parsingError' in fileResult) {
      expect(fileResult.parsingError!.code).toBe(ErrorCode.Parsing);
      expect(fileResult.parsingError!.line).toBe(3);
    }
  });

  it('should cancel analysis', async () => {
    await writeFile(filePath, 'const x: number = 1;');

    const configuration = await initForTest(
      { baseDir: tempDir, sonarlint: true },
      { [filePath]: { filePath, fileContent: 'const x: number = 1;' } },
    );

    const analysisPromise = analyzeProject({ rules, bundles: [] }, configuration, message => {
      expect(message).toEqual({ messageType: 'cancelled' });
    });
    cancelAnalysis();
    await analysisPromise;
  });

  it('should use default options when tsconfig has no matching files', async () => {
    // Create tsconfig.json that only includes .js files
    const tsconfig = {
      include: ['*.js'],
    };
    await writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    await writeFile(filePath, 'const x: number = 1;');

    console.log = mock.fn(console.log);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;

    const configuration = await initForTest(
      { baseDir: tempDir, sonarlint: true },
      { [filePath]: { filePath, fileContent: 'const x: number = 1;' } },
    );

    await analyzeProject({ rules, bundles: [] }, configuration);

    // Should fall back to default options since tsconfig doesn't include .ts files
    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.startsWith(
          'No tsconfig found for files, using default options',
        ),
      ),
    ).toBe(true);
  });

  it('should try multiple tsconfigs before finding the matching one', async () => {
    // Create multiple nested directories with tsconfigs
    const subDir1 = join(tempDir, 'packages/app');
    const subDir2 = join(tempDir, 'packages/lib');
    await mkdir(subDir1, { recursive: true });
    await mkdir(subDir2, { recursive: true });

    // Root tsconfig that doesn't include our file
    const rootTsconfig = join(tempDir, 'tsconfig.json');
    await writeFile(
      rootTsconfig,
      JSON.stringify({
        compilerOptions: { target: 'ES2020' },
        files: ['non-existing.ts'],
      }),
    );

    // Packages/app tsconfig that doesn't include our file
    const appTsconfig = join(subDir1, 'tsconfig.json');
    await writeFile(
      appTsconfig,
      JSON.stringify({
        compilerOptions: { target: 'ES2020' },
        files: ['app.ts'],
      }),
    );
    await writeFile(join(subDir1, 'app.ts'), 'const app = 1;');

    // Packages/lib tsconfig that DOES include our file
    const libTsconfig = join(subDir2, 'tsconfig.json');
    await writeFile(
      libTsconfig,
      JSON.stringify({
        compilerOptions: { target: 'ES2020', strict: true },
        files: ['lib.ts'],
      }),
    );
    const libFile = join(subDir2, 'lib.ts');
    await writeFile(libFile, 'const lib: number = 1;');

    console.log = mock.fn(console.log);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;

    const configuration = await initForTest(
      { baseDir: tempDir, sonarlint: true },
      { [libFile]: { filePath: libFile, fileContent: 'const lib: number = 1;' } },
    );

    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    // File should be analyzed
    expect(result.files[normalizeToAbsolutePath(libFile)]).toBeDefined();

    // Should have found the correct tsconfig (the lib one)
    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes(`Using tsconfig ${libTsconfig}`),
      ),
    ).toBe(true);
  });

  it('should stream results via incrementalResults callback', async () => {
    await writeFile(filePath, 'const x: number = 1;;');

    const configuration = await initForTest(
      { baseDir: tempDir, sonarlint: true },
      { [filePath]: { filePath, fileContent: 'const x: number = 1;;' } },
    );

    const receivedMessages: unknown[] = [];
    await analyzeProject({ rules, bundles: [] }, configuration, message => {
      receivedMessages.push(message);
    });

    // Should receive incremental results (messageType: 'fileResult')
    expect(receivedMessages.length).toBeGreaterThan(0);
    expect(
      receivedMessages.some(m => (m as { messageType: string }).messageType === 'fileResult'),
    ).toBe(true);

    // When using incrementalResultsChannel, results go to callback not to final result
    // Verify file result was sent via channel
    const fileResult = receivedMessages.find(
      m => (m as { messageType: string; filename?: string }).filename === filePath,
    );
    expect(fileResult).toBeDefined();
  });

  it('should skip TypeScript program creation for orphan files when createTSProgramForOrphanFiles is false', async () => {
    await writeFile(filePath, 'const x: number = 1;');

    console.log = mock.fn(console.log);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;

    const configuration = await initForTest(
      { baseDir: tempDir, sonarlint: true, createTSProgramForOrphanFiles: false },
      { [filePath]: { filePath, fileContent: 'const x: number = 1;' } },
    );

    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    // Should log the skipping message
    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes(
          'Skipping TypeScript program creation for orphan file',
        ),
      ),
    ).toBe(true);

    // The file should still be analyzed (without type info, via analyzeWithoutProgram)
    expect(result.files[normalizeToAbsolutePath(filePath)]).toBeDefined();

    // Should NOT log "using default options" since we skip the fallback program creation
    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes('using default options'),
      ),
    ).toBe(false);
  });

  it('should create TypeScript program for orphan files when createTSProgramForOrphanFiles is true', async () => {
    await writeFile(filePath, 'const x: number = 1;');

    console.log = mock.fn(console.log);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;

    const configuration = await initForTest(
      { baseDir: tempDir, sonarlint: true, createTSProgramForOrphanFiles: true },
      { [filePath]: { filePath, fileContent: 'const x: number = 1;' } },
    );

    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    // Should log the default options message (fallback program creation runs)
    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes('using default options'),
      ),
    ).toBe(true);

    // Should NOT log the skipping message
    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes(
          'Skipping TypeScript program creation for orphan file',
        ),
      ),
    ).toBe(false);

    // File should be analyzed
    expect(result.files[normalizeToAbsolutePath(filePath)]).toBeDefined();
  });

  it('should skip all program creation when disableTypeChecking is true', async () => {
    await writeFile(filePath, 'const x: number = 1;');

    console.log = mock.fn(console.log);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;

    const configuration = await initForTest(
      { baseDir: tempDir, sonarlint: true, disableTypeChecking: true },
      { [filePath]: { filePath, fileContent: 'const x: number = 1;' } },
    );

    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    // Should log the disableTypeChecking message
    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes(
          'Type checking is disabled (sonar.javascript.disableTypeChecking=true)',
        ),
      ),
    ).toBe(true);

    // The file should still be analyzed (without type info)
    expect(result.files[normalizeToAbsolutePath(filePath)]).toBeDefined();
  });

  it('should handle error from tsconfig in sonarlint context', async () => {
    // Clear caches to ensure fresh state
    tsConfigStore.clearCache();
    sourceFileStore.clearCache();
    getProgramCacheManager().clear();
    clearProgramOptionsCache();

    // The error message is logged via console.error, not console.log
    console.error = mock.fn(console.error);
    const consoleErrorMock = (console.error as Mock<typeof console.error>).mock;
    const testBaseDir = join(fixtures, 'tsconfig-no-files');
    const tsFile = join(testBaseDir, 'file.ts');

    const configuration = await initForTest(
      { baseDir: testBaseDir, sonarlint: true },
      { [tsFile]: { filePath: tsFile } },
    );

    await analyzeProject({ rules, bundles: [] }, configuration);

    const expectedPrefix = `Failed to parse tsconfig ${join(testBaseDir, 'tsconfig.json')}`;
    const errorMessages = consoleErrorMock.calls.map(call => call.arguments[0] as string);
    expect(errorMessages.some(msg => msg?.startsWith(expectedPrefix))).toBe(true);
  });
});
