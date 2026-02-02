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
import { describe, test } from 'node:test';
import { expect } from 'expect';
import {
  stripBOM,
  normalizePath,
  normalizeToAbsolutePath,
  isRoot,
  isAbsolutePath,
  ROOT_PATH,
  dirnamePath,
  joinPaths,
  basenamePath,
  type NormalizedAbsolutePath,
  type NormalizedPath,
} from '../../../src/rules/helpers/files.js';

describe('files', () => {
  describe('stripBOM', () => {
    test('should remove BOM from string', () => {
      const withBOM = '\uFEFFhello';
      expect(stripBOM(withBOM)).toEqual('hello');
    });

    test('should return string unchanged if no BOM', () => {
      const noBOM = 'hello';
      expect(stripBOM(noBOM)).toEqual('hello');
    });

    test('should handle empty string', () => {
      expect(stripBOM('')).toEqual('');
    });
  });

  describe('isAbsolutePath', () => {
    test('should recognize Unix absolute paths', () => {
      expect(isAbsolutePath('/')).toBe(true);
      expect(isAbsolutePath('/foo')).toBe(true);
      expect(isAbsolutePath('/foo/bar')).toBe(true);
    });

    test('should recognize Windows absolute paths', () => {
      expect(isAbsolutePath('c:')).toBe(true);
      expect(isAbsolutePath('c:\\')).toBe(true);
      expect(isAbsolutePath('c:/')).toBe(true);
      expect(isAbsolutePath('C:\\foo')).toBe(true);
      expect(isAbsolutePath('D:/bar')).toBe(true);
    });

    test('should recognize UNC paths', () => {
      expect(isAbsolutePath('\\\\server\\share')).toBe(true);
      expect(isAbsolutePath('//server/share')).toBe(true);
    });

    test('should reject relative paths', () => {
      expect(isAbsolutePath('foo')).toBe(false);
      expect(isAbsolutePath('foo/bar')).toBe(false);
      expect(isAbsolutePath('foo\\bar')).toBe(false);
      expect(isAbsolutePath('./foo')).toBe(false);
      expect(isAbsolutePath('../foo')).toBe(false);
      expect(isAbsolutePath('.\\foo')).toBe(false);
      expect(isAbsolutePath('..\\foo')).toBe(false);
    });

    test('should reject empty string', () => {
      expect(isAbsolutePath('')).toBe(false);
    });
  });

  describe('normalizePath', () => {
    test('should convert backslashes to forward slashes for relative paths', () => {
      expect(normalizePath('foo\\bar\\baz')).toEqual('foo/bar/baz');
    });

    test('should collapse multiple slashes for relative paths', () => {
      expect(normalizePath('foo//bar///baz')).toEqual('foo/bar/baz');
      expect(normalizePath('foo\\\\bar\\\\\\baz')).toEqual('foo/bar/baz');
    });

    test('should handle mixed slashes for relative paths', () => {
      expect(normalizePath('foo/bar\\baz')).toEqual('foo/bar/baz');
    });

    test('should preserve relative path prefixes', () => {
      expect(normalizePath('./foo')).toEqual('./foo');
      expect(normalizePath('../foo')).toEqual('../foo');
      expect(normalizePath('.\\foo')).toEqual('./foo');
      expect(normalizePath('..\\foo')).toEqual('../foo');
      expect(normalizePath('./foo\\bar')).toEqual('./foo/bar');
      expect(normalizePath('..\\foo/bar')).toEqual('../foo/bar');
    });

    test('should add drive letter for Unix absolute paths on Windows', () => {
      // On Windows, Unix-style paths like /foo are resolved to add the current drive
      if (process.platform === 'win32') {
        expect(normalizePath('/foo/bar')).toMatch(/^[A-Z]:\/foo\/bar$/);
      } else {
        // On Linux, Unix-style paths are kept as-is
        expect(normalizePath('/foo/bar')).toEqual('/foo/bar');
      }
    });

    test('should handle Windows backslash paths', () => {
      if (process.platform === 'win32') {
        // On Windows, backslash paths are resolved to add drive letter
        expect(normalizePath('\\foo\\bar')).toMatch(/^[A-Z]:\/foo\/bar$/);
      } else {
        // On Linux, just convert slashes
        expect(normalizePath('\\foo\\bar')).toEqual('/foo/bar');
      }
    });

    test('should handle paths with drive letter', () => {
      if (process.platform === 'win32') {
        // On Windows, drive letter is preserved and path is resolved
        expect(normalizePath('c:/foo/bar')).toEqual('c:/foo/bar');
        expect(normalizePath('C:\\foo\\bar')).toEqual('C:/foo/bar');
        expect(normalizePath('D:/bar')).toEqual('D:/bar');
        expect(normalizePath('D:\\')).toEqual('D:/');
      } else {
        // On Linux, just convert slashes (drive letter becomes part of the path)
        // Analysis on a project using absolute windows paths will fail, this is not supported
        expect(normalizePath('c:/foo/bar')).toEqual('c:/foo/bar');
        expect(normalizePath('C:\\foo\\bar')).toEqual('C:/foo/bar');
        expect(normalizePath('D:/bar')).toEqual('D:/bar');
        expect(normalizePath('D:\\')).toEqual('D:/');
      }
    });

    test('should handle drive letter only', () => {
      if (process.platform === 'win32') {
        // On Windows, drive letter is resolved to current directory on that drive
        expect(normalizePath('c:')).toMatch(/^c:\/.*$/);
        expect(normalizePath('D:')).toMatch(/^D:\/.*$/);
      } else {
        // On Linux, just convert (no resolution)
        expect(normalizePath('c:')).toEqual('c:');
        expect(normalizePath('D:')).toEqual('D:');
      }
    });
  });

  describe('normalizeToAbsolutePath', () => {
    test('should convert relative paths to absolute', () => {
      const result = normalizeToAbsolutePath('foo/bar');
      expect(isAbsolutePath(result)).toBe(true);
      expect(result).toContain('foo/bar');
    });

    test('should preserve absolute paths', () => {
      if (process.platform === 'win32') {
        expect(normalizeToAbsolutePath('C:/foo/bar')).toEqual('C:/foo/bar');
        expect(normalizeToAbsolutePath('C:\\foo\\bar')).toEqual('C:/foo/bar');
      } else {
        expect(normalizeToAbsolutePath('/foo/bar')).toEqual('/foo/bar');
      }
    });

    test('should convert backslashes to forward slashes', () => {
      const result = normalizeToAbsolutePath('foo\\bar');
      expect(result).not.toContain('\\');
      expect(result).toContain('foo/bar');
    });

    test('should resolve relative paths against baseDir', () => {
      const baseDir = '/projects/myapp' as NormalizedAbsolutePath;
      const result = normalizeToAbsolutePath('src/index.ts', baseDir);
      if (process.platform === 'win32') {
        // On Windows, resolveWin32 adds drive letter
        expect(result).toMatch(/^[A-Z]:\/projects\/myapp\/src\/index\.ts$/);
      } else {
        expect(result).toEqual('/projects/myapp/src/index.ts');
      }
    });

    test('should handle paths with special characters', () => {
      const result = normalizeToAbsolutePath('foo bar/baz');
      expect(result).toContain('foo bar/baz');
    });

    test('should be idempotent for already normalized absolute paths', () => {
      if (process.platform === 'win32') {
        const path = 'C:/foo/bar/baz.ts';
        expect(normalizeToAbsolutePath(path)).toEqual(normalizeToAbsolutePath(path));
      } else {
        const path = '/foo/bar/baz.ts';
        expect(normalizeToAbsolutePath(path)).toEqual('/foo/bar/baz.ts');
        expect(normalizeToAbsolutePath(normalizeToAbsolutePath(path))).toEqual('/foo/bar/baz.ts');
      }
    });
  });

  describe('ROOT_PATH', () => {
    test('should be a forward slash', () => {
      expect(ROOT_PATH).toEqual('/');
    });
  });

  describe('dirnamePath', () => {
    test('should return parent directory of absolute path', () => {
      const path = '/foo/bar/baz.ts' as NormalizedAbsolutePath;
      expect(dirnamePath(path)).toEqual('/foo/bar');
    });

    test('should return root for top-level file', () => {
      const path = '/file.ts' as NormalizedAbsolutePath;
      expect(dirnamePath(path)).toEqual('/');
    });

    test('should handle Windows-style paths (normalized)', () => {
      const path = 'C:/Users/foo/bar.ts' as NormalizedAbsolutePath;
      expect(dirnamePath(path)).toEqual('C:/Users/foo');
    });

    test('should preserve branded type', () => {
      const path = '/foo/bar/baz.ts' as NormalizedAbsolutePath;
      const result: NormalizedAbsolutePath = dirnamePath(path);
      expect(result).toEqual('/foo/bar');
    });
  });

  describe('joinPaths', () => {
    test('should join base path with segments', () => {
      const base = '/foo' as NormalizedAbsolutePath;
      expect(joinPaths(base, 'bar', 'baz.ts')).toEqual('/foo/bar/baz.ts');
    });

    test('should handle single segment', () => {
      const base = '/foo' as NormalizedAbsolutePath;
      expect(joinPaths(base, 'bar.ts')).toEqual('/foo/bar.ts');
    });

    test('should handle Windows-style base (normalized)', () => {
      const base = 'C:/Users' as NormalizedAbsolutePath;
      expect(joinPaths(base, 'foo', 'bar.ts')).toEqual('C:/Users/foo/bar.ts');
    });

    test('should preserve branded type', () => {
      const base = '/foo' as NormalizedAbsolutePath;
      const result: NormalizedAbsolutePath = joinPaths(base, 'bar');
      expect(result).toEqual('/foo/bar');
    });

    test('should handle no additional segments', () => {
      const base = '/foo' as NormalizedAbsolutePath;
      expect(joinPaths(base)).toEqual('/foo');
    });
  });

  describe('basenamePath', () => {
    test('should return filename from path', () => {
      const path = '/foo/bar/baz.ts' as NormalizedPath;
      expect(basenamePath(path)).toEqual('baz.ts');
    });

    test('should handle path without extension', () => {
      const path = '/foo/bar/baz' as NormalizedPath;
      expect(basenamePath(path)).toEqual('baz');
    });

    test('should handle Windows-style path (normalized)', () => {
      const path = 'C:/Users/foo/bar.ts' as NormalizedPath;
      expect(basenamePath(path)).toEqual('bar.ts');
    });

    test('should return empty string for root', () => {
      const path = '/' as NormalizedPath;
      expect(basenamePath(path)).toEqual('');
    });
  });

  describe('isRoot', () => {
    test('should return true for Unix root', () => {
      expect(isRoot('/')).toBe(true);
    });

    test('should return true for Windows drive roots', () => {
      expect(isRoot('c:')).toBe(true);
      expect(isRoot('c:\\')).toBe(true);
      expect(isRoot('c:/')).toBe(true);
      expect(isRoot('C:')).toBe(true);
      expect(isRoot('C:\\')).toBe(true);
      expect(isRoot('C:/')).toBe(true);
      expect(isRoot('D:')).toBe(true);
      expect(isRoot('D:\\')).toBe(true);
    });

    test('should return true for Windows backslash root', () => {
      expect(isRoot('\\')).toBe(true);
      expect(isRoot('\\\\')).toBe(true);
    });

    test('should return true for UNC path roots', () => {
      expect(isRoot('\\\\server\\share')).toBe(true);
    });

    test('should return false for non-root paths', () => {
      expect(isRoot('c:\\foo')).toBe(false);
      expect(isRoot('c:/foo')).toBe(false);
      expect(isRoot('C:\\Users\\foo')).toBe(false);
      expect(isRoot('D:/Projects/bar')).toBe(false);
      expect(isRoot('/foo')).toBe(false);
      expect(isRoot('/foo/bar')).toBe(false);
      expect(isRoot('\\\\server\\share\\folder')).toBe(false);
    });

    test('should return false for relative paths', () => {
      expect(isRoot('foo')).toBe(false);
      expect(isRoot('foo/bar')).toBe(false);
      expect(isRoot('foo\\bar')).toBe(false);
      expect(isRoot('./foo')).toBe(false);
      expect(isRoot('../foo')).toBe(false);
      expect(isRoot('.\\foo')).toBe(false);
      expect(isRoot('..\\foo')).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(isRoot('')).toBe(false);
    });
  });
});
