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
// Mock FileStore implementation
import { beforeEach, describe, it } from 'node:test';
import { expect } from 'expect';
import { join } from 'node:path/posix';
import { FileStore, type FileProcessingMode } from '../src/file-stores/store-type.js';
import {
  normalizePath,
  normalizeToAbsolutePath,
  type File,
} from '../../shared/src/helpers/files.js';
import { createConfiguration, type Configuration } from '../src/common/configuration.js';
import type { AnalyzableFiles } from '../src/projectAnalysis.js';
import { sanitizeRawInputFiles } from '../src/common/input-sanitize.js';
import {
  dependencyManifestStore,
  generatedSourceStore,
  initFileStores,
  simulateFromInputFiles,
  sourceFileStore,
} from '../src/file-stores/index.js';

const sourceFileFixtures = normalizeToAbsolutePath(
  join(import.meta.dirname, 'fixtures-source-files'),
);

class MockFileStore implements FileStore {
  constructor(private readonly fileRequest: FileProcessingMode | false = 'path') {}

  public processedDirectories: string[] = [];
  public processedFiles: string[] = [];
  public receivedFiles: Array<File | undefined> = [];
  public setupCalled = false;
  public postProcessCalled = false;

  async isInitialized(
    _configuration: Configuration,
    _inputFiles?: AnalyzableFiles,
  ): Promise<boolean> {
    return false; // Always return false to simulate uninitialized state
  }

  setup(_configuration: Configuration): void {
    this.setupCalled = true;
  }

  wantsFile(_filename: string, _configuration: Configuration): FileProcessingMode | false {
    return this.fileRequest;
  }

  processDirectory(dir: string): void {
    this.processedDirectories.push(dir);
  }

  async processFile(filename: string, _configuration: Configuration, file?: File): Promise<void> {
    this.processedFiles.push(filename);
    this.receivedFiles.push(file);
  }

  async postProcess(_configuration: Configuration): Promise<void> {
    this.postProcessCalled = true;
  }
}

describe('simulateFromInputFiles', () => {
  beforeEach(() => {
    dependencyManifestStore.clearCache();
    generatedSourceStore.clearCache();
    sourceFileStore.clearCache();
  });

  it('should process directories and files correctly', async () => {
    // Arrange
    const mockStore = new MockFileStore();
    const configuration = createConfiguration({
      baseDir: normalizeToAbsolutePath('/project'),
    });
    const { files: inputFiles } = await sanitizeRawInputFiles(
      {
        file1: {
          filePath: '/project/src/components/Button.tsx',
          fileType: 'MAIN',
          fileContent: '',
        },
        file2: { filePath: '/project/src/utils/helper.ts', fileType: 'MAIN', fileContent: '' },
        file3: { filePath: '/project/tests/Button.test.tsx', fileType: 'TEST', fileContent: '' },
      },
      configuration,
    );
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
        _inputFiles?: AnalyzableFiles,
      ): Promise<boolean> {
        return false;
      }
      setup(_configuration: Configuration): void {}
      wantsFile(_filename: string, _configuration: Configuration): FileProcessingMode | false {
        return 'path';
      }
      async processFile(
        filename: string,
        _configuration: Configuration,
        _file?: File,
      ): Promise<void> {
        this.processedFiles.push(filename);
      }
      async postProcess(_configuration: Configuration): Promise<void> {}
      // Note: processDirectory is optional, so we don't implement it
    }

    const mockStore = new MockStoreWithoutProcessDirectory();
    const configuration = createConfiguration({
      baseDir: normalizeToAbsolutePath('/project'),
    });
    const { files: inputFiles } = await sanitizeRawInputFiles(
      { file1: { filePath: '/project/src/test.js', fileType: 'MAIN', fileContent: '' } },
      configuration,
    );

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
    const configuration = createConfiguration({
      baseDir: normalizeToAbsolutePath('/project'),
    });
    const { files: inputFiles } = await sanitizeRawInputFiles({}, configuration);

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
    const configuration = createConfiguration({
      baseDir: normalizeToAbsolutePath('/project'),
    });
    const { files: inputFiles } = await sanitizeRawInputFiles(
      { file1: { filePath: '/project/src/app.js', fileType: 'MAIN', fileContent: '' } },
      configuration,
    );

    // Act
    await simulateFromInputFiles(inputFiles, configuration, [mockStore1, mockStore2]);

    // Assert
    // Both stores should have processed the same directories and files
    expect(mockStore1.processedDirectories).toEqual(mockStore2.processedDirectories);
    expect(mockStore1.processedFiles).toEqual(mockStore2.processedFiles);

    expect(mockStore1.processedFiles).toContain(normalizePath('/project/src/app.js'));
    expect(mockStore2.processedFiles).toContain(normalizePath('/project/src/app.js'));
  });

  it('should share the same file object across content stores', async () => {
    const mockStore1 = new MockFileStore('content');
    const mockStore2 = new MockFileStore('content');
    const configuration = createConfiguration({
      baseDir: normalizeToAbsolutePath('/project'),
    });
    const { files: inputFiles } = await sanitizeRawInputFiles(
      {
        file1: {
          filePath: '/project/src/app.js',
          fileType: 'MAIN',
          fileContent: 'console.log("shared");',
        },
      },
      configuration,
    );

    await simulateFromInputFiles(inputFiles, configuration, [mockStore1, mockStore2]);

    expect(mockStore1.receivedFiles[0]).toBeDefined();
    expect(mockStore1.receivedFiles[0]).toBe(mockStore2.receivedFiles[0]);
    expect(mockStore1.receivedFiles[0]?.fileContent).toEqual('console.log("shared");');
  });

  it('should skip files for stores that do not want them', async () => {
    class FilteringMockStore extends MockFileStore {
      override wantsFile(
        filename: string,
        _configuration: Configuration,
      ): FileProcessingMode | false {
        return filename.endsWith('.ts') ? 'path' : false;
      }
    }

    const mockStore = new FilteringMockStore();
    const configuration = createConfiguration({
      baseDir: normalizeToAbsolutePath('/project'),
    });
    const { files: inputFiles } = await sanitizeRawInputFiles(
      {
        file1: { filePath: '/project/src/app.js', fileType: 'MAIN', fileContent: '' },
        file2: { filePath: '/project/src/app.ts', fileType: 'MAIN', fileContent: '' },
      },
      configuration,
    );

    await simulateFromInputFiles(inputFiles, configuration, [mockStore]);

    expect(mockStore.processedFiles).toEqual([normalizePath('/project/src/app.ts')]);
  });
});

describe('initFileStores', () => {
  beforeEach(() => {
    dependencyManifestStore.clearCache();
    generatedSourceStore.clearCache();
    sourceFileStore.clearCache();
  });

  it('should skip generated-source post-processing when filesystem access is disabled', async ({
    mock,
  }) => {
    const baseDir = normalizeToAbsolutePath(join(sourceFileFixtures, 'paths'));
    const configuration = createConfiguration({ baseDir, canAccessFileSystem: false });
    const postProcessMock = mock.method(generatedSourceStore, 'postProcess');
    const setupMock = mock.method(generatedSourceStore, 'setup');

    const { files: inputFiles } = await sanitizeRawInputFiles(
      { file1: { filePath: join(baseDir, 'src', 'app.js'), fileType: 'MAIN', fileContent: '' } },
      configuration,
    );

    await initFileStores(configuration, inputFiles);

    expect(setupMock.mock.calls).toHaveLength(0);
    expect(postProcessMock.mock.calls).toHaveLength(0);
  });
});
