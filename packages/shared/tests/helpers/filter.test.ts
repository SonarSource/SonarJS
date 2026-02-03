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
import {
  accept,
  acceptSnippet,
  shouldIgnoreFile,
  type ShouldIgnoreFileParams,
} from '../../src/helpers/filter/filter.js';
import { createConfiguration, type Configuration } from '../../src/helpers/configuration.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { join } from 'node:path/posix';
import { normalizePath, normalizeToAbsolutePath, readFile } from '../../src/helpers/files.js';

const BUNDLE_CONTENTS = '/* jQuery JavaScript Library v1.4.3*/(function(';
const baseDir = join(normalizePath(import.meta.dirname), 'fixtures');

/** Extract ShouldIgnoreFileParams from Configuration */
function getShouldIgnoreParams(config: Configuration): ShouldIgnoreFileParams {
  return {
    jsTsExclusions: config.jsTsExclusions,
    detectBundles: config.detectBundles,
    maxFileSize: config.maxFileSize,
    jsSuffixes: config.jsSuffixes,
    tsSuffixes: config.tsSuffixes,
    cssSuffixes: config.cssSuffixes,
  };
}

describe('filter.ts', () => {
  describe('accept', () => {
    it('should accept JS/TS file when all filters pass with bundle detection enabled', () => {
      const config = createConfiguration({ baseDir });
      const params = getShouldIgnoreParams(config);
      const result = accept(normalizeToAbsolutePath('file.js'), 'content', params);

      expect(result).toBe(true);
    });

    it('should accept JS/TS file when bundle detection is disabled', () => {
      const config = createConfiguration({ baseDir, detectBundles: false });
      const params = getShouldIgnoreParams(config);
      const result = accept(normalizeToAbsolutePath('/project/file.js'), BUNDLE_CONTENTS, params);

      expect(result).toBe(true);
    });

    it('should reject JS/TS file when it fails bundle filter', () => {
      const config = createConfiguration({ baseDir });
      const params = getShouldIgnoreParams(config);
      const result = accept(normalizeToAbsolutePath('/project/file.js'), BUNDLE_CONTENTS, params);

      expect(result).toBe(false);
    });

    it('should reject JS/TS file when it fails minified filter', () => {
      const config = createConfiguration({ baseDir });
      const params = getShouldIgnoreParams(config);
      const result = accept(normalizeToAbsolutePath('/project/file.min.js'), 'contents', params);

      expect(result).toBe(false);
    });

    it('should reject JS/TS file when it fails size filter', () => {
      const config = createConfiguration({ baseDir, maxFileSize: 0 });
      const params = getShouldIgnoreParams(config);
      const result = accept(normalizeToAbsolutePath('/project/file.js'), 'content', params);

      expect(result).toBe(false);
    });

    it('should accept CSS file when all filters pass', () => {
      const config = createConfiguration({ baseDir });
      const params = getShouldIgnoreParams(config);
      const result = accept(normalizeToAbsolutePath('/project/file.css'), '{}', params);

      expect(result).toBe(true);
    });

    it('should reject CSS file when it fails minified filter', () => {
      const config = createConfiguration({ baseDir, detectBundles: false });
      const params = getShouldIgnoreParams(config);
      const result = accept(normalizeToAbsolutePath('file.min.css'), 'content', params);

      expect(result).toBe(false);
    });

    it('should accept file that is neither JS/TS nor CSS', () => {
      const config = createConfiguration({ baseDir });
      const params = getShouldIgnoreParams(config);
      const result = accept(normalizeToAbsolutePath('file.txt'), 'content', params);

      expect(result).toBe(true);
    });
  });

  describe('shouldIgnoreFile', () => {
    it('should ignore file when it is excluded by JS/TS exclusions', async () => {
      const config = createConfiguration({ baseDir, jsTsExclusions: ['file.js'] });
      const params = getShouldIgnoreParams(config);
      const filePath = normalizeToAbsolutePath(join(baseDir, 'file.js'));
      const fileContent = await readFile(filePath);
      const result = await shouldIgnoreFile({ filePath, fileContent }, params);

      expect(result).toBe(true);
    });

    it('should ignore file when it does not pass accept checks', async () => {
      const config = createConfiguration({ baseDir });
      const params = getShouldIgnoreParams(config);
      const result = await shouldIgnoreFile(
        {
          filePath: normalizeToAbsolutePath(join(baseDir, 'file.min.js')),
          fileContent: 'content',
        },
        params,
      );

      expect(result).toBe(true);
    });

    it('should not ignore file when it passes all checks', async () => {
      const config = createConfiguration({ baseDir });
      const params = getShouldIgnoreParams(config);
      const filePath = normalizeToAbsolutePath(join(baseDir, 'file.js'));
      const fileContent = await readFile(filePath);
      const result = await shouldIgnoreFile({ filePath, fileContent }, params);

      expect(result).toBe(false);
    });

    it('should use provided file content', async () => {
      const config = createConfiguration({ baseDir });
      const params = getShouldIgnoreParams(config);
      const result = await shouldIgnoreFile(
        {
          filePath: normalizeToAbsolutePath(join(baseDir, 'file.js')),
          fileContent: 'provided content',
        },
        params,
      );

      expect(result).toBe(false);
    });
  });

  describe('acceptSnippet', () => {
    it('should accept normal code snippet', () => {
      const code = `
        function hello() {
          console.log('Hello, world!');
        }
      `;
      expect(acceptSnippet(code)).toBe(true);
    });

    it('should reject minified code snippet with excessive line length', () => {
      // Create a minified-looking code with very long line (>200 chars average)
      const minifiedCode = 'var a=' + 'x'.repeat(250) + ';';
      expect(acceptSnippet(minifiedCode)).toBe(false);
    });

    it('should accept code that looks minified but has reasonable line lengths', () => {
      const code = 'var a=1;var b=2;var c=3;\nvar d=4;var e=5;';
      expect(acceptSnippet(code)).toBe(true);
    });

    it('should accept code with bundle-like comment pattern (bundle detection not applied to snippets)', () => {
      // Bundle detection is not applied to snippets because it can produce false positives
      // on legitimate code patterns like IIFEs with comments
      const bundledCode = '/*! My Library v1.0.0 */!function(e,t){"use strict";}';
      expect(acceptSnippet(bundledCode)).toBe(true);
    });
  });
});
