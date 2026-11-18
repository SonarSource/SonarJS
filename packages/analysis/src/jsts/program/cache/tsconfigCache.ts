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
import { fileContentStore } from '../../../common/file-content-store.js';
import { debug } from '../../../../../shared/src/helpers/logging.js';

const tsconfigKey = Symbol('tsconfig missing status');
const tsconfigContentCache = {
  get(path: string): { contents: string; missing: boolean } | undefined {
    const missing = fileContentStore.getData<boolean>(path, tsconfigKey);
    const contents = missing ? '{}' : fileContentStore.get(path);
    if (missing === undefined || contents === undefined) {
      return undefined;
    }
    return { contents, missing };
  },
  has(path: string): boolean {
    return this.get(path) !== undefined;
  },
  set(path: string, value: { contents: string; missing: boolean }): void {
    if (!value.missing) {
      fileContentStore.set(path, value.contents);
    }
    fileContentStore.setData(path, tsconfigKey, value.missing);
  },
  get size(): number {
    return [...fileContentStore.pathsWithData(tsconfigKey)].length;
  },
};

/** A TSConfig view over the shared contents; missing configs retain only their sentinel metadata. */
export function getTsConfigContentCache(): typeof tsconfigContentCache {
  return tsconfigContentCache;
}

export function clearTsConfigContentCache(): void {
  for (const path of fileContentStore.pathsWithData(tsconfigKey)) {
    fileContentStore.delete(path);
  }
  debug('Cleared tsconfig content cache');
}
