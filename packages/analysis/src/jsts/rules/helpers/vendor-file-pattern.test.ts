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
      path.join('project', 'asset', 'library.js'),
      path.join('project', 'assets', 'library.js'),
      path.join('project', 'static', 'library.js'),
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

  it('should ignore non-vendor paths and near misses', () => {
    const nonVendorPaths = [
      path.join('project', 'src', 'library.js'),
      path.join('project', 'lib', 'library.js'),
      path.join('project', 'libs', 'library.js'),
      path.join('project', 'static-site', 'library.js'),
      path.join('project', 'vendors.ts'),
      path.join('project', 'third_party_tools', 'library.js'),
    ];

    for (const filePath of nonVendorPaths) {
      assert.ok(!isVendorFile(filePath), filePath);
    }
  });
});
