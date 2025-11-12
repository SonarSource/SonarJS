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
import { stat } from 'node:fs/promises';
import { info, warn } from '../../../../shared/src/helpers/logging.js';
import type { ProjectReference } from 'typescript';

export class Cache {
  public discoveredTsConfigFiles = new Set<string>();
  public key: string | undefined;
  public originalTsConfigFiles: string[] = [];
  private pendingTsConfigFiles: string[] = [];
  public initialized = false;

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
    this.discoveredTsConfigFiles = new Set<string>(this.originalTsConfigFiles);
    this.pendingTsConfigFiles = [...this.originalTsConfigFiles];
  }

  clearAll() {
    this.initialized = false;
    this.originalTsConfigFiles = [];
    this.discoveredTsConfigFiles = new Set<string>(this.originalTsConfigFiles);
    this.pendingTsConfigFiles = [...this.originalTsConfigFiles];
  }
}
