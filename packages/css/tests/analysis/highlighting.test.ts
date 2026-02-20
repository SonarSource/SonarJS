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
import postcssScss from 'postcss-scss';
import postcssLess from 'postcss-less';
import { computeHighlighting } from '../../src/analysis/highlighting.js';
import type { CssSyntaxHighlight } from '../../src/analysis/analysis.js';

function highlightsOf(css: string, syntax?: object): CssSyntaxHighlight[] {
  const root = syntax
    ? postcss.parse(css, { syntax } as postcss.ProcessOptions)
    : postcss.parse(css);
  return computeHighlighting(root, css);
}

function findHighlight(
  highlights: CssSyntaxHighlight[],
  textType: string,
  line?: number,
): CssSyntaxHighlight | undefined {
  return highlights.find(
    h => h.textType === textType && (line == null || h.location.startLine === line),
  );
}

function findAllHighlights(
  highlights: CssSyntaxHighlight[],
  textType: string,
): CssSyntaxHighlight[] {
  return highlights.filter(h => h.textType === textType);
}

describe('computeHighlighting', () => {
  it('empty input produces no highlights', () => {
    expect(highlightsOf('')).toEqual([]);
  });

  describe('COMMENT', () => {
    it('block comment', () => {
      const h = highlightsOf('/* some comment */');
      const comment = findHighlight(h, 'COMMENT');
      expect(comment).toBeDefined();
      expect(comment!.location.startLine).toBe(1);
      expect(comment!.location.endLine).toBe(1);
    });

    it('multi-line block comment', () => {
      const css = '/* some comment\nmultiline */';
      const h = highlightsOf(css);
      const comment = findHighlight(h, 'COMMENT');
      expect(comment).toBeDefined();
      expect(comment!.location.startLine).toBe(1);
      expect(comment!.location.endLine).toBe(2);
    });
  });

  describe('ANNOTATION (at-rules)', () => {
    it('@rule name', () => {
      const h = highlightsOf('@media screen { }');
      const ann = findHighlight(h, 'ANNOTATION');
      expect(ann).toBeDefined();
      expect(ann!.location.startLine).toBe(1);
    });

    it('@import', () => {
      const h = highlightsOf('@import "src/themes";');
      const ann = findHighlight(h, 'ANNOTATION');
      expect(ann).toBeDefined();
    });

    it('SCSS @each directive', () => {
      const h = highlightsOf('@each $name in save cancel { }', postcssScss);
      const ann = findHighlight(h, 'ANNOTATION');
      expect(ann).toBeDefined();
    });

    it('SCSS @if directive', () => {
      const h = highlightsOf('@if ($debug) { }', postcssScss);
      const ann = findHighlight(h, 'ANNOTATION');
      expect(ann).toBeDefined();
    });

    it('LESS variable as @identifier', () => {
      const h = highlightsOf('@nice-blue: #5B83AD;', postcssLess);
      const ann = findHighlight(h, 'ANNOTATION');
      expect(ann).toBeDefined();
    });
  });

  describe('KEYWORD_LIGHT (property names)', () => {
    it('simple property', () => {
      const h = highlightsOf('a { color: red; }');
      const kl = findHighlight(h, 'KEYWORD_LIGHT');
      expect(kl).toBeDefined();
      expect(kl!.location.startLine).toBe(1);
    });

    it('hyphenated property', () => {
      const h = highlightsOf('a { font-size: 12px; }');
      const kl = findHighlight(h, 'KEYWORD_LIGHT');
      expect(kl).toBeDefined();
    });
  });

  describe('KEYWORD (SCSS $ variables and ID selectors)', () => {
    it('SCSS variable declaration', () => {
      const h = highlightsOf('$font-stack: Helvetica;', postcssScss);
      const kw = findHighlight(h, 'KEYWORD');
      expect(kw).toBeDefined();
    });

    it('ID selector #header', () => {
      const h = highlightsOf('#header { color: red; }');
      const kw = findHighlight(h, 'KEYWORD');
      expect(kw).toBeDefined();
    });
  });

  describe('CONSTANT (hex colors in selectors)', () => {
    it('hex color #ddd in selector context is CONSTANT', () => {
      const h = highlightsOf('#ddd { }');
      const c = findHighlight(h, 'CONSTANT');
      expect(c).toBeDefined();
    });

    it('#header is KEYWORD not CONSTANT', () => {
      const h = highlightsOf('#header { }');
      expect(findHighlight(h, 'KEYWORD')).toBeDefined();
      expect(findHighlight(h, 'CONSTANT')).toBeUndefined();
    });
  });

  describe('STRING (quoted values)', () => {
    it('double-quoted string in value', () => {
      const h = highlightsOf('a { content: "hello"; }');
      const str = findHighlight(h, 'STRING');
      expect(str).toBeDefined();
    });

    it('single-quoted string in value', () => {
      const h = highlightsOf("a { content: 'world'; }");
      const str = findHighlight(h, 'STRING');
      expect(str).toBeDefined();
    });
  });

  describe('CONSTANT (numeric values)', () => {
    it('integer', () => {
      const h = highlightsOf('a { width: 1px; }');
      const c = findHighlight(h, 'CONSTANT');
      expect(c).toBeDefined();
    });

    it('decimal', () => {
      const h = highlightsOf('a { opacity: 0.5; }');
      const c = findHighlight(h, 'CONSTANT');
      expect(c).toBeDefined();
    });

    it('percentage', () => {
      const h = highlightsOf('a { width: 100%; }');
      const c = findHighlight(h, 'CONSTANT');
      expect(c).toBeDefined();
    });

    it('zero with unit', () => {
      const h = highlightsOf('a { margin: 0px; }');
      const c = findHighlight(h, 'CONSTANT');
      expect(c).toBeDefined();
    });
  });

  describe('mixed highlighting', () => {
    it('real-world CSS produces multiple highlight types', () => {
      const css = `/* Header styles */
a {
  color: red;
  font-size: 12px;
  content: "hello";
}`;
      const h = highlightsOf(css);
      expect(findAllHighlights(h, 'COMMENT').length).toBeGreaterThan(0);
      expect(findAllHighlights(h, 'KEYWORD_LIGHT').length).toBeGreaterThan(0);
      expect(findAllHighlights(h, 'CONSTANT').length).toBeGreaterThan(0);
      expect(findAllHighlights(h, 'STRING').length).toBeGreaterThan(0);
    });
  });
});
