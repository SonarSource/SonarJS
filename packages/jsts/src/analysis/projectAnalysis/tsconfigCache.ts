/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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

import { dirname } from 'node:path/posix';
import { stat } from 'node:fs/promises';
import { debug, info, warn } from '../../../../shared/src/helpers/logging.js';
import { createProgramOptions } from '../../program/program.js';
import { UNINITIALIZED_ERROR } from './file-stores/tsconfigs.js';
import type { ProjectReference } from 'typescript';

export class Cache {
  private readonly inputFileToTsConfigFilesMap = new Map<string, string | null>();
  public discoveredTsConfigFiles = new Set<string>();
  public key: string | undefined;
  public originalTsConfigFiles: string[] = [];
  private pendingTsConfigFiles: string[] = [];
  public initialized = false;

  async getTsConfigForInputFile(inputFile: string) {
    if (!this.initialized) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    if (this.inputFileToTsConfigFilesMap.has(inputFile)) {
      return this.inputFileToTsConfigFilesMap.get(inputFile)!;
    }

    return await this.getTsConfigMapForInputFile(inputFile);
  }

  async getTsConfigMapForInputFile(inputFile: string): Promise<string | null> {
    this.pendingTsConfigFiles = this.getImprovedPendingTsConfigOrder(inputFile);

    debug(`Continuing BFS for file: ${inputFile}, pending order: ${this.pendingTsConfigFiles}`);
    while (this.pendingTsConfigFiles.length) {
      const tsConfigPath = this.pendingTsConfigFiles.pop()!;
      debug(`Computing tsconfig ${tsConfigPath} from bridge`);
      try {
        const tsConfigFile = createProgramOptions(tsConfigPath);
        tsConfigFile.rootNames.forEach(file => {
          if (!this.inputFileToTsConfigFilesMap.has(file)) {
            this.inputFileToTsConfigFilesMap.set(file, tsConfigPath);
          }
        });
        await this.addReferencedTsConfig(tsConfigFile.projectReferences);
        if (this.inputFileToTsConfigFilesMap.has(inputFile)) {
          const foundTsConfigFile = this.inputFileToTsConfigFilesMap.get(inputFile)!;
          info(
            `Using tsConfig ${foundTsConfigFile} for file source file ${inputFile} (${this.pendingTsConfigFiles.length}/${this.discoveredTsConfigFiles.size} tsconfigs not yet checked)`,
          );
          return foundTsConfigFile;
        }
      } catch (e) {
        info(`Failed to analyze TSConfig ${tsConfigPath}: ${e.message || e.toString()}`);
      }
    }
    this.inputFileToTsConfigFilesMap.set(inputFile, null);
    return null;
  }

  async addReferencedTsConfig(projectReferences: readonly ProjectReference[] = []) {
    for (const ref of projectReferences) {
      if (!this.discoveredTsConfigFiles.has(ref.path)) {
        const refPath = ref.path;
        try {
          const refStat = await stat(refPath);
          if (refStat.isFile()) {
            this.addSanitizedReferencedTsConfig(refPath);
          }
          const tsconfig = `${refPath}/tsconfig.json`;
          if (
            !this.discoveredTsConfigFiles.has(tsconfig) &&
            refStat.isDirectory() &&
            (await stat(tsconfig)).isFile()
          ) {
            this.addSanitizedReferencedTsConfig(tsconfig);
          }
        } catch {
          warn(`Referenced tsconfig ${refPath} not found.`);
        }
      }
    }
  }

  addSanitizedReferencedTsConfig(tsconfig: string) {
    info(`Adding referenced project's tsconfigs ${tsconfig}`);
    this.discoveredTsConfigFiles.add(tsconfig);
    this.pendingTsConfigFiles.push(tsconfig);
  }

  initializeOriginalTsConfigs(tsconfigs: string[] | string | undefined) {
    this.initialized = true;
    if (tsconfigs) {
      this.originalTsConfigFiles = Array.isArray(tsconfigs) ? tsconfigs : [tsconfigs];
    } else {
      this.originalTsConfigFiles = [];
    }
    this.clearFileToTsConfigCache();
  }

  clearAll() {
    this.initialized = false;
    this.originalTsConfigFiles = [];
    this.clearFileToTsConfigCache();
  }

  clearFileToTsConfigCache() {
    this.inputFileToTsConfigFilesMap.clear();
    this.discoveredTsConfigFiles = new Set<string>(this.originalTsConfigFiles);
    this.pendingTsConfigFiles = [...this.originalTsConfigFiles];
  }

  /**
   * Compute an improved order of the pending tsconfig files with respect to the given inputFile.
   * This is based on the assumption that a tsconfig *should be* in some parent folder of the inputFile.
   * As an example, for a file in "/usr/path1/path2/index.js", we would identify look for tsconfig's in the exact
   * folders * "/", "/usr/", "/usr/path1/", "/usr/path1/path2/" and move them to the front.
   * Note: This will not change the order between the identified and non-identified tsconfigs.
   * Time and space complexity: O(n).
   *
   * @param inputFile current file to analyze
   * @return Reordered queue of tsconfig files
   */
  private getImprovedPendingTsConfigOrder(inputFile: string) {
    const newPendingTsConfigFiles: string[] = [];
    const notMatchingPendingTsConfigFiles: string[] = [];
    this.pendingTsConfigFiles.forEach(ts => {
      if (inputFile.startsWith(dirname(ts))) {
        newPendingTsConfigFiles.push(ts);
      } else {
        notMatchingPendingTsConfigFiles.push(ts);
      }
    });
    newPendingTsConfigFiles.push(...notMatchingPendingTsConfigFiles);
    return newPendingTsConfigFiles.reverse();
  }
}
