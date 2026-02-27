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

import { describe, it, beforeEach, type Mock, mock } from 'node:test';
import { expect } from 'expect';
import { join } from 'node:path/posix';
import { normalizePath, normalizeToAbsolutePath } from '../../src/rules/helpers/index.js';
import {
  analyzeProject,
  cancelAnalysis,
} from '../../src/analysis/projectAnalysis/analyzeProject.js';
import {
  sourceFileStore,
  tsConfigStore,
} from '../../src/analysis/projectAnalysis/file-stores/index.js';
import { ErrorCode } from '../../../shared/src/errors/error.js';
import ts from 'typescript';
import type { RuleConfig } from '../../src/linter/config/rule-config.js';
import type { RuleConfig as CssRuleConfig } from '../../../css/src/linter/config.js';
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

const fixtures = normalizePath(join(import.meta.dirname, 'fixtures-sonarqube'));

const rules: RuleConfig[] = [
  {
    key: 'S1116',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'ts',
    analysisModes: ['DEFAULT'],
  },
];

describe('SonarQube project analysis', () => {
  beforeEach(() => {
    // Clear all caches before each test
    tsConfigStore.clearCache();
    sourceFileStore.clearCache();
    getProgramCacheManager().clear();
    clearProgramOptionsCache();
  });

  it('should analyze files using tsconfig', async () => {
    const baseDir = join(fixtures, 'basic');
    const filePath = join(baseDir, 'main.ts');

    console.log = mock.fn(console.log);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;

    const configuration = await initForTest(
      { baseDir },
      { [filePath]: { filePath, fileType: 'MAIN' } },
    );

    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    const fileResult = result.files[normalizeToAbsolutePath(filePath)];
    expect(fileResult).toBeDefined();
    // Should find an issue from S1116 (empty statement - the extra semicolon)
    expect('issues' in fileResult! && fileResult!.issues.length).toBeGreaterThan(0);

    // Verify it created a TypeScript program
    expect(
      consoleLogMock.calls.some(call =>
        /Creating TypeScript\(\d+\.\d+\.\d+\) program/.test(call.arguments[0] as string),
      ),
    ).toBe(true);
  });

  it('should analyze files from referenced tsconfigs', async () => {
    const baseDir = join(fixtures, 'referenced');
    const mainFile = join(baseDir, 'main.ts');
    const helperFile = join(baseDir, 'libs/helper.ts');

    console.log = mock.fn(console.log);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;

    const configuration = await initForTest(
      { baseDir },
      {
        [mainFile]: { filePath: mainFile, fileType: 'MAIN' },
        [helperFile]: { filePath: helperFile, fileType: 'MAIN' },
      },
    );

    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    // Both files should be analyzed
    expect(result.files[normalizeToAbsolutePath(mainFile)]).toBeDefined();
    expect(result.files[normalizeToAbsolutePath(helperFile)]).toBeDefined();

    // Should have processed both tsconfigs
    const tsconfigLogs = consoleLogMock.calls.filter(call =>
      (call.arguments[0] as string)?.includes('Creating TypeScript'),
    );
    expect(tsconfigLogs.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle tsconfig references with backslashes', async () => {
    const baseDir = join(fixtures, 'backslash-reference');
    const rootFile = join(baseDir, 'file.ts');
    const subFile = join(baseDir, 'subdir/file.ts');

    // Don't pass explicit files - let the system discover them from tsconfigs
    const { configuration } = await sanitizeProjectAnalysisInput({ configuration: { baseDir } });
    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    // Both files should be analyzed despite backslash in tsconfig reference
    expect(Object.keys(result.files)).toEqual(expect.arrayContaining([rootFile, subFile]));
  });

  it('should skip nonexistent tsconfig references with warning', async ({ mock }) => {
    mock.method(console, 'log');
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;

    const baseDir = join(fixtures, 'nonexistent-reference');
    const filePath = join(baseDir, 'file.ts');

    const { configuration } = await sanitizeProjectAnalysisInput({ configuration: { baseDir } });
    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    // File should still be analyzed despite invalid reference
    expect(Object.keys(result.files)).toContain(filePath);

    // Should log warning about skipping missing reference
    const warningLogs = consoleLogMock.calls.filter(call =>
      (call.arguments[0] as string)?.includes('Skipping missing referenced tsconfig.json'),
    );
    expect(warningLogs.length).toBeGreaterThanOrEqual(1);
  });

  it('should analyze files from multiple independent tsconfigs', async () => {
    const baseDir = join(fixtures, 'multiple-tsconfigs');
    const frontendFile = join(baseDir, 'frontend/app.ts');
    const backendFile = join(baseDir, 'backend/server.ts');

    const configuration = await initForTest(
      { baseDir },
      {
        [frontendFile]: { filePath: frontendFile, fileType: 'MAIN' },
        [backendFile]: { filePath: backendFile, fileType: 'MAIN' },
      },
    );

    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    // Both files should be analyzed
    const frontendResult = result.files[normalizeToAbsolutePath(frontendFile)];
    const backendResult = result.files[normalizeToAbsolutePath(backendFile)];
    expect(frontendResult).toBeDefined();
    expect(backendResult).toBeDefined();

    // Both files should have issues (empty statements)
    expect('issues' in frontendResult! && frontendResult!.issues.length).toBeGreaterThan(0);
    expect('issues' in backendResult! && backendResult!.issues.length).toBeGreaterThan(0);
  });

  it('should analyze files not in any tsconfig with default options', async () => {
    const baseDir = join(fixtures, 'no-tsconfig');
    const filePath = join(baseDir, 'orphan.ts');

    console.log = mock.fn(console.log);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;

    const configuration = await initForTest(
      { baseDir },
      { [filePath]: { filePath, fileType: 'MAIN' } },
    );

    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    expect(result.files[normalizeToAbsolutePath(filePath)]).toBeDefined();

    // Should log that files are analyzed using default options (no tsconfig found)
    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes('using default options'),
      ),
    ).toBe(true);
  });

  it('should not populate program cache in SonarQube mode', async () => {
    const baseDir = join(fixtures, 'basic');
    const filePath = join(baseDir, 'main.ts');

    const configuration = await initForTest(
      { baseDir },
      { [filePath]: { filePath, fileType: 'MAIN' } },
    );

    await analyzeProject({ rules, bundles: [] }, configuration);

    // SonarQube uses createStandardProgram which doesn't use the cache manager
    // (unlike SonarLint which uses createOrGetCachedProgramForFile)
    // Verify cache is empty after analysis
    const cacheManager = getProgramCacheManager();
    const stats = cacheManager.getCacheStats();
    expect(stats.size).toBe(0);
  });

  it('should not use watch program in SonarQube mode', async () => {
    const baseDir = join(fixtures, 'basic');
    const filePath = join(baseDir, 'main.ts');

    console.log = mock.fn(console.log);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;

    // sonarlint is not set, so it's SonarQube mode
    const configuration = await initForTest(
      { baseDir },
      { [filePath]: { filePath, fileType: 'MAIN' } },
    );

    await analyzeProject({ rules, bundles: [] }, configuration);

    // Should NOT use incremental/watch program logs
    expect(
      consoleLogMock.calls.some(call => (call.arguments[0] as string)?.includes('Cache HIT')),
    ).toBe(false);
    expect(
      consoleLogMock.calls.some(call => (call.arguments[0] as string)?.includes('Cache MISS')),
    ).toBe(false);
  });

  it('should analyze without touching filesystem when canAccessFileSystem is false', async () => {
    const baseDir = '/path/does/not/exist';
    const filePath = join(normalizePath(baseDir), 'file.ts');

    const configuration = await initForTest(
      { baseDir, canAccessFileSystem: false },
      { [filePath]: { filePath, fileType: 'MAIN', fileContent: 'const x: number = 1;;' } },
    );

    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    // File should be analyzed (result entry exists)
    expect(result.files[normalizeToAbsolutePath(filePath)]).toBeDefined();
  });

  it('should return empty result for empty project', async () => {
    const baseDir = join(fixtures, 'basic');

    // Use canAccessFileSystem: false with no files to simulate an empty project
    const { configuration } = await sanitizeProjectAnalysisInput({
      configuration: { baseDir, canAccessFileSystem: false },
    });

    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    expect(result).toEqual({
      files: {},
      meta: {
        warnings: [],
      },
    });
  });

  it('should cancel analysis', async () => {
    const baseDir = join(fixtures, 'basic');
    const filePath = join(baseDir, 'main.ts');

    const configuration = await initForTest(
      { baseDir },
      { [filePath]: { filePath, fileType: 'MAIN' } },
    );

    const analysisPromise = analyzeProject({ rules, bundles: [] }, configuration, message => {
      expect(message).toEqual({ messageType: 'cancelled' });
    });
    cancelAnalysis();
    await analysisPromise;
  });

  it('should handle invalid tsconfig gracefully', async () => {
    const baseDir = join(fixtures, 'invalid-tsconfig');

    const { configuration } = await sanitizeProjectAnalysisInput({ configuration: { baseDir } });
    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    expect(result.meta.warnings.length).toEqual(1);
    const resultWarning = result.meta.warnings.at(0);
    expect(resultWarning).toEqual(
      `Failed to parse TSConfig file ${join(baseDir, 'tsconfig.json')}. Highest TypeScript supported version is ${ts.version}`,
    );
  });

  it('should warn when extended tsconfig is missing', async () => {
    const baseDir = join(fixtures, 'missing-extends');

    const { configuration } = await sanitizeProjectAnalysisInput({ configuration: { baseDir } });
    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    expect(result.meta.warnings.length).toEqual(1);
    const resultWarning = result.meta.warnings.at(0);
    expect(resultWarning).toEqual(
      "At least one referenced/extended tsconfig.json was not found in the project. Please run 'npm install' for a more complete analysis. Check analysis logs for more details.",
    );
  });

  it('should stream results via incrementalResults callback', async () => {
    const baseDir = join(fixtures, 'basic');
    const filePath = join(baseDir, 'main.ts');

    const configuration = await initForTest(
      { baseDir },
      { [filePath]: { filePath, fileType: 'MAIN' } },
    );

    const receivedMessages: unknown[] = [];
    await analyzeProject({ rules, bundles: [] }, configuration, message => {
      receivedMessages.push(message);
    });

    // Should receive incremental results for the file (messageType: 'fileResult')
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

  it('should discover and use tsconfigs from project references', async () => {
    const baseDir = join(fixtures, 'with-references');
    const mainFile = join(baseDir, 'main.ts');
    const helperFile = join(baseDir, 'libs/helper.ts');

    console.log = mock.fn(console.log);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;

    const configuration = await initForTest(
      { baseDir },
      {
        [mainFile]: { filePath: mainFile, fileType: 'MAIN' },
        [helperFile]: { filePath: helperFile, fileType: 'MAIN' },
      },
    );

    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    // Both files should be analyzed
    expect(result.files[normalizeToAbsolutePath(mainFile)]).toBeDefined();
    expect(result.files[normalizeToAbsolutePath(helperFile)]).toBeDefined();

    // Should have discovered the referenced lib tsconfig
    const libTsconfigPath = join(baseDir, 'libs/tsconfig.json');
    expect(
      consoleLogMock.calls.some(
        call =>
          (call.arguments[0] as string)?.includes('Creating TypeScript') ||
          (call.arguments[0] as string)?.includes(libTsconfigPath),
      ),
    ).toBe(true);
  });

  it('should analyze files both in and outside tsconfig', async () => {
    const baseDir = join(fixtures, 'mixed-files');
    const includedFile = join(baseDir, 'included.ts');
    const excludedFile = join(baseDir, 'excluded.ts');

    const configuration = await initForTest(
      { baseDir },
      {
        [includedFile]: { filePath: includedFile, fileType: 'MAIN' },
        [excludedFile]: { filePath: excludedFile, fileType: 'MAIN' },
      },
    );

    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    // Both files should be analyzed successfully
    const includedResult = result.files[normalizeToAbsolutePath(includedFile)];
    const excludedResult = result.files[normalizeToAbsolutePath(excludedFile)];
    expect(includedResult).toBeDefined();
    expect(excludedResult).toBeDefined();

    // Both should have S1116 issues (extra semicolons) - proving analysis worked
    expect('issues' in includedResult! && includedResult!.issues.length).toBeGreaterThan(0);
    expect('issues' in excludedResult! && excludedResult!.issues.length).toBeGreaterThan(0);

    // Verify the issues are the expected rule
    expect('issues' in includedResult! && includedResult!.issues[0].ruleId).toBe('S1116');
    expect('issues' in excludedResult! && excludedResult!.issues[0].ruleId).toBe('S1116');
  });

  it('should route HTML files to HTML analyzer and include CSS issues from style blocks', async () => {
    const baseDir = join(fixtures, 'html-yaml');
    const htmlFile = join(baseDir, 'file.html');

    const htmlRules: RuleConfig[] = [
      {
        key: 'S1440',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];
    const cssRules: CssRuleConfig[] = [{ key: 'no-extra-semicolons', configurations: [] }];

    const configuration = await initForTest(
      { baseDir },
      { [htmlFile]: { filePath: htmlFile, fileType: 'MAIN' } },
    );

    const result = await analyzeProject({ rules: htmlRules, cssRules, bundles: [] }, configuration);

    const fileResult = result.files[normalizeToAbsolutePath(htmlFile)];
    expect(fileResult).toBeDefined();
    expect('issues' in fileResult!).toBe(true);
    if ('issues' in fileResult!) {
      // CSS issues from <style> block should be merged into the result
      const ruleIds = fileResult.issues.map(i => i.ruleId);
      expect(ruleIds).toContain('no-extra-semicolons');
    }
  });

  it('should route YAML files to YAML analyzer', async () => {
    const baseDir = join(fixtures, 'html-yaml');
    const yamlFile = join(baseDir, 'file.yaml');

    const yamlRules: RuleConfig[] = [
      {
        key: 'S1440', // == comparison
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];

    const configuration = await initForTest(
      { baseDir },
      { [yamlFile]: { filePath: yamlFile, fileType: 'MAIN' } },
    );

    const result = await analyzeProject({ rules: yamlRules, bundles: [] }, configuration);

    // YAML file should be analyzed
    expect(result.files[normalizeToAbsolutePath(yamlFile)]).toBeDefined();
  });

  it('should route CSS files to CSS analyzer and return issues', async () => {
    const baseDir = join(fixtures, 'css');
    const cssFile = join(baseDir, 'file.css');

    const cssRules: CssRuleConfig[] = [{ key: 'no-extra-semicolons', configurations: [] }];

    const configuration = await initForTest(
      { baseDir },
      { [cssFile]: { filePath: cssFile, fileType: 'MAIN' } },
    );

    const result = await analyzeProject({ rules: [], cssRules, bundles: [] }, configuration);

    const fileResult = result.files[normalizeToAbsolutePath(cssFile)];
    expect(fileResult).toBeDefined();
    expect('issues' in fileResult!).toBe(true);
    if ('issues' in fileResult!) {
      expect(fileResult.issues.length).toBeGreaterThan(0);
      expect(fileResult.issues[0].ruleId).toBe('no-extra-semicolons');
    }
  });

  it('should return CSS metrics and highlights for non-sonarlint mode', async () => {
    const baseDir = join(fixtures, 'css');
    const cssFile = join(baseDir, 'file.css');

    const cssRules: CssRuleConfig[] = [{ key: 'no-extra-semicolons', configurations: [] }];

    const configuration = await initForTest(
      { baseDir },
      { [cssFile]: { filePath: cssFile, fileType: 'MAIN' } },
    );

    const result = await analyzeProject({ rules: [], cssRules, bundles: [] }, configuration);

    const fileResult = result.files[normalizeToAbsolutePath(cssFile)];
    expect(fileResult).toBeDefined();
    if (fileResult && 'metrics' in fileResult && fileResult.metrics) {
      expect(fileResult.metrics.ncloc!.length).toBeGreaterThan(0);
    }
    if (fileResult && 'highlights' in fileResult && fileResult.highlights) {
      expect(fileResult.highlights.length).toBeGreaterThan(0);
    }
  });

  it('should analyze sass files without errors', async () => {
    const baseDir = join(fixtures, 'css');
    const sassFile = join(baseDir, 'flexbox.sass');

    const cssRules: CssRuleConfig[] = [{ key: 'block-no-empty', configurations: [] }];

    const configuration = await initForTest(
      { baseDir },
      { [sassFile]: { filePath: sassFile, fileType: 'MAIN' } },
    );

    const result = await analyzeProject({ rules: [], cssRules, bundles: [] }, configuration);

    const fileResult = result.files[normalizeToAbsolutePath(sassFile)];
    expect(fileResult).toBeDefined();
    // Should not be a parsing error
    expect(fileResult && 'parsingError' in fileResult).toBe(false);
  });

  it('should not return issues or metrics for TEST CSS files, only highlights', async () => {
    const baseDir = join(fixtures, 'css');
    const cssFile = join(baseDir, 'file.css');

    const cssRules: CssRuleConfig[] = [{ key: 'no-extra-semicolons', configurations: [] }];

    const configuration = await initForTest(
      { baseDir },
      { [cssFile]: { filePath: cssFile, fileType: 'TEST' } },
    );

    const result = await analyzeProject({ rules: [], cssRules, bundles: [] }, configuration);

    const fileResult = result.files[normalizeToAbsolutePath(cssFile)];
    expect(fileResult).toBeDefined();
    if (fileResult && 'issues' in fileResult) {
      // TEST files should have no issues (old CssRuleSensor never analyzed TEST files)
      expect(fileResult.issues).toEqual([]);
    }
    if (fileResult && 'highlights' in fileResult && fileResult.highlights) {
      // TEST files should still get highlighting (old CssMetricSensor did this)
      expect(fileResult.highlights.length).toBeGreaterThan(0);
    }
    // Metrics should not be present for TEST files
    if (fileResult && 'metrics' in fileResult) {
      expect(fileResult.metrics).toBeUndefined();
    }
  });

  it('should handle analysis errors gracefully with fileContent for non-existent paths', async () => {
    const baseDir = join(fixtures, 'basic');
    // Use fileContent for a non-existent path to test error handling
    const nonExistentFile = join(baseDir, 'does-not-exist.ts');

    // Provide fileContent so the analysis can proceed without reading disk
    const configuration = await initForTest(
      { baseDir },
      {
        [nonExistentFile]: {
          filePath: nonExistentFile,
          fileType: 'MAIN',
          fileContent: 'const x: number = 1;;',
        },
      },
    );

    // Should not throw and handle the file even if path doesn't exist
    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    // File entry should exist - file was analyzed from content
    const fileResult = result.files[normalizeToAbsolutePath(nonExistentFile)];
    expect(fileResult).toBeDefined();
    // Should have an issue since the code has an extra semicolon
    expect('issues' in fileResult! && fileResult!.issues.length).toBeGreaterThan(0);
  });

  it('should skip TypeScript program creation for orphan files when createTSProgramForOrphanFiles is false', async () => {
    const baseDir = join(fixtures, 'no-tsconfig');
    const filePath = join(baseDir, 'orphan.ts');

    console.log = mock.fn(console.log);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;

    const configuration = await initForTest(
      { baseDir, createTSProgramForOrphanFiles: false },
      { [filePath]: { filePath, fileType: 'MAIN' } },
    );

    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    // Should log the skipping message
    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes('Skipping TypeScript program creation for'),
      ),
    ).toBe(true);

    // The file should still be analyzed (without type info, via analyzeWithoutProgram)
    expect(result.files[normalizeToAbsolutePath(filePath)]).toBeDefined();

    // Should log that files are analyzed without type information
    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes('not part of any tsconfig.json'),
      ),
    ).toBe(true);

    // Should NOT log "using default options" since we skip the entry point program creation
    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes('using default options'),
      ),
    ).toBe(false);
  });

  it('should create TypeScript program for orphan files when createTSProgramForOrphanFiles is true', async () => {
    const baseDir = join(fixtures, 'no-tsconfig');
    const filePath = join(baseDir, 'orphan.ts');

    console.log = mock.fn(console.log);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;

    const configuration = await initForTest(
      { baseDir, createTSProgramForOrphanFiles: true },
      { [filePath]: { filePath, fileType: 'MAIN' } },
    );

    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    // Should log the default options message (entry point analysis runs)
    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes('using default options'),
      ),
    ).toBe(true);

    // Should NOT log the skipping message
    expect(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string)?.includes('Skipping TypeScript program creation for'),
      ),
    ).toBe(false);

    // File should be analyzed
    expect(result.files[normalizeToAbsolutePath(filePath)]).toBeDefined();
  });

  it('should skip all program creation when disableTypeChecking is true', async () => {
    const baseDir = join(fixtures, 'no-tsconfig');
    const filePath = join(baseDir, 'orphan.ts');

    console.log = mock.fn(console.log);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;

    const configuration = await initForTest(
      { baseDir, disableTypeChecking: true },
      { [filePath]: { filePath, fileType: 'MAIN' } },
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

  it('should report parsing errors', async () => {
    const baseDir = join(fixtures, 'parsing-error');
    const filePath = join(baseDir, 'file.js');

    const configuration = await initForTest(
      { baseDir },
      { [filePath]: { filePath, fileType: 'MAIN' } },
    );

    const result = await analyzeProject({ rules, bundles: [] }, configuration);

    const fileResult = result.files[normalizeToAbsolutePath(filePath)];
    expect(fileResult).toBeDefined();
    expect('parsingError' in fileResult!).toBe(true);
    if ('parsingError' in fileResult!) {
      expect(fileResult.parsingError).toMatchObject({
        code: ErrorCode.Parsing,
        message: 'Unexpected token (3:0)',
        line: 3,
      });
    }
  });
});
