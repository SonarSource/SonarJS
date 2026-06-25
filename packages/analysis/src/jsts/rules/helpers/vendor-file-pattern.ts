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

// Matches single-file distributions of widely-used libraries when copied into a project.
// Covers each library's documented distribution filename format:
//   - bare:      jquery.js, lodash.js
//   - minified:  jquery.min.js, lodash.min.js
//   - versioned: jquery-3.7.1.js, moment-2.29.4.min.js, three.r128.min.js, d3.v7.min.js
//   - variants:  lodash.core.js, handlebars.runtime.js, highlight.pack.js, bootstrap.bundle.js
// Only the basename is tested; a directory named after a library does NOT match.
const KNOWN_LIBRARY_FILE_PATTERN =
  /^(?:backbone|bluebird|chartjs|codemirror|dompurify|handlebars|highlight|jquery|knockout|lodash|marked|modernizr|moment|mootools|punycode|purify|requirejs|semver|sprintf|three|underscore|xregexp)(?:[-.](?:v?\d[\w.]*|r\d[\w.]*|min|bundle|core|slim|pack|runtime|umd|esm|cjs|full|debug|all|custom))*\.js$/i;

/**
 * Checks whether a file path contains a vendor directory segment or has a well-known library filename.
 *
 * @param filePath the file path to test.
 * @returns true when the path includes a vendor directory or the filename matches a known library distribution.
 */
export function isVendorFile(filePath: string): boolean {
  const segments = normalizePath(filePath).split('/');
  const basename = segments[segments.length - 1] ?? '';
  return (
    segments.some(s => VENDOR_DIRECTORY_NAMES.has(s.toLowerCase())) ||
    KNOWN_LIBRARY_FILE_PATTERN.test(basename)
  );
}
