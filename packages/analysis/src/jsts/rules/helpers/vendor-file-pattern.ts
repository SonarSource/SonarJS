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

// Basenames of widely-used libraries as they appear when vendored into a project.
// Patterns derived from each library's actual npm dist contents (verified via unpkg/jsDelivr):
//   - bare:      jquery.js, lodash.js, moment.js
//   - minified:  jquery.min.js, lodash.min.js, bluebird.min.js
//   - versioned: jquery-3.7.1.min.js, moment-2.29.4.js (semver prefix)
//   - r-release: three.r128.min.js (legacy Three.js ≤ r160)
//   - variants:  handlebars.runtime.js, handlebars.amd.js, handlebars.runtime.amd.js,
//                bluebird.core.min.js, highlight.pack.js (v9), highlight.min.js (v10+),
//                three.module.min.js, three.webgpu.js, three.webgpu.nodes.min.js
// Only the basename is tested; a directory named after a library does NOT match.
const KNOWN_LIBRARY_NAMES = new Set([
  'backbone',
  'bluebird',
  'chartjs',
  'codemirror',
  'dompurify',
  'handlebars',
  'highlight',
  'jquery',
  'knockout',
  'lodash',
  'marked',
  'modernizr',
  'moment',
  'mootools',
  'punycode',
  'purify',
  'requirejs',
  'semver',
  'sprintf',
  'three',
  'underscore',
  'xregexp',
]);

const JS_EXTENSION = '.js';

// Named build variants that appear as tokens between '-' / '.' in library dist filenames.
const LIBRARY_SUFFIX_KEYWORDS = new Set([
  'amd', 'all', 'bundle', 'core', 'cjs', 'custom', 'debug', 'esm', 'full',
  'global', 'min', 'module', 'nodes', 'pack', 'prod', 'runtime', 'slim',
  'tsl', 'umd', 'webgpu',
]);

// A single suffix token that encodes a version number: semver-style (3, 3.7, 3.7.1)
// or Three.js r-release style (r128).
const VERSION_TOKEN = /^(?:v?\d\w*|r\d\w*)$/i;

function isKnownLibraryFile(basename: string): boolean {
  const lower = basename.toLowerCase();
  for (const name of KNOWN_LIBRARY_NAMES) {
    if (!lower.startsWith(name)) {
      continue;
    }
    const suffix = basename.slice(name.length);
    if (!suffix.endsWith(JS_EXTENSION)) {
      continue;
    }
    // Every '-'/'.' separated token between the name and '.js' must be a known keyword or version.
    const tokens = suffix.slice(0, -JS_EXTENSION.length).split(/[-.]/).filter(Boolean);
    if (tokens.every(t => LIBRARY_SUFFIX_KEYWORDS.has(t.toLowerCase()) || VERSION_TOKEN.test(t))) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether a file path contains a vendor directory segment or has a well-known library filename.
 *
 * @param filePath the file path to test.
 * @returns true when the path includes a vendor directory or the filename matches a known library distribution.
 */
export function isVendorFile(filePath: string): boolean {
  if (!filePath) {
    return false;
  }
  const segments = normalizePath(filePath).split('/');
  const basename = segments.at(-1) ?? '';
  return (
    segments.some(s => VENDOR_DIRECTORY_NAMES.has(s.toLowerCase())) ||
    isKnownLibraryFile(basename)
  );
}
