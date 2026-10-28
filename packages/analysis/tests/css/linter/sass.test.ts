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
import { postcssSass } from '../../../src/css/linter/sass.js';
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
    'a\n  font:\n    size: 12px\n',
    'a\n  font: 12px\n    family: serif\n',
    '$map: (red: #f00, blue: #00f)\na\n  color: map.get($map, red)\n',
    '// NOSONAR\n// sonar-resolve css:S125 "reason"\na\n  color: #fff\n',
    'a\r\n\tcolor: red\r\n',
    'a\n  color: red  \n\n',
    'a\n  color: red // original comment\n',
    'a\n  color: red; // original comment\n',
    '/* An indented comment\n   without a closing marker\na\n  color: red\n',
    '@charset "utf-8"\n\n$x: 1\n$y: 2\n\na\n  color: red\n',
    '@mixin selection\n  @if $x\n    &::selection\n      @content\n  @else\n    \\::selection\n      @content\n',
    'a\n  color: red;\n',
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

  it('retains mixin calls and bodies as at-rules', () => {
    const root = parse('=theme($x)\n  color: $x\na\n  +theme(red)\n');
    expect(root.first).toMatchObject({ type: 'atrule', name: 'mixin', params: 'theme($x)' });
    expect(root.last).toMatchObject({
      type: 'rule',
      nodes: [{ type: 'atrule', name: 'include', params: 'theme(red)' }],
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
});

describe('Stylelint with Sass syntax', () => {
  const rules = [
    'color-no-invalid-hex',
    'declaration-block-no-duplicate-properties',
    'keyframe-declaration-no-important',
  ].map(key => ({ key, configurations: [] }));

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
