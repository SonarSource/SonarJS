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
// Mock FileStore implementation
import { describe, it } from 'node:test';
import { JSTS_ANALYSIS_DEFAULTS } from '../../src/analysis/analysis.js';
import { simulateFromInputFiles } from '../../src/analysis/projectAnalysis/file-stores/index.js';
import { expect } from 'expect';
import {
  FileStore,
  type RawInputFiles,
} from '../../src/analysis/projectAnalysis/file-stores/store-type.js';
import { normalizePath, normalizeToAbsolutePath } from '../../src/rules/helpers/files.js';
import {
  createConfiguration,
  type Configuration,
} from '../../../shared/src/helpers/configuration.js';

class MockFileStore implements FileStore {
  public processedDirectories: string[] = [];
  public processedFiles: string[] = [];
  public setupCalled = false;
  public postProcessCalled = false;

  async isInitialized(
    _configuration: Configuration,
    _inputFiles?: RawInputFiles,
  ): Promise<boolean> {
    return false; // Always return false to simulate uninitialized state
  }

  setup(_configuration: Configuration): void {
    this.setupCalled = true;
  }

  processDirectory(dir: string): void {
    this.processedDirectories.push(dir);
  }

  async processFile(filename: string, _configuration: Configuration): Promise<void> {
    this.processedFiles.push(filename);
  }

  async postProcess(_configuration: Configuration): Promise<void> {
    this.postProcessCalled = true;
  }
}

describe('simulateFromInputFiles', () => {
  it('should process directories and files correctly', async () => {
    // Arrange
    const mockStore = new MockFileStore();
    // RawInputFiles uses string paths that will be normalized by the function
    const inputFiles: RawInputFiles = {
      file1: {
        filePath: '/project/src/components/Button.tsx',
        fileType: 'MAIN',
        fileContent: '',
        fileStatus: JSTS_ANALYSIS_DEFAULTS.fileStatus,
      },
      file2: {
        filePath: '/project/src/utils/helper.ts',
        fileType: 'MAIN',
        fileContent: '',
        fileStatus: JSTS_ANALYSIS_DEFAULTS.fileStatus,
      },
      file3: {
        filePath: '/project/tests/Button.test.tsx',
        fileType: 'TEST',
        fileContent: '',
        fileStatus: JSTS_ANALYSIS_DEFAULTS.fileStatus,
      },
    };
    const configuration = createConfiguration({
      baseDir: normalizeToAbsolutePath('/project'),
    });
    const pendingStores = [mockStore];

    // Act
    await simulateFromInputFiles(inputFiles, configuration, pendingStores);

    // Assert
    // Check that directories were processed (parent directories of input files)
    expect(mockStore.processedDirectories).toHaveLength(4);
    expect(mockStore.processedDirectories).toContain(normalizePath('/project/src/components'));
    expect(mockStore.processedDirectories).toContain(normalizePath('/project/src/utils'));
    expect(mockStore.processedDirectories).toContain(normalizePath('/project/tests'));
    expect(mockStore.processedDirectories).toContain(normalizePath('/project/src'));

    // Check that all files were processed
    expect(mockStore.processedFiles).toHaveLength(3);
    expect(mockStore.processedFiles).toContain(normalizePath('/project/src/components/Button.tsx'));
    expect(mockStore.processedFiles).toContain(normalizePath('/project/src/utils/helper.ts'));
    expect(mockStore.processedFiles).toContain(normalizePath('/project/tests/Button.test.tsx'));

    // Verify the correct number of processed items
    expect(mockStore.processedFiles).toHaveLength(3);
  });

  it('should handle stores without processDirectory method', async () => {
    // Arrange
    class MockStoreWithoutProcessDirectory implements FileStore {
      public processedFiles: string[] = [];

      async isInitialized(
        _configuration: Configuration,
        _inputFiles?: RawInputFiles,
      ): Promise<boolean> {
        return false;
      }
      setup(_configuration: Configuration): void {}
      async processFile(filename: string, _configuration: Configuration): Promise<void> {
        this.processedFiles.push(filename);
      }
      async postProcess(_configuration: Configuration): Promise<void> {}
      // Note: processDirectory is optional, so we don't implement it
    }

    const mockStore = new MockStoreWithoutProcessDirectory();
    const inputFiles: RawInputFiles = {
      file1: {
        filePath: '/project/src/test.js',
        fileType: 'MAIN',
        fileContent: '',
        fileStatus: JSTS_ANALYSIS_DEFAULTS.fileStatus,
      },
    };
    const configuration = createConfiguration({
      baseDir: normalizeToAbsolutePath('/project'),
    });

    // Act & Assert - should not throw an error
    await expect(
      simulateFromInputFiles(inputFiles, configuration, [mockStore]),
    ).resolves.not.toThrow();

    // Files should still be processed
    expect(mockStore.processedFiles).toContain(normalizePath('/project/src/test.js'));
  });

  it('should handle empty input files', async () => {
    // Arrange
    const mockStore = new MockFileStore();
    const inputFiles: RawInputFiles = {};
    const configuration = createConfiguration({
      baseDir: normalizeToAbsolutePath('/project'),
    });

    // Act
    await simulateFromInputFiles(inputFiles, configuration, [mockStore]);

    // Assert
    expect(mockStore.processedDirectories).toHaveLength(0);
    expect(mockStore.processedFiles).toHaveLength(0);
  });

  it('should work with multiple stores', async () => {
    // Arrange
    const mockStore1 = new MockFileStore();
    const mockStore2 = new MockFileStore();
    const inputFiles: RawInputFiles = {
      file1: {
        filePath: '/project/src/app.js',
        fileType: 'MAIN',
        fileContent: '',
        fileStatus: JSTS_ANALYSIS_DEFAULTS.fileStatus,
      },
    };
    const configuration = createConfiguration({
      baseDir: normalizeToAbsolutePath('/project'),
    });

    // Act
    await simulateFromInputFiles(inputFiles, configuration, [mockStore1, mockStore2]);

    // Assert
    // Both stores should have processed the same directories and files
    expect(mockStore1.processedDirectories).toEqual(mockStore2.processedDirectories);
    expect(mockStore1.processedFiles).toEqual(mockStore2.processedFiles);

    expect(mockStore1.processedFiles).toContain(normalizePath('/project/src/app.js'));
    expect(mockStore2.processedFiles).toContain(normalizePath('/project/src/app.js'));
  });
});
