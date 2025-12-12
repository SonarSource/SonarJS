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
import { JsTsFiles } from '../../src/analysis/projectAnalysis/projectAnalysis.js';
import { simulateFromInputFiles } from '../../src/analysis/projectAnalysis/file-stores/index.js';
import { expect } from 'expect';
import { FileStore } from '../../src/analysis/projectAnalysis/file-stores/store-type.js';
import { toUnixPath } from '../../src/rules/helpers/files.js';

class MockFileStore implements FileStore {
  public processedDirectories: string[] = [];
  public processedFiles: string[] = [];
  public setupCalled = false;
  public postProcessCalled = false;

  async isInitialized(_baseDir: string, _inputFiles?: JsTsFiles): Promise<boolean> {
    return false; // Always return false to simulate uninitialized state
  }

  setup(_baseDir: string): void {
    this.setupCalled = true;
  }

  processDirectory(dir: string): void {
    this.processedDirectories.push(dir);
  }

  async processFile(filename: string): Promise<void> {
    this.processedFiles.push(filename);
  }

  async postProcess(_baseDir: string): Promise<void> {
    this.postProcessCalled = true;
  }
}

describe('simulateFromInputFiles', () => {
  it('should process directories and files correctly', async () => {
    // Arrange
    const mockStore = new MockFileStore();
    const inputFiles: JsTsFiles = {
      file1: { filePath: '/project/src/components/Button.tsx', fileType: 'MAIN' },
      file2: { filePath: '/project/src/utils/helper.ts', fileType: 'MAIN' },
      file3: { filePath: '/project/tests/Button.test.tsx', fileType: 'TEST' },
    };
    const baseDir = toUnixPath('/project');
    const pendingStores = [mockStore];

    // Act
    await simulateFromInputFiles(inputFiles, baseDir, pendingStores);

    // Assert
    // Check that directories were processed (parent directories of input files)
    expect(mockStore.processedDirectories).toHaveLength(4);
    expect(mockStore.processedDirectories).toContain(toUnixPath('/project/src/components'));
    expect(mockStore.processedDirectories).toContain(toUnixPath('/project/src/utils'));
    expect(mockStore.processedDirectories).toContain(toUnixPath('/project/tests'));
    expect(mockStore.processedDirectories).toContain(toUnixPath('/project/src'));

    // Check that all files were processed
    expect(mockStore.processedFiles).toHaveLength(3);
    expect(mockStore.processedFiles).toContain(toUnixPath('/project/src/components/Button.tsx'));
    expect(mockStore.processedFiles).toContain(toUnixPath('/project/src/utils/helper.ts'));
    expect(mockStore.processedFiles).toContain(toUnixPath('/project/tests/Button.test.tsx'));

    // Verify the correct number of processed items
    expect(mockStore.processedFiles).toHaveLength(3);
  });

  it('should handle stores without processDirectory method', async () => {
    // Arrange
    class MockStoreWithoutProcessDirectory implements FileStore {
      public processedFiles: string[] = [];

      async isInitialized(): Promise<boolean> {
        return false;
      }
      setup(): void {}
      async processFile(filename: string): Promise<void> {
        this.processedFiles.push(filename);
      }
      async postProcess(): Promise<void> {}
      // Note: processDirectory is optional, so we don't implement it
    }

    const mockStore = new MockStoreWithoutProcessDirectory();
    const inputFiles: JsTsFiles = {
      file1: { filePath: '/project/src/test.js', fileType: 'MAIN' },
    };
    const baseDir = toUnixPath('/project');

    // Act & Assert - should not throw an error
    await expect(simulateFromInputFiles(inputFiles, baseDir, [mockStore])).resolves.not.toThrow();

    // Files should still be processed
    expect(mockStore.processedFiles).toContain(toUnixPath('/project/src/test.js'));
  });

  it('should handle empty input files', async () => {
    // Arrange
    const mockStore = new MockFileStore();
    const inputFiles: JsTsFiles = {};
    const baseDir = toUnixPath('/project');

    // Act
    await simulateFromInputFiles(inputFiles, baseDir, [mockStore]);

    // Assert
    expect(mockStore.processedDirectories).toHaveLength(0);
    expect(mockStore.processedFiles).toHaveLength(0);
  });

  it('should work with multiple stores', async () => {
    // Arrange
    const mockStore1 = new MockFileStore();
    const mockStore2 = new MockFileStore();
    const inputFiles: JsTsFiles = {
      file1: { filePath: '/project/src/app.js', fileType: 'MAIN' },
    };
    const baseDir = toUnixPath('/project');

    // Act
    await simulateFromInputFiles(inputFiles, baseDir, [mockStore1, mockStore2]);

    // Assert
    // Both stores should have processed the same directories and files
    expect(mockStore1.processedDirectories).toEqual(mockStore2.processedDirectories);
    expect(mockStore1.processedFiles).toEqual(mockStore2.processedFiles);

    expect(mockStore1.processedFiles).toContain(toUnixPath('/project/src/app.js'));
    expect(mockStore2.processedFiles).toContain(toUnixPath('/project/src/app.js'));
  });
});
