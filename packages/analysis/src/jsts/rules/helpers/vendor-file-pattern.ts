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
import { pathHasSegment } from './files.js';

// Well-known naming conventions for directories that hold copied third-party code.
const VENDOR_DIRECTORY_NAMES = new Set([
  'contrib',
  'external',
  'externals',
  'third-party',
  'thirdparty',
  'vendor',
  'vendors',
]);

// Widely-used library names that appear as directory segments when vendored into a project.
const KNOWN_LIBRARY_NAMES = new Set([
  'backbone',
  'bluebird',
  'chartjs',
  'codemirror',
  'd3',
  'dompurify',
  'handlebars',
  'jquery',
  'knockout',
  'lodash',
  'marked',
  'modernizr',
  'moment',
  'mootools',
  'punycode',
  'requirejs',
  'semver',
  'sprintf',
  'underscore',
  'xregexp',
]);

/**
 * Checks whether a file path contains a vendor directory segment.
 *
 * @param filePath the file path to test.
 * @returns true when the path includes a vendor directory.
 */
export function isVendorFile(filePath: string): boolean {
  return pathHasSegment(filePath, VENDOR_DIRECTORY_NAMES) || pathHasSegment(filePath, KNOWN_LIBRARY_NAMES);
}
