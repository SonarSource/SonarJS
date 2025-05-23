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
import { getExclusions } from '../../../../shared/src/helpers/configuration.js';
import { JsTsFiles } from './projectAnalysis.js';
import { findFiles } from '../../../../shared/src/helpers/find-files.js';
import fileStores from './file-stores/index.js';

export async function loadFiles(baseDir: string, inputFiles?: JsTsFiles) {
  const pendingStores = fileStores.filter(store => !store.isInitialized(baseDir, inputFiles));
  // if all stores are initialized, skip search
  if (pendingStores.length === 0) {
    return;
  }

  pendingStores.forEach(store => store.setup(baseDir));
  await findFiles(
    baseDir,
    async (file, filePath) => {
      for (const store of pendingStores) {
        await store.process(file, filePath);
      }
    },
    getExclusions(),
  );
  for (const store of pendingStores) {
    await store.postProcess(baseDir);
  }
}
