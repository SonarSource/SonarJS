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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import postcss, { type Root, type Declaration } from 'postcss';
import { postcssSass } from '../../../src/css/linter/sass/index.js';
import { LinterWrapper } from '../../../src/css/linter/wrapper.js';
import { normalizeToAbsolutePath } from '../../../../shared/src/helpers/files.js';
import { computeHighlighting } from '../../../src/css/analysis/highlighting.js';
import { computeMetrics } from '../../../src/css/analysis/metrics.js';
import { extractSonarResolveCommentsFromCssRoot } from '../../../src/common/sonar-resolve.js';

const from = normalizeToAbsolutePath('/tmp/sonarjs-sass-parser/input.sass');
const parse = (code: string) => postcssSass.parse!(code, { from }) as Root;

describe('Sass syntax', () => {
  for (const code of [
    '@use "sass:math"\na\n  width: math.div(4, 2)\n',
    '@use "settings"\na\n  color: settings.$color\n  @include tools.rounded(2px)\n',
    '@include theme(foo) using ($material)\n  color: $material\n',
    '+theme(foo) using ($material)\n  color: $material\n',
    '@supports (display: grid)\n  a\n    display: grid\n',
    '@font-face\n  font-family: foo\n  src: url(foo.woff)\n',
    '@keyframes spin\n  0%, 50%\n    opacity: 0\n  100%\n    opacity: 1\n',
    '@-webkit-keyframes spin\n  from\n    opacity: 0\n  to\n    opacity: 1\n',
    '@each $x in red, blue\n  .#{$x}\n    color: $x\n',
    '=theme($x)\n  color: $x\na\n  +theme(red)\n',
    'a,\nb\n  color: red\n',
    'a, // first selector\nb, // second selector\nc\n  color: red\n',
    '// first  \r\n    continued  \r\n  \r\n    final\t \r\na\r\n  color: red\r\n',
    '// first  \n    continued  \n\n    final\t \na\n  color: red\n',
    '// first\n  continued\n// NOSONAR\na\n  color: red\n',
    'a\n  color:#ggg // invalid\n  margin:0\n',
    'a\n  font:\n    size: 12px\n',
    'a\n  font: 12px\n    family: serif\n',
    '$map: (red: #f00, blue: #00f)\na\n  color: map.get($map, red)\n',
    '// NOSONAR\n// sonar-resolve css:S125 "reason"\na\n  color: #fff\n',
    'a\r\n\tcolor: red\r\n',
    'a\r\n  content: "a\\\r\nb"\r\n',
    'a\n  color: red  \n\n',
    'a\n  color: red // original comment\n',
    'a\n  color: red; // original comment\n',
    '/* An indented comment\n   without a closing marker\na\n  color: red\n',
    '@charset "utf-8"\n\n$x: 1\n$y: 2\n\na\n  color: red\n',
    '@mixin selection\n  @if $x\n    &::selection\n      @content\n  @else\n    \\::selection\n      @content\n',
    'a\n  color: red;\n',
    '@use \"theme\" as *\na\n  width: 62.5%\n',
    'a\n  width: 1px + // sum\n    2px\n  color: red\n',
    'a\n  width: 1px +\n    2px\n',
    'a\n  color: red //\n',
    'a\n  +theme(red) // mixin comment\n',
    'a\n  background: url(//cdn.example/x.png)\n',
    'a\n  background: url(https://cdn.example/x.png)\n',
    'a // selector comment\n  color: red\n',
    '@if $x // branch comment\n  a\n    color: red\n',
    '$map: (\n  // explanation\n  color: red,\n)\n',
    '@function double($x)\n  @return $x * 2\n',
    '@for $i from 1 through 3\n  .item-#{$i}\n    width: $i * 1px\n',
    '@while $i < 2\n  $i: $i + 1\n',
    '@forward "theme" as theme-* hide private with ($color: red !default)\n',
    '%base\n  color: red\na\n  @extend %base !optional\n',
    'a\n  @at-root .b\n    color: red\n',
    'a\n  #{$prop}: red\n',
    'a\n  width: calc(\n    100% -\n    10px\n  )\n',
    'a\n  color: if(sass($x): red; else: blue)\n',
    'a\n  --foo: { color: red; }\n',
    'a\n  content: "a: b, \\"quoted\\""\n',
    '',
  ]) {
    it(`preserves source syntax: ${JSON.stringify(code)}`, async () => {
      const result = await postcss().process(code, { from, syntax: postcssSass });
      expect(result.css).toBe(code);
      result.root.walk(node => {
        expect(node.source?.input.css).toBe(code);
        expect(node.source?.start?.offset).toBeDefined();
        expect(node.source?.end?.offset).toBeDefined();
      });
    });
  }

  it('preserves declaration spelling and exposes standard PostCSS APIs', () => {
    const code = 'a\n  color: red\n  width: 1.00px\n  border: 1px solid #e2e2e2 !important\n';
    const root = parse(code);
    const declarations: Declaration[] = [];
    root.walkDecls(declaration => {
      declarations.push(declaration);
    });
    expect(declarations.map(({ prop, value, important }) => ({ prop, value, important }))).toEqual([
      { prop: 'color', value: 'red', important: undefined },
      { prop: 'width', value: '1.00px', important: undefined },
      { prop: 'border', value: '1px solid #e2e2e2', important: true },
    ]);
    expect(declarations[0]).toBeInstanceOf(postcss.Declaration);
    expect(declarations[0].clone().value).toBe('red');
    expect(declarations[0].source).toMatchObject({
      start: { line: 2, column: 3, offset: 4 },
      end: { line: 2, column: 12, offset: 14 },
    });
  });

  it('distinguishes compact declarations from pseudo selectors after indentation is known', () => {
    const root = parse(
      'a\n  color:#ggg // invalid\n  margin:0\n  opacity:.5\n  width:$size\n  font:12px\n    family: serif\n  &:hover\n    color: red\n  a:hover\n  color:red\n  #{$selector}:hover\n',
    );
    expect(root.first).toMatchObject({
      nodes: [
        { type: 'decl', prop: 'color', value: '#ggg' },
        { type: 'comment', text: 'invalid' },
        { type: 'decl', prop: 'margin', value: '0' },
        { type: 'decl', prop: 'opacity', value: '.5' },
        { type: 'decl', prop: 'width', value: '$size' },
        { type: 'decl', prop: 'font', nodes: [{ type: 'decl', prop: 'family', value: 'serif' }] },
        { type: 'rule', selector: '&:hover', nodes: [{ type: 'decl', prop: 'color' }] },
        { type: 'rule', selector: 'a:hover' },
        { type: 'rule', selector: 'color:red' },
        { type: 'rule', selector: '#{$selector}:hover' },
      ],
    });
  });

  it('keeps commented selector lists in one rule and exposes comment-free selector text', () => {
    const code = 'a, // first\nb, // second\nc\n  color: red\n';
    const root = parse(code);
    expect(root.nodes).toHaveLength(1);
    expect(root.first).toMatchObject({
      selector: 'a, \nb, \nc',
      nodes: [{ type: 'decl', prop: 'color', value: 'red' }],
    });
    expect(root.toString(postcssSass.stringify)).toBe(code);
  });

  for (const value of ['#ggg', '-1px']) {
    it(`keeps compact ${value} declarations with an indented comment as declarations`, () => {
      const code = `a\n  color:${value}\n    // child\n  margin:0\n`;
      const root = parse(code);
      expect(root.first).toMatchObject({
        nodes: [
          { type: 'decl', prop: 'color', value },
          { type: 'comment', text: 'child', source: { start: { line: 3, column: 5 } } },
          { type: 'decl', prop: 'margin', value: '0' },
        ],
      });
      expect(root.toString(postcssSass.stringify)).toBe(code);
    });

    it(`keeps compact ${value} declarations with comment-only children as declarations`, () => {
      const code = `a\n  color:${value} // trailing\n    // child\n  margin:0\n`;
      const root = parse(code);
      expect(root.first).toMatchObject({
        nodes: [
          { type: 'decl', prop: 'color', value, source: { start: { line: 2, column: 3 } } },
          { type: 'comment', text: 'trailing', source: { start: { line: 2 } } },
          { type: 'comment', text: 'child', source: { start: { line: 3, column: 5 } } },
          { type: 'decl', prop: 'margin', value: '0' },
        ],
      });
      expect(root.toString(postcssSass.stringify)).toBe(code);
    });
  }

  it('preserves continuation comment text, whitespace and suppression locations', () => {
    const code =
      '// first  \r\n    continued  \r\n  \r\n    final\t \r\n// NOSONAR\r\na\r\n  color: red\r\n';
    const root = parse(code);
    expect(root.first).toMatchObject({
      type: 'comment',
      text: 'first  \r\n    continued  \r\n  \r\n    final',
      source: { start: { line: 1, column: 1 }, end: { line: 4, column: 9 } },
    });
    expect(computeMetrics(root).nosonarLines).toEqual([5]);
    expect(root.toString(postcssSass.stringify)).toBe(code);
  });

  it('retains mixin calls and bodies as at-rules', () => {
    const root = parse('=theme($x)\n  color: $x\na\n  +theme(red)\n');
    expect(root.first).toMatchObject({ type: 'atrule', name: 'mixin', params: 'theme($x)' });
    expect(root.last).toMatchObject({
      type: 'rule',
      nodes: [{ type: 'atrule', name: 'include', params: 'theme(red)' }],
    });
  });

  it('keeps continued arithmetic inside one declaration', () => {
    const root = parse('a\n  width: 1px +\n    2px\n');
    expect(root.first).toMatchObject({
      nodes: [{ type: 'decl', prop: 'width', value: '1px +\n    2px' }],
    });
  });

  it('uses the at-rule header when shorthand metadata is not a string', () => {
    const root = parse('@include theme(red)\n');
    expect(root.first).toBeDefined();
    if (root.first) {
      root.first.raws.sassShorthand = {};
    }
    expect(root.toString(postcssSass.stringify)).toBe('@include theme(red)\n');
  });

  it('keeps shorthand mixin locations before trailing comments', () => {
    const root = parse('a\n  +theme(red) // mixin comment\n');
    expect(root.first).toMatchObject({
      nodes: [
        { type: 'atrule', name: 'include', source: { start: { line: 2, column: 3 } } },
        { type: 'comment', text: 'mixin comment', source: { start: { line: 2, column: 15 } } },
      ],
    });
  });

  it('represents nested properties with empty values as declarations', () => {
    const root = parse('a\n  font:\n    size: 12px\n');
    expect(root.first).toMatchObject({
      nodes: [
        {
          type: 'decl',
          prop: 'font',
          value: '',
          nodes: [{ type: 'decl', prop: 'size', value: '12px' }],
        },
      ],
    });
  });

  it('locates each conditional branch separately, including nested conditions', () => {
    const code =
      '@if $a\n  @if $b\n    a\n      color: red\n  @else\n    b\n      color: blue\n@else if $c\n  c\n    color: green\n@else\n  d\n    color: white\n';
    const root = parse(code);
    const branches: { name: string; line: number | undefined }[] = [];
    root.walkAtRules(rule => {
      branches.push({ name: rule.name, line: rule.source?.start?.line });
    });
    expect(branches).toEqual([
      { name: 'if', line: 1 },
      { name: 'if', line: 2 },
      { name: 'else', line: 5 },
      { name: 'else', line: 8 },
      { name: 'else', line: 11 },
    ]);
    expect(root.toString(postcssSass.stringify)).toBe(code);
  });

  it('preserves NOSONAR and sonar-resolve line numbers', () => {
    const root = parse('// NOSONAR\n// sonar-resolve css:S125 "reason"\na\n  color: #fff\n');
    expect(computeMetrics(root)).toEqual({
      ncloc: [3, 4],
      commentLines: [1, 2],
      nosonarLines: [1],
    });
    expect(extractSonarResolveCommentsFromCssRoot(root)).toEqual([
      { line: 2, text: 'sonar-resolve css:S125 "reason"' },
    ]);
  });

  it('retains charset statements and trailing declaration comments for metrics', () => {
    const root = parse('@charset "utf-8"\na\n  color: red // NOSONAR\n');
    expect(root.first).toMatchObject({ type: 'atrule', name: 'charset', params: '"utf-8"' });
    expect(computeMetrics(root)).toEqual({
      ncloc: [1, 2, 3],
      commentLines: [3],
      nosonarLines: [3],
    });
  });

  it('highlights original values and shorthand prefixes without extending their ranges', () => {
    const code = 'a\n  color: red\n  width: 1.00px\n  +theme(red)\n';
    expect(computeHighlighting(parse(code), code)).toEqual([
      { location: { startLine: 2, startCol: 2, endLine: 2, endCol: 7 }, textType: 'KEYWORD_LIGHT' },
      { location: { startLine: 3, startCol: 2, endLine: 3, endCol: 7 }, textType: 'KEYWORD_LIGHT' },
      { location: { startLine: 3, startCol: 9, endLine: 3, endCol: 15 }, textType: 'CONSTANT' },
      { location: { startLine: 4, startCol: 2, endLine: 4, endCol: 3 }, textType: 'ANNOTATION' },
    ]);
  });

  for (const code of [
    'a\n  color: red\n    blue\n',
    'a\n  color: ]\n',
    'a\n  width: ([)]\n',
    'a\n  color: "red\n',
    'a\n  width: (1px\n',
    'a\n    color: red\n  width: 1px\n',
    'a\n \tcolor: red\n',
    '@use "theme"\n  a\n    color: red\n',
    '  a\n    color: red\n',
  ]) {
    it(`rejects malformed statement structure: ${JSON.stringify(code)}`, () => {
      expect(() => parse(code)).toThrow(expect.objectContaining({ name: 'CssSyntaxError' }));
    });
  }

  it('reports invalid syntax as a located CssSyntaxError', () => {
    expect(() => parse('a\n  color: (\n')).toThrow(
      expect.objectContaining({
        name: 'CssSyntaxError',
        reason: 'expected ")".',
        line: 2,
        column: 11,
      }),
    );
  });

  it('maps header tokenizer errors back to the original source', () => {
    const code = 'a\n  color: red; ???\n';
    expect(() => parse(code)).toThrow(
      expect.objectContaining({
        name: 'CssSyntaxError',
        line: 2,
        column: 15,
        source: code,
        file: from,
      }),
    );
  });
});

describe('Stylelint with Sass syntax', () => {
  it('reports empty Sass rules within their original selector range', async () => {
    const linter = new LinterWrapper();
    linter.initialize([{ key: 'block-no-empty', configurations: [] }]);
    const code = 'a\n  :background-color #ace\n  :background url(http://example.com/image.png)\n';
    const { issues } = await linter.lint(from, code);
    expect(issues).toEqual([
      expect.objectContaining({
        ruleId: 'block-no-empty',
        line: 2,
        column: 23,
        endLine: 2,
        endColumn: 24,
      }),
      expect.objectContaining({
        ruleId: 'block-no-empty',
        line: 3,
        column: 46,
        endLine: 3,
        endColumn: 47,
      }),
    ]);
  });

  const rules = [
    'color-no-invalid-hex',
    'declaration-block-no-duplicate-properties',
    'keyframe-declaration-no-important',
  ].map(key => ({ key, configurations: [] }));

  it('keeps directives, mixin calls, data URLs and important annotations visible to the right rules', async () => {
    const linter = new LinterWrapper();
    linter.initialize(
      [
        'no-empty-source',
        'selector-type-no-unknown',
        'unit-no-unknown',
        'sonar/annotation-no-unknown',
        'sonar/declaration-no-important',
      ].map(key => ({ key, configurations: [] })),
    );
    expect((await linter.lint(from, '@use "theme"\n')).issues).toEqual([]);
    const { issues } = await linter.lint(
      from,
      '+theme\n  background-image: url(data:image/svg+xml,%3Csvg%20width%3D%2224%22%3E%3C/svg%3E)\n  margin: 0 !important\n',
    );
    expect(issues).toEqual([
      expect.objectContaining({ ruleId: 'sonar/declaration-no-important', line: 3 }),
    ]);
  });

  it('handles mixin scope, Sass import placement and interpolated calculations', async () => {
    const linter = new LinterWrapper();
    linter.initialize(
      [
        'nesting-selector-no-missing-scoping-root',
        'no-invalid-position-at-import-rule',
        'sonar/function-calc-no-invalid',
      ].map(key => ({ key, configurations: [] })),
    );
    const code =
      '=theme\n  &:hover\n    opacity: calc((#{$opacity} + #{map.get($states, "hover")}) * var(--multiplier))\na\n  +theme\n@import "other"\n';
    expect((await linter.lint(from, code)).issues).toEqual([]);
    expect(
      (
        await linter.lint(
          normalizeToAbsolutePath('/tmp/input.vue'),
          `<style lang="sass">\n${code}</style>`,
        )
      ).issues,
    ).toEqual([]);
    const { issues } = await linter.lint(from, '&:hover\n  width: calc(1px / 0)\n');
    expect(issues.map(issue => issue.ruleId).sort()).toEqual([
      'nesting-selector-no-missing-scoping-root',
      'sonar/function-calc-no-invalid',
    ]);
    expect(
      (await linter.lint(normalizeToAbsolutePath('/tmp/input.css'), 'a {}\n@import "other";'))
        .issues,
    ).toEqual([expect.objectContaining({ ruleId: 'no-invalid-position-at-import-rule' })]);
  });

  it('reports declaration issues at the original source location', async () => {
    const linter = new LinterWrapper();
    linter.initialize(rules);
    const { issues } = await linter.lint(from, '@supports (display: grid)\n  a\n    color: #ggg\n');
    expect(issues).toEqual([
      expect.objectContaining({
        ruleId: 'color-no-invalid-hex',
        line: 3,
        column: 11,
        endLine: 3,
        endColumn: 15,
      }),
    ]);
  });

  it('runs declaration rules on compact values', async () => {
    const linter = new LinterWrapper();
    linter.initialize(rules);
    const { issues } = await linter.lint(
      from,
      'a\n  color:#ggg // invalid\n    // explanation\n  margin:0\n  margin:0\n',
    );
    expect(issues).toEqual([
      expect.objectContaining({ ruleId: 'color-no-invalid-hex', line: 2, column: 8 }),
      expect.objectContaining({ ruleId: 'declaration-block-no-duplicate-properties', line: 4 }),
    ]);
  });

  for (const indent of ['  ', '\t']) {
    it(`handles embedded base indentation ${JSON.stringify(indent)} without shifting locations`, async () => {
      const linter = new LinterWrapper();
      linter.initialize(rules);
      const childIndent = indent === '\t' ? '\t' : '  ';
      const code = `<style lang="sass">\n${indent}a:not(:hover)\n${indent}${childIndent}color:#ggg\n${indent}b\n${indent}${childIndent}color: #hhh\n</style>`;
      const { issues } = await linter.lint(normalizeToAbsolutePath('/tmp/input.vue'), code);
      expect(issues).toEqual([
        expect.objectContaining({
          ruleId: 'color-no-invalid-hex',
          line: 3,
          column: indent.length + childIndent.length + 6,
        }),
        expect.objectContaining({
          ruleId: 'color-no-invalid-hex',
          line: 5,
          column: indent.length + childIndent.length + 7,
        }),
      ]);
    });
  }

  it('runs rules that inspect !important and percentage keyframes', async () => {
    const linter = new LinterWrapper();
    linter.initialize(rules);
    const { issues } = await linter.lint(
      from,
      '@keyframes spin\n  0%\n    opacity: 0 !important\n',
    );
    expect(issues).toEqual([
      expect.objectContaining({ ruleId: 'keyframe-declaration-no-important', line: 3 }),
    ]);
  });

  it('handles multiple Vue Sass blocks and preserves document positions', async () => {
    const linter = new LinterWrapper();
    linter.initialize(rules);
    const code =
      '<template><div /></template>\n<style lang="sass">\n@media (width > 10px)\n  a\n    color: #ggg\n</style>\n<style lang="sass">\nb\n  color: #hhh\n</style>';
    const { issues } = await linter.lint(normalizeToAbsolutePath('/tmp/input.vue'), code);
    expect(
      issues.map(({ ruleId, line, column, endColumn }) => ({ ruleId, line, column, endColumn })),
    ).toEqual([
      { ruleId: 'color-no-invalid-hex', line: 5, column: 11, endColumn: 15 },
      { ruleId: 'color-no-invalid-hex', line: 9, column: 9, endColumn: 13 },
    ]);
  });

  it('keeps embedded syntax failures as parsing diagnostics', async () => {
    const linter = new LinterWrapper();
    linter.initialize(rules);
    const { issues } = await linter.lint(
      normalizeToAbsolutePath('/tmp/input.vue'),
      '<style lang="sass">\na\n  color: (\n</style>',
    );
    expect(issues).toEqual([
      expect.objectContaining({ ruleId: 'CssSyntaxError', line: 3, column: 10 }),
    ]);
  });
});
