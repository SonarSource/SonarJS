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
import { filterMinified, getAverageLineLength } from '../../src/helpers/filter/filter-minified.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { normalizeToAbsolutePath } from '../../src/helpers/files.js';

describe('filterMinified', () => {
  describe('file name detection', () => {
    it('should identify minified JS files by .min.js extension', () => {
      const result = filterMinified(normalizeToAbsolutePath('/script.min.js'), 'const a=1;');
      expect(result).toBeFalsy();
    });

    it('should identify minified JS files by -min.js extension', () => {
      const result = filterMinified(normalizeToAbsolutePath('/script-min.js'), 'const a=1;');
      expect(result).toBeFalsy();
    });

    it('should identify minified CSS files by .min.css extension', () => {
      const result = filterMinified(normalizeToAbsolutePath('/style.min.css'), 'body{margin:0}');
      expect(result).toBeFalsy();
    });

    it('should identify minified CSS files by -min.css extension', () => {
      const result = filterMinified(normalizeToAbsolutePath('/style-min.css'), 'body{margin:0}');
      expect(result).toBeFalsy();
    });

    it('should not identify regular JS files as minified by name', () => {
      const shortContent = 'const a = 1;\nconst b = 2;';
      const result = filterMinified(normalizeToAbsolutePath('/script.js'), shortContent);
      expect(result).toBeTruthy();
    });

    it('should not identify regular CSS files as minified by name', () => {
      const shortContent = 'body {\n  margin: 0;\n}';
      const result = filterMinified(normalizeToAbsolutePath('/style.css'), shortContent);
      expect(result).toBeTruthy();
    });
  });

  describe('content line length detection', () => {
    it('should identify JS files with excessive line lengths as minified', () => {
      // Create a long line that exceeds the threshold
      const longLine = 'const a = ' + 'x'.repeat(300) + ';';
      const result = filterMinified(normalizeToAbsolutePath('/script.js'), longLine);
      expect(result).toBeFalsy();
    });

    it('should identify CSS files with excessive line lengths as minified', () => {
      // Create a long line that exceeds the threshold
      const longLine = 'body { ' + 'padding:0;'.repeat(50) + ' }';
      const result = filterMinified(normalizeToAbsolutePath('/style.css'), longLine);
      expect(result).toBeFalsy();
    });

    it('should not identify files with normal line lengths as minified', () => {
      const normalContent =
        'function test() {\n  console.log("This is a normal line");\n  return true;\n}';
      const result = filterMinified(normalizeToAbsolutePath('/script.js'), normalContent);
      expect(result).toBeTruthy();
    });

    it('should calculate average line length correctly with empty last line', () => {
      // Content with a trailing newline (empty last line)
      expect(getAverageLineLength('line1\nline2\nline3\n')).toEqual(
        getAverageLineLength('line1\nline2\nline3'),
      );
    });
  });

  it('should not apply line length checks to non-minifiable files', () => {
    const longLine = 'a'.repeat(300);
    const result = filterMinified(normalizeToAbsolutePath('/file.ts'), longLine);
    expect(result).toBeTruthy();
  });

  it('should handle empty files correctly', () => {
    const result = filterMinified(normalizeToAbsolutePath('/script.js'), '');
    expect(result).toBeTruthy();
  });

  it('should handle files with only newlines correctly', () => {
    const result = filterMinified(normalizeToAbsolutePath('/script.js'), '\n\n\n');
    expect(result).toBeTruthy();
  });
});
