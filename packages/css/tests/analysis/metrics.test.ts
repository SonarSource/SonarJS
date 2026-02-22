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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import postcss from 'postcss';
import { computeMetrics } from '../../src/analysis/metrics.js';

function metricsOf(css: string) {
  return computeMetrics(postcss.parse(css));
}

describe('computeMetrics', () => {
  describe('lines of code', () => {
    it('single line of code', () => {
      expect(metricsOf('bar { }').ncloc).toEqual([1]);
    });

    it('multi-line code', () => {
      expect(metricsOf('bar\n{ }').ncloc).toEqual([1, 2]);
    });

    it('should not count empty lines', () => {
      expect(metricsOf('\n\n\nsomething {}\n\n\n').ncloc).toEqual([4]);
    });

    it('should not count comment-only lines', () => {
      expect(metricsOf('/* foo */').ncloc).toEqual([]);
    });

    it('should not count single-line comment', () => {
      // PostCSS default parser doesn't handle //, but the metric should still work
      expect(metricsOf('/* dasdsa */').ncloc).toEqual([]);
    });

    it('should not count multi-line comment', () => {
      expect(metricsOf('/* das\ndsa */').ncloc).toEqual([]);
    });

    it('mixed code and comment on same line', () => {
      // Old CssMetricSensor counted this as 1 line of code
      expect(metricsOf('foo {} /* some comment */').ncloc).toEqual([1]);
    });
  });

  describe('lines of comment', () => {
    it('single-line block comment', () => {
      expect(metricsOf('/* single line comment */').commentLines).toEqual([1]);
    });

    it('multi-line block comment', () => {
      expect(metricsOf('/* multiline\n *\n *\n * comment\n*/').commentLines).toEqual([
        1, 2, 3, 4, 5,
      ]);
    });

    it('should not count empty lines', () => {
      expect(metricsOf('\n\n\n/* something */\n\n\n').commentLines).toEqual([4]);
    });

    it('should not count code-only lines', () => {
      expect(metricsOf('foo {}').commentLines).toEqual([]);
    });

    it('mixed code and comment counts in BOTH metrics', () => {
      // Old CssMetricSensor behavior: mixed lines counted in both ncloc and commentLines
      const m = metricsOf('foo {} /* some comment */');
      expect(m.ncloc).toEqual([1]);
      expect(m.commentLines).toEqual([1]);
    });
  });

  describe('nosonar', () => {
    it('should detect NOSONAR comments', () => {
      expect(metricsOf('/* NOSONAR */').nosonarLines).toEqual([1]);
    });

    it('should not detect absent NOSONAR', () => {
      expect(metricsOf('/* just a comment */').nosonarLines).toEqual([]);
    });
  });

  describe('default zero metrics', () => {
    it('should return zero for JS/TS-only metrics', () => {
      const m = metricsOf('a { color: red; }');
      expect(m.functions).toBe(0);
      expect(m.statements).toBe(0);
      expect(m.classes).toBe(0);
      expect(m.complexity).toBe(0);
      expect(m.cognitiveComplexity).toBe(0);
      expect(m.executableLines).toEqual([]);
    });
  });
});
