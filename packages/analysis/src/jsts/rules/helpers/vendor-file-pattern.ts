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
import { normalizePath } from './files.js';

const VENDOR_DIRECTORY_NAMES = new Set([
  'asset',
  'assets',
  'contrib',
  'external',
  'externals',
  'static',
  'third-party',
  'thirdparty',
  'vendor',
  'vendors',
]);

/**
 * Checks whether a file path contains a vendor directory segment.
 *
 * @param filePath the file path to test.
 * @returns true when the path includes a vendor directory.
 */
export function isVendorFile(filePath: string): boolean {
  return normalizePath(filePath)
    .split('/')
    .some(segment => VENDOR_DIRECTORY_NAMES.has(segment.toLowerCase()));
}
