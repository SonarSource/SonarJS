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

import { SourceFileStore } from './source-files.js';
import { PackageJsonStore } from './package-jsons.js';
import { TsConfigStore } from './tsconfigs.js';
import type { FileStore } from './store-type.js';

export const sourceFileStore = new SourceFileStore();
export const packageJsonStore = new PackageJsonStore(sourceFileStore);
export const tsConfigStore = new TsConfigStore(sourceFileStore);

export default [sourceFileStore, packageJsonStore, tsConfigStore] as FileStore[];
