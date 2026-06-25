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
import assert from 'node:assert';
import path from 'node:path';
import { describe, it } from 'node:test';
import { isVendorFile } from './vendor-file-pattern.js';

describe('isVendorFile', () => {
  it('should recognize vendor directory segments', () => {
    const vendorPaths = [
      path.join('project', 'vendor', 'library.js'),
      path.join('project', 'vendors', 'library.js'),
      path.join('project', 'external', 'library.js'),
      path.join('project', 'externals', 'library.js'),
      path.join('project', 'contrib', 'library.js'),
      path.join('project', 'third-party', 'library.js'),
      path.join('project', 'thirdparty', 'library.js'),
      String.raw`C:\project\vendor\library.js`,
      'project/Third-Party/library.js',
    ];

    for (const filePath of vendorPaths) {
      assert.ok(isVendorFile(filePath), filePath);
    }
  });

  it('should recognize well-known library distribution filenames', () => {
    const libraryFilePaths = [
      // bare name — jquery, lodash, moment, ...
      path.join('app', 'js', 'jquery.js'),
      path.join('app', 'js', 'jQuery.js'),           // case-insensitive
      path.join('app', 'js', 'lodash.js'),
      path.join('app', 'js', 'moment.js'),
      path.join('app', 'js', 'backbone.js'),
      // .min.js — standard minified distribution
      path.join('app', 'js', 'jquery.min.js'),
      path.join('app', 'js', 'lodash.min.js'),
      path.join('app', 'js', 'underscore.min.js'),
      // versioned — {name}-{semver}.js / {name}-{semver}.min.js
      path.join('app', 'js', 'jquery-3.7.1.js'),
      path.join('app', 'js', 'jquery-3.7.1.min.js'),
      path.join('app', 'js', 'moment-2.29.4.min.js'),
      // Three.js: r{release} versioning used in legacy releases (≤ r160)
      path.join('app', 'js', 'three.r128.min.js'),
      // Three.js: module/webgpu variants in current releases (≥ r161, confirmed via unpkg)
      path.join('app', 'js', 'three.module.js'),
      path.join('app', 'js', 'three.module.min.js'),
      path.join('app', 'js', 'three.webgpu.js'),
      path.join('app', 'js', 'three.webgpu.nodes.min.js'),
      // library-specific variants (confirmed via CDN/unpkg)
      path.join('app', 'js', 'handlebars.runtime.js'),       // Handlebars runtime-only build
      path.join('app', 'js', 'handlebars.amd.js'),            // Handlebars AMD build
      path.join('app', 'js', 'handlebars.runtime.amd.min.js'), // Handlebars runtime+AMD
      path.join('app', 'js', 'highlight.pack.js'),            // Highlight.js v9 (renamed in v10)
      path.join('app', 'js', 'bluebird.core.min.js'),         // Bluebird core build
      // DOMPurify ships its dist as purify.js
      path.join('app', 'js', 'purify.js'),
      path.join('app', 'js', 'purify.min.js'),
      path.join('app', 'js', 'dompurify.js'),
      // ticket's motivating examples — vendored inside deeply nested paths
      path.join('src', 'vs', 'base', 'common', 'semver', 'semver.js'),
      path.join('src', 'vs', 'base', 'browser', 'dompurify', 'dompurify.js'),
    ];

    for (const filePath of libraryFilePaths) {
      assert.ok(isVendorFile(filePath), filePath);
    }
  });

  it('should not suppress a library directory when the file has a different name', () => {
    // A library analyzing its own source must not have all its files suppressed.
    const ownSourcePaths = [
      path.join('src', 'semver', 'index.js'),          // semver's own source: only semver.js is suppressed
      path.join('src', 'jquery', 'src', 'core.js'),    // jQuery's own source
      path.join('src', 'lodash', 'array', 'chunk.js'), // Lodash's own source
    ];

    for (const filePath of ownSourcePaths) {
      assert.ok(!isVendorFile(filePath), filePath);
    }
  });

  it('should ignore non-vendor paths and near misses', () => {
    const nonVendorPaths = [
      // plain source directories — never suppressed
      path.join('project', 'src', 'library.js'),
      path.join('project', 'lib', 'library.js'),
      path.join('project', 'libs', 'library.js'),
      path.join('project', 'assets', 'library.js'),
      path.join('project', 'static', 'library.js'),
      path.join('project', 'static-site', 'library.js'),
      path.join('project', 'vendors.ts'),
      path.join('project', 'third_party_tools', 'library.js'),
      // library name with an arbitrary suffix — not a library distribution file
      path.join('app', 'js', 'jquery-custom-plugin.js'),
      path.join('app', 'js', 'moment-utils.js'),
      path.join('app', 'js', 'lodash-fp.js'),
    ];

    for (const filePath of nonVendorPaths) {
      assert.ok(!isVendorFile(filePath), filePath);
    }
  });
});
